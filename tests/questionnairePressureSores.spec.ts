import { expect, test } from "@playwright/test";
import { createQuestionnaireEncounter } from "tests/helper/questionnaire";
import {
  addTopLevelQuestion,
  createQuestionnaireAndOpenBuilder,
} from "tests/helper/questionnaireV2";
import { expectToast } from "tests/helper/ui";
import { getFacilityId } from "tests/support/facilityId";

import type { Question } from "@/types/questionnaire/question";

test.use({ storageState: "tests/.auth/user.json" });
test.skip(
  process.env.CARE_PRESSURE_SORE_E2E !== "1",
  "Requires the pressure sore plugin and local backend",
);

test("pressure sore groups preserve independent sores, validate dimensions and submit ordinary rows", async ({
  page,
}) => {
  const facilityId = getFacilityId();
  let group: Question;
  let questionnaireId: string;
  const title = `Pressure sores ${Date.now()}`;

  await test.step("Create, save and reload the group schema", async () => {
    const detailUrl = await createQuestionnaireAndOpenBuilder(page, {
      basePath: `/facility/${facilityId}/settings/questionnaires`,
      title,
      status: "Active",
    });
    questionnaireId = detailUrl.split("/").at(-1)!;
    await addTopLevelQuestion(page, title);
    await page
      .getByRole("combobox", { name: "Question Type", exact: true })
      .click();
    await page
      .locator('[data-slot="command-item"][data-value="group"]')
      .click();
    await page
      .getByRole("option", { name: "Pressure sore chart", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "Require at least one sore", exact: true })
      .check();
    const saved = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/questionnaire/") &&
        response.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Save Changes" }).click();
    const response = await saved;
    expect(response.ok()).toBeTruthy();
    group = ((await response.json()) as { questions: Question[] }).questions[0];
    expect(group).toMatchObject({
      repeats: true,
      required: true,
      structured_type: "care_pressure_sore_fe.pressure_sore_chart",
    });
    expect(group.questions).toHaveLength(6);
    expect(group.questions!.map((child) => child.link_id)).toEqual(
      [
        "region",
        "length",
        "width",
        "exudate_amount",
        "tissue_type",
        "description",
      ].map((key) => `${group.link_id}__${key}`),
    );
    await expectToast(page, "Questionnaire updated successfully");
    await page.reload();
    await expect(
      page.getByRole("checkbox", {
        name: "Require at least one sore",
        exact: true,
      }),
    ).toBeChecked();
    await expect(
      page.getByRole("button", { name: "Repair schema", exact: true }),
    ).toHaveCount(0);
  });

  await test.step("Fill and submit two sores at one location, including zero", async () => {
    const { patientId, encounterId } =
      await createQuestionnaireEncounter(facilityId);
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/questionnaire/${questionnaireId}`,
    );
    const chart = page.locator(".care-pressure-sore-fe");
    const mapRegion = chart.locator('path[data-region="posterior_left_foot"]');
    await mapRegion.focus();
    await page.keyboard.press("Enter");
    await expect(mapRegion).toHaveAttribute("aria-pressed", "true");
    await chart.getByRole("button", { name: "Add sore", exact: true }).click();
    const first = chart.getByRole("region", { name: "Sore 1", exact: true });
    await first.getByRole("spinbutton", { name: "Length (cm)" }).fill("2");
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();
    await expect(
      page
        .getByText(
          "Record both length and width; use zero for both or a positive value for both.",
        )
        .first(),
    ).toBeVisible();
    await first.getByRole("spinbutton", { name: "Width (cm)" }).fill("1.5");
    await first
      .getByRole("combobox", { name: "Exudate amount" })
      .selectOption("light");
    await first
      .getByRole("combobox", { name: "Tissue type" })
      .selectOption("granulation");
    await first.getByRole("textbox", { name: "Notes" }).fill("First sore");
    await chart.getByRole("button", { name: "Add sore", exact: true }).click();
    const second = chart.getByRole("region", { name: "Sore 2", exact: true });
    await second.getByRole("spinbutton", { name: "Length (cm)" }).fill("0");
    await second.getByRole("spinbutton", { name: "Width (cm)" }).fill("0");
    await second.getByRole("textbox", { name: "Notes" }).fill("Second sore");
    // An independent extra row can be removed without affecting the two findings.
    await chart.getByRole("button", { name: "Add sore", exact: true }).click();
    await chart
      .getByRole("button", { name: "Remove sore 3", exact: true })
      .click();
    await expect(chart.locator(".ps-sore")).toHaveCount(2);
    await expect(mapRegion).toHaveAttribute(
      "aria-label",
      "Posterior Left Foot: 2 recorded",
    );
    const batchResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/batch_requests/") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();
    const response = await batchResponse;
    expect(response.ok()).toBeTruthy();
    const payload = response.request().postDataJSON() as {
      requests: {
        reference_id: string;
        body: {
          results: {
            question_id: string;
            sub_results: {
              question_id: string;
              values: { value: string }[];
            }[][];
          }[];
        };
      }[];
    };
    const results = payload.requests[0].body.results;
    expect(results).toHaveLength(1);
    expect(results[0].question_id).toBe(group.id);
    const keys = new Map(
      group.questions!.map((child) => [
        child.id,
        child.link_id.slice(group.link_id.length + 2),
      ]),
    );
    expect(
      results[0].sub_results.map((row) =>
        Object.fromEntries(
          row.map((answer) => [
            keys.get(answer.question_id),
            answer.values[0].value,
          ]),
        ),
      ),
    ).toEqual([
      {
        region: "posterior_left_foot",
        length: "2",
        width: "1.5",
        exudate_amount: "light",
        tissue_type: "granulation",
        description: "First sore",
      },
      {
        region: "posterior_left_foot",
        length: "0",
        width: "0",
        description: "Second sore",
      },
    ]);
    const batch = await response.json();
    const submitted = batch.results.find(
      (result: { reference_id: string }) =>
        result.reference_id === payload.requests[0].reference_id,
    );
    expect(submitted.status_code).toBe(200);
    await expectToast(page, /questionnaire submitted successfully/i);
    await page.goto(
      `/facility/${facilityId}/patient/${patientId}/encounter/${encounterId}/questionnaire_response/${submitted.data.id}`,
    );
    await expect(chart.getByText("First sore", { exact: true })).toBeVisible();
    await expect(chart.getByText("Second sore", { exact: true })).toBeVisible();
    await expect(chart.locator(".ps-area strong")).toHaveText(["3", "0"]);
    await expect(chart.locator("input,select,textarea,button")).toHaveCount(0);
    await page.screenshot({
      path: "apps/care_pressure_sore_fe/output/playwright/pressure-sore-saved-response.png",
      fullPage: true,
    });
  });
});

for (const mode of ["local", "remote"] as const) {
  test(`${mode} plugin renders stored answers, older schemas, print and fallback`, async ({
    page,
  }) => {
    test.skip(
      mode === "remote" && !process.env.CARE_PRESSURE_SORE_REMOTE_URL,
      "Requires the built remote preview URL",
    );
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__pressure-sore-readback", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pressure sore readback</title></head><body style="font-family:system-ui;margin:24px"><div class="hidden" id="host-content">Host layout sentinel</div><main style="max-width:1000px;margin:auto" id="root"></main></body></html>',
      }),
    );
    await page.context().grantPermissions(["local-network-access"]);
    await page.goto(
      new URL(
        "/__pressure-sore-readback",
        process.env.CARE_GROUP_VALIDATION_URL ?? "http://localhost:4000",
      ).href,
    );
    await page.evaluate(
      async ({ mode, remoteUrl }) => {
        const load = (path: string) => import(path);
        const { default: refresh } = await load("/@react-refresh");
        refresh.injectIntoGlobalHook(window);
        Object.assign(window, {
          $RefreshReg$: () => {},
          $RefreshSig$: () => (type: unknown) => type,
          __vite_plugin_react_preamble_installed__: true,
        });
        const {
          React,
          ReactDOM,
          createRoot,
          i18n,
          i18next,
          registerQuestionGroup,
          instantiateGroupQuestions,
          RegisteredGroupAnswerView,
        } = await load(
          "/apps/care_pressure_sore_fe/tests/pressureSoreBrowser.ts",
        );
        await i18next.use(i18n.initReactI18next).init({
          lng: "en",
          resources: {},
          interpolation: { escapeValue: false },
        });
        let manifest;
        if (mode === "remote") {
          const remote = await load(remoteUrl!);
          remote.init({
            react: {
              [React.version]: { get: () => () => React, loaded: true },
            },
            "react-dom": {
              [ReactDOM.version]: { get: () => () => ReactDOM, loaded: true },
            },
            "react-i18next": {
              "17.0.8": { get: () => () => i18n, loaded: true },
            },
          });
          const loaded = (await remote.get("./manifest"))();
          manifest = loaded.default ?? loaded;
        } else {
          manifest = (
            await load("/apps/care_pressure_sore_fe/src/manifest.tsx")
          ).default;
        }
        const definition = manifest.registeredQuestionGroups[0];
        registerQuestionGroup(definition, manifest.plugin);
        const group = {
          id: "chart",
          link_id: "chart",
          text: "Pressure sores",
          type: "group",
          repeats: true,
          structured_type: definition.type,
          questions: [] as Question[],
        };
        group.questions = instantiateGroupQuestions(group, definition.schema);
        const makeRow = (values: Record<string, string>) =>
          Object.entries(values).map(([key, value]) => ({
            question_id: group.questions.find(
              (child) => child.link_id === `chart__${key}`,
            )!.id,
            values: [{ value }],
          }));
        const responses = [
          {
            question_id: group.id,
            sub_results: [
              makeRow({
                region: "posterior_left_foot",
                length: "2",
                width: "1.5",
                exudate_amount: "light",
                tissue_type: "granulation",
                description: "First sore",
              }),
              makeRow({
                region: "posterior_left_foot",
                length: "0",
                width: "0",
                description: "Second sore",
              }),
            ],
          },
        ];
        const old = {
          ...group,
          questions: group.questions.filter(
            (child) => child.link_id !== "chart__tissue_type",
          ),
        };
        createRoot(document.getElementById("root")).render(
          React.createElement(
            "div",
            null,
            React.createElement("h1", null, "Pressure sore chart"),
            React.createElement(RegisteredGroupAnswerView, {
              question: group,
              responses,
              fallback: "Loading chart",
            }),
            React.createElement(
              "details",
              null,
              React.createElement("summary", null, "Older saved schema"),
              React.createElement(RegisteredGroupAnswerView, {
                question: old,
                responses,
                fallback: "Older chart unavailable",
              }),
            ),
            React.createElement(RegisteredGroupAnswerView, {
              question: { ...group, structured_type: "unavailable.chart" },
              responses,
              fallback: "Ordinary child fallback",
            }),
          ),
        );
      },
      { mode, remoteUrl: process.env.CARE_PRESSURE_SORE_REMOTE_URL },
    );
    const chart = page.locator(".care-pressure-sore-fe").first();
    await expect(chart.getByText("First sore", { exact: true })).toBeVisible();
    await expect(chart.getByText("Second sore", { exact: true })).toBeVisible();
    await expect(chart.locator(".ps-area strong")).toHaveText(["3", "0"]);
    await expect(
      chart.locator('path[data-region="posterior_left_foot"]'),
    ).toHaveAttribute("data-recorded", "true");
    await expect(chart.getByRole("button")).toHaveCount(0);
    await expect(chart.locator("input,select,textarea")).toHaveCount(0);
    await expect(page.getByText("Ordinary child fallback")).toBeVisible();
    await expect(page.locator("#host-content")).toBeVisible();
    await page.screenshot({
      path: `apps/care_pressure_sore_fe/output/playwright/pressure-sore-${mode}.png`,
      fullPage: true,
    });
    await page.getByText("Older saved schema", { exact: true }).click();
    const old = page.locator("details .care-pressure-sore-fe");
    await expect(old.getByText("First sore", { exact: true })).toBeVisible();
    await expect(old.getByText("Tissue type", { exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
      await chart.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBeTruthy();
    await page.emulateMedia({ media: "print" });
    await expect(chart.getByText("Second sore", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import manifest from "../manifest";
import type {
  GroupField,
  GroupRow,
  Question,
  QuestionnaireResponse,
} from "../types/host";
import {
  PRESSURE_SORE_SCHEMA,
  answer,
  bodyPaths,
  canEdit,
  canRemove,
  choiceOptions,
  fieldValue,
  soreArea,
} from "./group";

const definition = manifest.registeredQuestionGroups![0];
const group: Question = {
  id: "group-id",
  link_id: "sores",
  text: "Sores",
  type: "group",
  repeats: true,
  structured_type: definition.type,
  questions: PRESSURE_SORE_SCHEMA.map((child) => ({
    ...child,
    id: `saved-${child.link_id}`,
    link_id: `sores__${child.link_id}`,
    questions: undefined,
  })),
};
function response(key: string, value: unknown): QuestionnaireResponse {
  return {
    question_id: `saved-${key}`,
    link_id: `sores__${key}`,
    structured_type: null,
    values:
      value === undefined
        ? []
        : [{ type: typeof value === "number" ? "number" : "string", value }],
  };
}
function field(key: string, value?: unknown): GroupField {
  return {
    question: group.questions!.find((q) => q.id === `saved-${key}`)!,
    response: response(key, value),
    disabled: false,
    hidden: false,
    errors: [],
  };
}
function validate(rows: Record<string, unknown>[], saved = group) {
  const scope = {
    [saved.id]: {
      ...response("group", undefined),
      question_id: saved.id,
      sub_results: rows.map((row) =>
        Object.entries(row).map(([key, value]) => response(key, value)),
      ),
    },
  };
  const before = structuredClone(scope);
  const path = [{ questionId: "parent", rowIndex: 2 }];
  const errors = definition.validate!(saved, scope, path);
  assert.deepEqual(scope, before);
  assert.deepEqual(path, [{ questionId: "parent", rowIndex: 2 }]);
  return errors;
}

test("SVG data preserves all 40 original paths and translation keys", () => {
  const locale = JSON.parse(
    readFileSync(
      new URL("../../public/locale/en.json", import.meta.url),
      "utf8",
    ),
  );
  for (const side of ["anterior", "posterior"]) {
    const svg = readFileSync(
      new URL(`../../public/images/pressure-sore-${side}.svg`, import.meta.url),
      "utf8",
    );
    const parts = bodyPaths.filter((part) => part.side === side);
    assert.equal(parts.length, side === "anterior" ? 21 : 19);
    for (const part of parts) {
      assert.ok(
        svg.includes(
          `id="${part.id}" d="${part.d}" transform="${part.transform}"`,
        ),
      );
      assert.ok(locale[part.id]);
    }
  }
  assert.equal(new Set(bodyPaths.map((part) => part.id)).size, 40);
});

test("manifest validates saved rows, permits repeated locations and leaves required checks to CARE", () => {
  assert.equal(definition.type, "care_pressure_sore_fe.pressure_sore_chart");
  assert.equal(definition.repeats, true);
  assert.deepEqual(validate([]), []);
  assert.deepEqual(validate([{}]), []);
  assert.deepEqual(
    validate([
      { region: "anterior_head" },
      { region: "anterior_head", length: 2, width: 3 },
    ]),
    [],
  );
  assert.deepEqual(
    validate([
      { length: 0, width: 0, exudate_amount: "none", tissue_type: "closed" },
    ]),
    [],
  );
  assert.deepEqual(answer("0", true).values, [{ type: "number", value: 0 }]);
  assert.deepEqual(answer("", true).values, []);
});

test("invalid numbers, choices and paired dimensions target saved children in nested rows", () => {
  for (const value of [-1, NaN, Infinity, "2", null]) {
    assert.ok(
      validate([{ length: value, width: 2 }]).some(
        (error) => error.question_id === "saved-length",
      ),
    );
  }
  for (const row of [{ length: 0, width: 2 }, { length: 2 }, { width: 0 }])
    assert.equal(validate([row]).length, 1);
  const errors = validate([{ region: "invalid" }]);
  assert.equal(errors[0].question_id, "saved-region");
  assert.deepEqual(errors[0].response_path, [
    { questionId: "parent", rowIndex: 2 },
    { questionId: group.id, rowIndex: 0 },
  ]);
  const narrowed = structuredClone(group);
  narrowed.questions![0].answer_option = [{ value: "other" }];
  assert.equal(validate([{ region: "anterior_head" }], narrowed).length, 1);
});

test("older schemas omit optional fields without adding requirements", () => {
  const old = {
    ...group,
    questions: group.questions!.filter((child) => child.id !== "saved-width"),
  };
  assert.deepEqual(validate([{ region: "other", length: 2 }], old), []);
});

test("hidden and protected fields cannot leak through the map or be removed", () => {
  const region = field("region", "anterior_head");
  const row: GroupRow = {
    fields: { region, description: null },
    onChange: () => {},
    remove: () => {},
  };
  assert.equal(canRemove(row), true);
  region.disabled = true;
  assert.equal(canEdit(region), false);
  assert.equal(canRemove(row), false);
  region.disabled = false;
  region.hidden = true;
  assert.equal(fieldValue(region), undefined);
  assert.deepEqual(choiceOptions(region), []);
  assert.equal(canRemove(row), false);
  assert.equal(canEdit(null), false);
});

test("derived area distinguishes missing, zero and invalid dimensions", () => {
  assert.equal(
    soreArea({ length: field("length", 0), width: field("width", 0) }),
    0,
  );
  assert.equal(
    soreArea({ length: field("length", 2), width: field("width", 3) }),
    6,
  );
  assert.equal(
    soreArea({ length: field("length", 2), width: null }),
    undefined,
  );
  assert.equal(
    soreArea({ length: field("length", 2), width: field("width", 0) }),
    undefined,
  );
  const hidden = field("width", 3);
  hidden.hidden = true;
  assert.equal(
    soreArea({ length: field("length", 2), width: hidden }),
    undefined,
  );
});

test("multiple scalar values are rejected through the actual manifest", () => {
  const region = response("region", "other");
  region.values.push({ type: "string", value: "anterior_head" });
  const errors = definition.validate!(
    group,
    {
      [group.id]: { ...response("group", undefined), sub_results: [[region]] },
    },
    [],
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0].question_id, "saved-region");
});

test("SCHEMA.md matches saved keys, region codes and submitted example", () => {
  const doc = readFileSync(new URL("../../SCHEMA.md", import.meta.url), "utf8");
  for (const child of PRESSURE_SORE_SCHEMA) {
    assert.ok(doc.includes(`\`${child.link_id}\``));
    for (const { value } of child.answer_option ?? [])
      assert.ok(doc.includes(`\`${value}\``));
  }
  const example = JSON.parse(doc.match(/```json\n([\s\S]*?)\n```/)![1]);
  assert.equal(example.sub_results.length, 2);
  for (const row of example.sub_results) {
    for (const entry of row) {
      const child = PRESSURE_SORE_SCHEMA.find(
        (child) => `saved-${child.link_id}` === entry.question_id,
      );
      assert.ok(child);
      assert.equal(entry.values.length, 1);
      assert.equal(typeof entry.values[0].value, "string");
    }
  }
});

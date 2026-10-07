import { getI18n } from "react-i18next";

import en from "../../public/locale/en.json";
import type {
  QuestionValidationError,
  RegisteredGroupDefinition,
} from "../types/host";

function message(key: keyof typeof en) {
  return (
    getI18n()?.t(key, { ns: "care_pressure_sore_fe", defaultValue: en[key] }) ||
    en[key]
  );
}

export const validatePressureSores: NonNullable<
  RegisteredGroupDefinition["validate"]
> = (question, responses, path) => {
  const children = (question.questions ?? []).filter((child) =>
    child.link_id.startsWith(`${question.link_id}__`),
  );
  return (responses[question.id]?.sub_results ?? []).flatMap(
    (row, rowIndex) => {
      const errors: QuestionValidationError[] = [];
      const response_path = [...path, { questionId: question.id, rowIndex }];
      const values = new Map(
        row.map((response) => [response.question_id, response.values]),
      );
      for (const child of children) {
        const answers = values.get(child.id) ?? [];
        if (!answers.length) continue;
        const value = answers[0].value;
        let error: keyof typeof en | undefined;
        if (answers.length !== 1) error = "error_answer";
        else if (
          child.type === "choice" &&
          (typeof value !== "string" ||
            !child.answer_option?.some((option) => option.value === value))
        )
          error = "error_choice";
        else if (
          child.type === "decimal" &&
          (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        )
          error = "error_number";
        else if (child.type === "text" && typeof value !== "string")
          error = "error_answer";
        if (error)
          errors.push({
            question_id: child.id,
            response_path,
            error: message(error),
          });
      }
      const length = children.find(
        (child) => child.link_id === `${question.link_id}__length`,
      );
      const width = children.find(
        (child) => child.link_id === `${question.link_id}__width`,
      );
      if (length && width) {
        const l = values.get(length.id)?.[0]?.value;
        const w = values.get(width.id)?.[0]?.value;
        if (
          (l === undefined) !== (w === undefined) ||
          (typeof l === "number" &&
            typeof w === "number" &&
            (l === 0) !== (w === 0))
        ) {
          errors.push({
            question_id: l === undefined || l === 0 ? length.id : width.id,
            response_path,
            error: message("error_pair"),
          });
        }
      }
      return errors;
    },
  );
};

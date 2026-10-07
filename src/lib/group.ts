import en from "../../public/locale/en.json";
import type {
  GroupField,
  GroupQuestionDefinition,
  GroupRow,
  QuestionnaireResponse,
} from "../types/host";
import bodyPaths from "./bodyPaths.json";

export { bodyPaths };
export const REGION_CODES = [...bodyPaths.map(({ id }) => id), "other"];
export const PRESSURE_SORE_SCHEMA: readonly GroupQuestionDefinition[] = [
  {
    link_id: "region",
    text: en.region,
    type: "choice",
    required: true,
    answer_option: REGION_CODES.map((value) => ({ value })),
  },
  { link_id: "length", text: en.length, type: "decimal" },
  { link_id: "width", text: en.width, type: "decimal" },
  {
    link_id: "exudate_amount",
    text: en.exudate_amount,
    type: "choice",
    answer_option: ["none", "light", "moderate", "heavy"].map((value) => ({
      value,
    })),
  },
  {
    link_id: "tissue_type",
    text: en.tissue_type,
    type: "choice",
    answer_option: [
      "closed",
      "epithelial",
      "granulation",
      "slough",
      "necrotic",
    ].map((value) => ({ value })),
  },
  { link_id: "description", text: en.description, type: "text" },
];

export function fieldValue(
  field: GroupField | null | undefined,
): string | number | undefined {
  if (!field || field.hidden) return undefined;
  const value = field.response.values[0]?.value;
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

export function canEdit(
  field: GroupField | null | undefined,
): field is GroupField {
  return !!field && !field.hidden && !field.disabled;
}

export function canRemove(row: GroupRow) {
  return Object.values(row.fields).every((field) => !field || canEdit(field));
}

export function choiceOptions(field: GroupField | null | undefined) {
  return field && !field.hidden ? (field.question.answer_option ?? []) : [];
}

export function answer(
  value: string,
  numeric = false,
): Partial<QuestionnaireResponse> {
  return {
    values:
      value === ""
        ? []
        : [
            {
              type: numeric ? "number" : "string",
              value: numeric ? Number(value) : value,
            },
          ],
  };
}

export function soreArea(fields: GroupRow["fields"]) {
  const length = fieldValue(fields.length);
  const width = fieldValue(fields.width);
  if (
    typeof length !== "number" ||
    typeof width !== "number" ||
    !Number.isFinite(length) ||
    !Number.isFinite(width) ||
    length < 0 ||
    width < 0 ||
    (length === 0) !== (width === 0)
  )
    return undefined;
  const area = length * width;
  return Number.isFinite(area) ? area : undefined;
}

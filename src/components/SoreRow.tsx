import { useId } from "react";

import { useTranslation } from "../hooks/useTranslation";
import {
  answer,
  canEdit,
  canRemove,
  choiceOptions,
  fieldValue,
  soreArea,
} from "../lib/group";
import type { GroupRow } from "../types/host";

interface SoreRowProps {
  row: GroupRow;
  number: number;
  disabled: boolean;
}

export function SoreRow({ row, number, disabled }: SoreRowProps) {
  const { t } = useTranslation();
  const id = useId();
  const area = soreArea(row.fields);
  const Fields = disabled ? "dl" : "div";
  return (
    <section className="ps-sore" aria-label={t("sore_number", { number })}>
      <header>
        <h4>{t("sore_number", { number })}</h4>
        {!disabled && (
          <button
            type="button"
            className="ps-remove"
            disabled={!canRemove(row)}
            onClick={() => {
              if (canRemove(row)) row.remove();
            }}
          >
            {t("remove_sore", { number })}
          </button>
        )}
      </header>
      <Fields className="ps-fields">
        {Object.entries(row.fields).map(([key, field]) => {
          if (!field || field.hidden) return null;
          const value = fieldValue(field);
          const label = t(key, {
            defaultValue: t(key) === key ? field.question.text : t(key),
          });
          const locked = disabled || !canEdit(field);
          const errorId = `${id}-${key}-error`;
          if (disabled)
            return (
              <div
                key={key}
                className={
                  key === "region" || key === "description"
                    ? "ps-wide"
                    : undefined
                }
              >
                <dt>{label}</dt>
                <dd>
                  {value === undefined || value === ""
                    ? t("not_recorded")
                    : field.question.type === "choice"
                      ? t(String(value))
                      : String(value)}
                </dd>
              </div>
            );
          const props = {
            id: `${id}-${key}`,
            disabled: locked,
            "aria-invalid": field.errors.length > 0,
            "aria-describedby": field.errors.length ? errorId : undefined,
            required: !!field.question.required,
          };
          const change = (next: string) => {
            if (!locked)
              row.onChange({
                [key]: answer(next, field.question.type === "decimal"),
              });
          };
          return (
            <div
              key={key}
              className={
                key === "region" || key === "description"
                  ? "ps-wide"
                  : undefined
              }
            >
              <label htmlFor={props.id}>
                {label}
                {field.question.required && <span aria-hidden="true"> *</span>}
              </label>
              {field.question.type === "choice" ? (
                <select
                  {...props}
                  value={value ?? ""}
                  onChange={(event) => change(event.target.value)}
                >
                  <option value="">{t("choose_value")}</option>
                  {value !== undefined &&
                    !choiceOptions(field).some(
                      (option) => option.value === value,
                    ) && <option value={String(value)}>{String(value)}</option>}
                  {choiceOptions(field).map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.value)}
                    </option>
                  ))}
                </select>
              ) : field.question.type === "text" ? (
                <textarea
                  {...props}
                  rows={2}
                  value={value ?? ""}
                  onChange={(event) => change(event.target.value)}
                />
              ) : (
                <input
                  {...props}
                  type="number"
                  min="0"
                  step="any"
                  value={value ?? ""}
                  onChange={(event) => change(event.target.value)}
                />
              )}
              {field.errors.length > 0 && (
                <div id={errorId} className="ps-errors">
                  {field.errors.map((error, index) => (
                    <p key={index} role="alert">
                      {error.msg ?? error.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Fields>
      {area !== undefined && (
        <p className="ps-area">
          {t("area")}:{" "}
          <strong>
            {area.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </strong>
        </p>
      )}
    </section>
  );
}

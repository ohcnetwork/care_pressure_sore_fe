import { useId, useState } from "react";

import { useTranslation } from "../hooks/useTranslation";
import { answer, canEdit, choiceOptions } from "../lib/group";
import "../style/index.css";
import type { GroupInputProps } from "../types/host";
import { BodyMap } from "./BodyMap";
import { SoreRow } from "./SoreRow";

export default function PressureSoreInput({
  fields,
  rows,
  addRow,
  disabled,
}: GroupInputProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("");
  const selectId = useId();
  const options = choiceOptions(fields.region).map(({ value }) => value);
  const canAdd =
    !disabled && canEdit(fields.region) && options.includes(selected);
  return (
    <div className="care-pressure-sore-fe">
      {!disabled && <p className="ps-help">{t("instructions")}</p>}
      <div className="ps-layout">
        <div className="ps-anatomy">
          <BodyMap
            selected={selected}
            options={options}
            rows={rows}
            disabled={disabled || !canEdit(fields.region)}
            onSelect={setSelected}
          />
          <div className="ps-legend">
            <span className="ps-recorded-key">{t("recorded")}</span>
            {!disabled && (
              <span className="ps-selected-key">{t("selected")}</span>
            )}
          </div>
          {!disabled && (
            <div className="ps-add">
              <label htmlFor={selectId}>{t("region")}</label>
              <select
                id={selectId}
                value={options.includes(selected) ? selected : ""}
                onChange={(event) => setSelected(event.target.value)}
                disabled={!canEdit(fields.region)}
              >
                <option value="">{t("choose_region")}</option>
                {options.map((value) => (
                  <option key={value} value={value}>
                    {t(value)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ps-primary"
                disabled={!canAdd}
                onClick={() => {
                  if (canAdd) addRow({ region: answer(selected) });
                }}
              >
                {t("add_sore")}
              </button>
            </div>
          )}
        </div>
        <div className="ps-rows" aria-live="polite">
          {rows.length ? (
            rows.map((row, index) => (
              <SoreRow
                key={index}
                row={row}
                number={index + 1}
                disabled={disabled}
              />
            ))
          ) : (
            <p className="ps-empty">{t("no_sores")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "../hooks/useTranslation";
import { bodyPaths, fieldValue } from "../lib/group";
import type { GroupRow } from "../types/host";

interface BodyMapProps {
  selected: string;
  options: readonly string[];
  rows: readonly GroupRow[];
  disabled: boolean;
  onSelect: (region: string) => void;
}

export function BodyMap({
  selected,
  options,
  rows,
  disabled,
  onSelect,
}: BodyMapProps) {
  const { t } = useTranslation();
  return (
    <div className="ps-maps">
      {(["anterior", "posterior"] as const).map((side) => (
        <figure key={side}>
          <figcaption>{t(side)}</figcaption>
          <svg viewBox="0 0 344.7 932.661" aria-label={t(side)} role="group">
            {bodyPaths
              .filter((part) => part.side === side)
              .map((part) => {
                const count = rows.filter(
                  (row) => fieldValue(row.fields.region) === part.id,
                ).length;
                const editable = !disabled && options.includes(part.id);
                const label = t("region_findings", {
                  region: t(part.id),
                  count,
                });
                return (
                  <path
                    key={part.id}
                    d={part.d}
                    transform={part.transform}
                    data-region={part.id}
                    data-recorded={count > 0}
                    data-selected={selected === part.id && !disabled}
                    role={editable ? "button" : "img"}
                    tabIndex={editable ? 0 : undefined}
                    aria-label={label}
                    aria-pressed={editable ? selected === part.id : undefined}
                    onClick={() => {
                      if (editable) onSelect(part.id);
                    }}
                    onKeyDown={(event) => {
                      if (
                        editable &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        onSelect(part.id);
                      }
                    }}
                  >
                    <title>{label}</title>
                  </path>
                );
              })}
          </svg>
        </figure>
      ))}
    </div>
  );
}

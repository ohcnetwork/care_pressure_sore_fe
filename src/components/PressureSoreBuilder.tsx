import { useTranslation } from "../hooks/useTranslation";
import "../style/index.css";
import type { GroupBuilderProps } from "../types/host";

export default function PressureSoreBuilder({
  question,
  onChange,
}: GroupBuilderProps) {
  const { t } = useTranslation();
  return (
    <div className="care-pressure-sore-fe">
      <label className="ps-required">
        <input
          type="checkbox"
          checked={!!question.required}
          onChange={(event) => onChange({ required: event.target.checked })}
        />
        {t("require_sore")}
      </label>
    </div>
  );
}

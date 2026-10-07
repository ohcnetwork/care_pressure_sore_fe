import { lazy } from "react";

import en from "../public/locale/en.json";
import { PRESSURE_SORE_SCHEMA } from "./lib/group";
import { validatePressureSores } from "./lib/validate";
import type { PluginManifest } from "./types/host";

const manifest: PluginManifest = {
  plugin: "care_pressure_sore_fe",
  registeredQuestionGroups: [
    {
      type: "care_pressure_sore_fe.pressure_sore_chart",
      label: en.chart_title,
      subjects: ["encounter", "patient"],
      repeats: true,
      schema: PRESSURE_SORE_SCHEMA,
      validate: validatePressureSores,
      builder: lazy(() => import("./components/PressureSoreBuilder")),
      component: lazy(() => import("./components/PressureSoreInput")),
    },
  ],
};

export default manifest;

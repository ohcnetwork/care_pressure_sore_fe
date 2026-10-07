// Vite resolves these together so the remote receives the host's exact React singleton.
export { default as i18next } from "i18next";
export { default as React } from "react";
export { default as ReactDOM } from "react-dom";
export { createRoot } from "react-dom/client";
export * as i18n from "react-i18next";
export { RegisteredGroupAnswerView } from "../../../src/components/QuestionnaireV2/groups/RegisteredGroupAnswerView";
export { registerQuestionGroup } from "../../../src/components/QuestionnaireV2/groups/registry";
export { instantiateGroupQuestions } from "../../../src/components/QuestionnaireV2/groups/schema";

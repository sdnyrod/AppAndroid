import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function WorkTypesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("settings.workTypes")}
      icon="layers-outline"
      procedure="workTypes.list"
      emptyMessage={t("settings.noWorkTypes")}
    />
  );
}

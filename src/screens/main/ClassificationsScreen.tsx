import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function ClassificationsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("settings.classifications")}
      icon="pricetags-outline"
      procedure="classifications.list"
      emptyMessage={t("settings.noClassifications")}
    />
  );
}

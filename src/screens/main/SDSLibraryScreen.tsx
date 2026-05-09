import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function SDSLibraryScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("tools.sdsLibrary")}
      icon="shield-checkmark-outline"
      procedure="buildingCodes.list"
      emptyMessage={t("tools.noSDS")}
    />
  );
}

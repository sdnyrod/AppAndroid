import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function MyHoursScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("myHours.title")}
      icon="clipboard-outline"
      procedure="time.getMyEntries"
      emptyMessage={t("myHours.noEntries")}
    />
  );
}

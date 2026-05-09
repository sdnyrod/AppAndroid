import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function DailyLogsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("dailyLogs.title")}
      icon="mic-outline"
      procedure="dailyLog.getAll"
      emptyMessage={t("dailyLogs.noLogs")}
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function FleetCostReportScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("fleet.costReport")}
      icon="bar-chart-outline"
      procedure="trucks.list"
      emptyMessage={t("fleet.noCostReport")}
    />
  );
}

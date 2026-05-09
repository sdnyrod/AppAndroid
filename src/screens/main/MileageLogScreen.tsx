import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function MileageLogScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("fleet.mileageLog")}
      icon="speedometer-outline"
      procedure="trucks.list"
      emptyMessage={t("fleet.noMileage")}
    />
  );
}

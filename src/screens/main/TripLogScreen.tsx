import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function TripLogScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("fleet.tripLog")}
      icon="navigate-outline"
      procedure="trucks.list"
      emptyMessage={t("fleet.noTrips")}
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function VehiclesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("fleet.vehicles")}
      icon="car-outline"
      procedure="trucks.list"
      emptyMessage={t("fleet.noVehicles")}
    />
  );
}

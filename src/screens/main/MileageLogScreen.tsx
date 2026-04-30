import React from "react";
import GenericScreen from "./GenericScreen";

export default function MileageLogScreen() {
  return (
    <GenericScreen
      title="Mileage Log"
      icon="speedometer-outline"
      procedure="trucks.list"
      emptyMessage="No Mileage Log data found"
    />
  );
}

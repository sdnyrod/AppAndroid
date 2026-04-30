import React from "react";
import GenericScreen from "./GenericScreen";

export default function FleetCostReportScreen() {
  return (
    <GenericScreen
      title="Fleet Cost Report"
      icon="bar-chart-outline"
      procedure="trucks.list"
      emptyMessage="No Fleet Cost Report data found"
    />
  );
}

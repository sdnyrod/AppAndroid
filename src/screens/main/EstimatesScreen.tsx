import React from "react";
import GenericScreen from "./GenericScreen";

export default function EstimatesScreen() {
  return (
    <GenericScreen
      title="Estimates"
      icon="calculator-outline"
      procedure="estimates.list"
      emptyMessage="No Estimates data found"
    />
  );
}

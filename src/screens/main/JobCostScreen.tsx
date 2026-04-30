import React from "react";
import GenericScreen from "./GenericScreen";

export default function JobCostScreen() {
  return (
    <GenericScreen
      title="Job Cost"
      icon="trending-up-outline"
      procedure="jobCost.getProjectSummary"
      emptyMessage="No Job Cost data found"
    />
  );
}

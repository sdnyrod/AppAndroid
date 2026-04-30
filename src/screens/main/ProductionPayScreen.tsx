import React from "react";
import GenericScreen from "./GenericScreen";

export default function ProductionPayScreen() {
  return (
    <GenericScreen
      title="Production Pay"
      icon="construct-outline"
      procedure="productionEntries.list"
      emptyMessage="No Production Pay data found"
    />
  );
}

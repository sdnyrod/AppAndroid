import React from "react";
import GenericScreen from "./GenericScreen";

export default function ClassificationsScreen() {
  return (
    <GenericScreen
      title="Classifications"
      icon="pricetags-outline"
      procedure="classifications.list"
      emptyMessage="No Classifications data found"
    />
  );
}

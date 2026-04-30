import React from "react";
import GenericScreen from "./GenericScreen";

export default function TripLogScreen() {
  return (
    <GenericScreen
      title="Trip Log"
      icon="navigate-outline"
      procedure="trucks.list"
      emptyMessage="No Trip Log data found"
    />
  );
}

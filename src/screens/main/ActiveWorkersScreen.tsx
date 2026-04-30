import React from "react";
import GenericScreen from "./GenericScreen";

export default function ActiveWorkersScreen() {
  return (
    <GenericScreen
      title="Active Workers"
      icon="people-outline"
      procedure="time.getAllActive"
      emptyMessage="No Active Workers data found"
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

export default function WorkTypesScreen() {
  return (
    <GenericScreen
      title="Work Types"
      icon="layers-outline"
      procedure="workTypes.list"
      emptyMessage="No Work Types data found"
    />
  );
}

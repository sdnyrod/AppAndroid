import React from "react";
import GenericScreen from "./GenericScreen";

export default function DispatchScreen() {
  return (
    <GenericScreen
      title="Dispatch Board"
      icon="bus-outline"
      procedure="dispatch.getByDate"
      emptyMessage="No Dispatch Board data found"
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

export default function SDSLibraryScreen() {
  return (
    <GenericScreen
      title="SDS Library"
      icon="shield-checkmark-outline"
      procedure="buildingCodes.list"
      emptyMessage="No SDS Library data found"
    />
  );
}

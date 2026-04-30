import React from "react";
import GenericScreen from "./GenericScreen";

export default function FieldMediaScreen() {
  return (
    <GenericScreen
      title="Field Media"
      icon="camera-outline"
      procedure="fieldMedia.getAll"
      emptyMessage="No Field Media data found"
    />
  );
}

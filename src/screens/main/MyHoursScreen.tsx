import React from "react";
import GenericScreen from "./GenericScreen";

export default function MyHoursScreen() {
  return (
    <GenericScreen
      title="My Hours"
      icon="clipboard-outline"
      procedure="time.getMyEntries"
      emptyMessage="No My Hours data found"
    />
  );
}

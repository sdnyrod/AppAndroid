import React from "react";
import GenericScreen from "./GenericScreen";

export default function DailyLogsScreen() {
  return (
    <GenericScreen
      title="Daily Logs"
      icon="mic-outline"
      procedure="dailyLog.getAll"
      emptyMessage="No Daily Logs data found"
    />
  );
}

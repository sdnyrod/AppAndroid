import React from "react";
import GenericScreen from "./GenericScreen";

export default function ReceivablesScreen() {
  return (
    <GenericScreen
      title="Receivables"
      icon="wallet-outline"
      procedure="estimates.list"
      emptyMessage="No Receivables data found"
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

export default function ExpensesScreen() {
  return (
    <GenericScreen
      title="Expenses"
      icon="receipt-outline"
      procedure="expenses.list"
      emptyMessage="No Expenses data found"
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

export default function PayrollScreen() {
  return (
    <GenericScreen
      title="Payroll"
      icon="cash-outline"
      procedure="time.getPayrollReport"
      emptyMessage="No Payroll data found"
    />
  );
}

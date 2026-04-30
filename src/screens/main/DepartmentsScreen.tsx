import React from "react";
import GenericScreen from "./GenericScreen";

export default function DepartmentsScreen() {
  return (
    <GenericScreen
      title="Departments"
      icon="business-outline"
      procedure="departments.list"
      emptyMessage="No Departments data found"
    />
  );
}

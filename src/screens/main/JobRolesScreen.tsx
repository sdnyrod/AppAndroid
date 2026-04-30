import React from "react";
import GenericScreen from "./GenericScreen";

export default function JobRolesScreen() {
  return (
    <GenericScreen
      title="Job Roles"
      icon="briefcase-outline"
      procedure="employeeRoles.list"
      emptyMessage="No Job Roles data found"
    />
  );
}

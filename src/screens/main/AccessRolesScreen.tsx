import React from "react";
import GenericScreen from "./GenericScreen";

export default function AccessRolesScreen() {
  return (
    <GenericScreen
      title="Access Roles"
      icon="shield-outline"
      procedure="roles.list"
      emptyMessage="No Access Roles data found"
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

export default function ContractorsScreen() {
  return (
    <GenericScreen
      title="Contractors Hub"
      icon="handshake-outline"
      procedure="users.getEmployees"
      emptyMessage="No Contractors Hub data found"
    />
  );
}

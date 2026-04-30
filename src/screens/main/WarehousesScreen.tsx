import React from "react";
import GenericScreen from "./GenericScreen";

export default function WarehousesScreen() {
  return (
    <GenericScreen
      title="Warehouses"
      icon="business-outline"
      procedure="warehouses.list"
      emptyMessage="No Warehouses data found"
    />
  );
}

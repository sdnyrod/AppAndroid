import React from "react";
import GenericScreen from "./GenericScreen";

export default function InventoryItemsScreen() {
  return (
    <GenericScreen
      title="Inventory Items"
      icon="layers-outline"
      procedure="inventory.list"
      emptyMessage="No Inventory Items data found"
    />
  );
}

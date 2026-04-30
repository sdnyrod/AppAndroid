import React from "react";
import GenericScreen from "./GenericScreen";

export default function PurchaseOrdersScreen() {
  return (
    <GenericScreen
      title="Purchase Orders"
      icon="cart-outline"
      procedure="purchaseOrders.list"
      emptyMessage="No Purchase Orders data found"
    />
  );
}

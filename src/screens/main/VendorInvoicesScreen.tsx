import React from "react";
import GenericScreen from "./GenericScreen";

export default function VendorInvoicesScreen() {
  return (
    <GenericScreen
      title="Vendor Invoices"
      icon="document-text-outline"
      procedure="purchaseOrders.list"
      emptyMessage="No Vendor Invoices data found"
    />
  );
}

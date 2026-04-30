import React from "react";
import GenericScreen from "./GenericScreen";

export default function VendorsScreen() {
  return (
    <GenericScreen
      title="Vendors"
      icon="storefront-outline"
      procedure="vendors.list"
      emptyMessage="No Vendors data found"
    />
  );
}

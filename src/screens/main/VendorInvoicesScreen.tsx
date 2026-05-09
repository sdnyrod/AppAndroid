import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function VendorInvoicesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("inventory.vendorInvoices")}
      icon="document-text-outline"
      procedure="purchaseOrders.list"
      emptyMessage={t("inventory.noVendorInvoices")}
    />
  );
}

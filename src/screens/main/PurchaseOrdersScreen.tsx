import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function PurchaseOrdersScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("inventory.purchaseOrders")}
      icon="cart-outline"
      procedure="purchaseOrders.list"
      emptyMessage={t("inventory.noPurchaseOrders")}
    />
  );
}

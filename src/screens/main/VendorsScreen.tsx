import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function VendorsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("inventory.vendors")}
      icon="storefront-outline"
      procedure="vendors.list"
      emptyMessage={t("inventory.noVendors")}
    />
  );
}

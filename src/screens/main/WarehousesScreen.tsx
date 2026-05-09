import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function WarehousesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("inventory.warehouses")}
      icon="business-outline"
      procedure="warehouses.list"
      emptyMessage={t("inventory.noWarehouses")}
    />
  );
}

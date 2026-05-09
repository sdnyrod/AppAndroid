import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function InventoryItemsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("inventory.items")}
      icon="layers-outline"
      procedure="inventory.list"
      emptyMessage={t("inventory.noItems")}
    />
  );
}

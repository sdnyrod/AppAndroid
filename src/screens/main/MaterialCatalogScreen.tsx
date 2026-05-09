import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function MaterialCatalogScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("inventory.materialCatalog")}
      icon="cube-outline"
      procedure="materials.list"
      emptyMessage={t("inventory.noMaterials")}
    />
  );
}

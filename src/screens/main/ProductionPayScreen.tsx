import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function ProductionPayScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("productionPay.title")}
      icon="construct-outline"
      procedure="productionEntries.list"
      emptyMessage={t("productionPay.noData")}
    />
  );
}

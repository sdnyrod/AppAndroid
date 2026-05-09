import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function ReceivablesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("receivables.title")}
      icon="wallet-outline"
      procedure="estimates.list"
      emptyMessage={t("receivables.noData")}
    />
  );
}

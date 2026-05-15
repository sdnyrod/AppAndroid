import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function ContractorsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("contractors.title") || "Contractors"}
      icon="handshake-outline"
      procedure="contractors.list"
      emptyMessage={t("contractors.noContractors") || "No contractors found"}
    />
  );
}

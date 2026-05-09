import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function ContractorsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("common.featureComingSoon")}
      icon="handshake-outline"
      procedure="users.getEmployees"
      emptyMessage={t("common.featureComingSoon")}
    />
  );
}

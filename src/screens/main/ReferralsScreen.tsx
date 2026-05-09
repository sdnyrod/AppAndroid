import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function ReferralsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("referrals.title")}
      icon="gift-outline"
      procedure="referrals.listAll"
      emptyMessage={t("referrals.noData")}
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function DispatchScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("dispatch.title")}
      icon="bus-outline"
      procedure="dispatch.getByDate"
      emptyMessage={t("dispatch.noData")}
    />
  );
}

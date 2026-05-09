import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function DepartmentsScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("settings.departments")}
      icon="business-outline"
      procedure="departments.list"
      emptyMessage={t("settings.noDepartments")}
    />
  );
}

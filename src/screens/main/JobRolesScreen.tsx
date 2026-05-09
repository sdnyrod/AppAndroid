import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function JobRolesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("settings.jobRoles")}
      icon="briefcase-outline"
      procedure="employeeRoles.list"
      emptyMessage={t("settings.noJobRoles")}
    />
  );
}

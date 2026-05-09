import React from "react";
import GenericScreen from "./GenericScreen";

import { useLanguageStore } from "@/store/languageStore";
export default function AccessRolesScreen() {
  const { t } = useLanguageStore();
  return (
    <GenericScreen
      title={t("settings.accessRoles")}
      icon="shield-outline"
      procedure="roles.list"
      emptyMessage={t("settings.noAccessRoles")}
    />
  );
}

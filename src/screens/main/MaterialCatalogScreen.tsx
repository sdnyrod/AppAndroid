import React from "react";
import GenericScreen from "./GenericScreen";

export default function MaterialCatalogScreen() {
  return (
    <GenericScreen
      title="Material Catalog"
      icon="cube-outline"
      procedure="materials.list"
      emptyMessage="No Material Catalog data found"
    />
  );
}

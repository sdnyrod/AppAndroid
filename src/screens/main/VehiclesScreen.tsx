import React from "react";
import GenericScreen from "./GenericScreen";

export default function VehiclesScreen() {
  return (
    <GenericScreen
      title="Vehicles"
      icon="car-outline"
      procedure="trucks.list"
      emptyMessage="No Vehicles data found"
    />
  );
}

import React from "react";
import GenericScreen from "./GenericScreen";

export default function ReferralsScreen() {
  return (
    <GenericScreen
      title="Referral Program"
      icon="gift-outline"
      procedure="referrals.listAll"
      emptyMessage="No Referral Program data found"
    />
  );
}

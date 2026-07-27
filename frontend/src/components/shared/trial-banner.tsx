"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";

interface TrialBannerProps {
  trialEndsAt: string | null;
  plan: string;
}

export default function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (plan !== "FREE_TRIAL" || dismissed || !trialEndsAt) return null;

  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (daysRemaining <= 0) return null;

  const isUrgent = daysRemaining < 3;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 text-sm font-medium ${
        isUrgent
          ? "bg-red-600 text-white"
          : "bg-yellow-500 text-black"
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          Your free trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}. Upgrade to continue.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 rounded p-1 hover:bg-white/20"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

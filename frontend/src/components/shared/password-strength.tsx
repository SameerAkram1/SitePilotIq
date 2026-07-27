"use client";

import { CheckCircle, XCircle } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

const criteria = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  return (
    <div className="mt-2 space-y-1.5">
      {criteria.map(({ label, test }) => {
        const passed = test(password);
        return (
          <div key={label} className="flex items-center gap-2 text-sm">
            {passed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={passed ? "text-green-600" : "text-gray-500"}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

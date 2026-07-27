'use client';

import { LanguageSwitcher } from '@/components/shared/language-switcher';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="light">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground font-[family-name:var(--font-heading)] tracking-tight">
              SitePilotIQ
            </span>
          </Link>
          <Link href="/register" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Back to Register
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground font-[family-name:var(--font-heading)] mb-2">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Last updated: June 2026
        </p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly, including your name, email address, company name,
              and payment information. We also collect usage data such as pages visited, features used, and
              device information to improve our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to provide and improve the Service, send transactional emails,
              communicate about updates and offers, ensure security, and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal information. We may share data with trusted service providers
              who assist in operating the Service (e.g., hosting, payment processing), and as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS) and at rest,
              regular security audits, access controls, and secure data centers. However, no method of
              transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. Upon account deletion, we will
              remove your personal data within 30 days, except where required by law or for legitimate
              business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, delete, or export your personal data. You may
              manage your information through your account settings or by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use httpOnly cookies for authentication and session management. These cookies are
              essential for the Service to function and cannot be disabled. We do not use third-party
              tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for use by children under 16. We do not knowingly collect
              personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by email or through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Privacy Policy, please contact us at privacy@sitepilotiq.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Last updated: June 2026
        </p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using SitePilotIQ (&quot;the Service&quot;), you accept and agree to be bound by
              the terms and provision of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SitePilotIQ is a cloud-based construction management platform that provides project management,
              team collaboration, billing, inventory tracking, and related services for construction companies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for
              maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Free Trial</h2>
            <p className="text-muted-foreground leading-relaxed">
              New accounts receive a 14-day free trial with access to all features. After the trial period, you must
              subscribe to a paid plan to continue using the Service. The free trial is limited to 5 team members.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all rights to your data. SitePilotIQ will not share, sell, or distribute your data to third
              parties without your explicit consent. We implement industry-standard security measures to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Service for any unlawful purpose, to transmit harmful or malicious content,
              to attempt to gain unauthorized access to any portion of the Service, or to interfere with other users&apos; use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, your right to use the Service
              ceases immediately. You may request export of your data within 30 days of termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              SitePilotIQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages
              resulting from your use of or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the Service after changes
              constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at support@sitepilotiq.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

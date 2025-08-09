'use client';

import { useState, useEffect } from 'react';
import { HeroHeader } from '@/components/hero8-header';

export default function TermsPage() {
  const [language, setLanguage] = useState<'de' | 'en'>('en');

  const handleLanguageChange = (lang: 'de' | 'en') => {
    setLanguage(lang);
  };

  // Redirect to German AGB if German is selected
  useEffect(() => {
    if (language === 'de') {
      window.location.href = '/agb';
    }
  }, [language]);

  return (
    <>
      <HeroHeader />
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 py-20">
          <div className="max-w-4xl mx-auto px-6">
            {/* Language Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    language === 'en'
                      ? 'bg-white text-[#14ad9f] font-medium'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageChange('de')}
                  className="px-4 py-2 rounded-md transition-colors text-white/80 hover:text-white"
                >
                  Deutsch
                </button>
              </div>
            </div>

            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-8 text-center">
              Terms of Service
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-8 space-y-8">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 1 Scope and Contracting Parties
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    These Terms of Service (&ldquo;Terms&rdquo;) apply to all contracts between The
                    Freelancer Marketing Ltd. (hereinafter &ldquo;Taskilo&rdquo;, &ldquo;we&rdquo;
                    or &ldquo;us&rdquo;) and users (hereinafter &ldquo;User&rdquo;,
                    &ldquo;you&rdquo; or &ldquo;Customer&rdquo;) of the Taskilo platform.
                  </p>
                  <p>
                    <strong>Company Details:</strong>
                    <br />
                    The Freelancer Marketing Ltd.
                    <br />
                    Konstantinou Kanari 36, Office 801
                    <br />
                    8046 Paphos, Cyprus
                    <br />
                    Registration Number: HE 458650
                    <br />
                    VAT: CY60058879W
                  </p>
                  <p>
                    Taskilo operates a hybrid online marketplace that combines elements of
                    TaskRabbit, Fiverr, Malt, and sevdesk/lexoffice, enabling customers to post
                    service requests and receive offers from registered service providers
                    (freelancers/taskers). We do not accept conflicting or deviating terms unless we
                    have expressly agreed to their validity.
                  </p>
                  <p>
                    Taskilo serves both business entities within the meaning of § 14 BGB and
                    consumers within the meaning of § 13 BGB. Different legal provisions apply
                    depending on customer status, particularly regarding withdrawal rights and
                    liability.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 2 Service Description and Subject Matter
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    Taskilo provides a web-based Software-as-a-Service (SaaS) platform for mediation
                    between customers and service providers. Our platform combines:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>
                      <strong>B2C Services:</strong> Local services (craftsmen, cleaning, personal
                      chefs) similar to TaskRabbit
                    </li>
                    <li>
                      <strong>B2B Services:</strong> Professional projects, consulting, agencies
                      similar to Malt and Fiverr
                    </li>
                    <li>
                      <strong>Payment Processing:</strong> Secure transactions via Stripe Connect
                    </li>
                    <li>
                      <strong>Business Management:</strong> Invoicing, accounting, time tracking
                      similar to sevdesk/lexoffice
                    </li>
                    <li>
                      <strong>Project Management:</strong> Milestone-based payments, hour tracking,
                      project completion
                    </li>
                  </ul>
                  <p>
                    <strong>Important Notice:</strong> Taskilo acts exclusively as a mediator and
                    technical service provider. We are not a contracting party to service contracts
                    concluded between customers and service providers and assume no responsibility
                    for their performance, quality, or legality.
                  </p>
                  <p>
                    The platform is available 24 hours daily. We strive for 99.5% availability
                    annually, excluding planned maintenance work performed outside business hours.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 3 Registration, User Account and Contract Formation
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>3.1 Registration Requirements:</strong> Platform use requires
                    registration with a user account. Only legally competent natural persons and
                    legal entities may register.
                  </p>
                  <p>
                    <strong>3.2 Required Information:</strong> During registration, you must provide
                    complete and accurate information:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Full name and address</li>
                    <li>Valid email address</li>
                    <li>For businesses: company name, legal form, commercial register number</li>
                    <li>Tax identification number or VAT ID</li>
                  </ul>
                  <p>
                    <strong>3.3 Verification:</strong> We reserve the right to verify provided data
                    and request corresponding documentation. For incomplete or incorrect
                    information, we may reject registration or suspend the account.
                  </p>
                  <p>
                    <strong>3.4 Access Credentials:</strong> You are obligated to keep your access
                    credentials (username, password) strictly confidential and protect them from
                    unauthorized access. You are liable for all activities performed under your
                    account unless they result from a security breach in our systems for which you
                    are not responsible.
                  </p>
                  <p>
                    <strong>3.5 Contract Formation:</strong> The usage contract is concluded through
                    your successful registration and our confirmation via email.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 4 Usage Terms and Code of Conduct
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>4.1 Permitted Use:</strong> The platform may only be used for lawful
                    business purposes. The following is particularly prohibited:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Transmission of false, misleading, or incomplete information</li>
                    <li>Violation of copyright, trademark, or other third-party rights</li>
                    <li>Offering or requesting illegal services</li>
                    <li>
                      Circumventing our fee structure or direct contact for contract placement
                      outside the platform
                    </li>
                    <li>Spam, unwanted advertising, or mass messages</li>
                    <li>Technical manipulation or interference with platform operations</li>
                    <li>Automated data collection (scraping) without permission</li>
                  </ul>
                  <p>
                    <strong>4.2 Quality Standards:</strong> Service providers commit to providing
                    services professionally and on time. Customers are obligated to provide accurate
                    project descriptions and cooperate constructively.
                  </p>
                  <p>
                    <strong>4.3 Communication:</strong> All project-related communication should
                    take place through the platform. Direct circumvention of the platform for
                    contract conclusion is prohibited.
                  </p>
                  <p>
                    <strong>4.4 Compliance:</strong> All users must comply with applicable law,
                    particularly data protection, tax, and social security law. For cross-border
                    services, respective national regulations must also be observed.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 5 Fees, Prices and Payment Terms
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>5.1 Cost Structure:</strong> Basic platform use is free. Fees apply for:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>
                      <strong>B2C Fixed-Price Services:</strong> 4.5% success commission upon
                      contract conclusion
                    </li>
                    <li>
                      <strong>B2B Project Services:</strong> 4.5% success commission upon milestone
                      completion
                    </li>
                    <li>
                      <strong>Premium memberships:</strong> Extended features and analytics
                    </li>
                    <li>
                      <strong>Additional services:</strong> Featured listings or enhanced analytics
                    </li>
                    <li>
                      <strong>Payment processing via Stripe:</strong> 2.9% + €0.30 per transaction
                      for credit cards, 0.8% for SEPA
                    </li>
                  </ul>
                  <p>
                    <strong>5.2 Price Adjustments:</strong> We are entitled to adjust our prices
                    with 30 days&apos; notice. For price increases exceeding 10%, you have an
                    extraordinary right of termination.
                  </p>
                  <p>
                    <strong>5.3 Payment Terms:</strong> All prices are net plus applicable VAT.
                    Invoices are sent electronically and due within 14 days of invoice date. Late
                    payment incurs reminder fees of €10 per reminder.
                  </p>
                  <p>
                    <strong>5.4 Payment Methods & Platform Hold System:</strong> Payment processing
                    is handled through our partner Stripe, Inc. We accept SEPA direct debit, credit
                    cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and
                    bank transfers. Direct debit returns incur €5 fees.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 6 Intellectual Property and Platform Hold System
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>6.1 Platform Rights:</strong> All rights to the platform, software,
                    design, and content belong to us or our licensors. Users receive only a limited
                    right to use the platform.
                  </p>
                  <p>
                    <strong>6.2 User Content:</strong> Users retain rights to their content but
                    grant us necessary usage rights for platform operation.
                  </p>
                  <p>
                    <strong>6.3 Project Content:</strong> Copyright to works created by service
                    providers transfers according to individual agreements between customer and
                    service provider. Taskilo acquires no rights thereto.
                  </p>
                  <p>
                    <strong>6.4 Trademark Rights:</strong> &ldquo;Taskilo&rdquo; is a registered
                    trademark (Application: DE 3020252302804, Filing Date: 14.07.2025) protected
                    under trademark law for technological services and software development (Class
                    42) and electronic devices and software applications (Class 9).
                  </p>
                  <p>
                    <strong>6A Platform Hold System:</strong> For transaction security, payments are
                    held on our Stripe Platform Account and transferred to the service provider only
                    after successful project acceptance by both parties.
                  </p>
                  <p>
                    <strong>6A.2 Release Conditions:</strong> Automatic fund release occurs when:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Both customer and service provider have marked the project as completed</li>
                    <li>No open disputes or complaints exist</li>
                    <li>Agreed scope of services has been fulfilled</li>
                  </ul>
                </div>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 7 Limitation of Liability and Warranty
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>7.1 Third-Party Service Disclaimer:</strong> Taskilo is not liable for
                    the quality, punctuality, or legality of services between customers and service
                    providers. We are merely a mediator and technical service provider.
                  </p>
                  <p>
                    <strong>7.2 Limited Liability:</strong> Our liability is limited to intent and
                    gross negligence. For slight negligence, we are liable only for breach of
                    essential contractual obligations, with liability limited to typical,
                    foreseeable damages.
                  </p>
                  <p>
                    <strong>7.3 Liability Cap:</strong> Total Taskilo liability per incident is
                    limited to fees paid by you in the last 12 months, maximum €10,000.
                  </p>
                  <p>
                    <strong>7.4 Excluded Damages:</strong> We are not liable for indirect damages,
                    lost profits, data loss, or consequential damages, except in cases of intent or
                    gross negligence.
                  </p>
                  <p>
                    <strong>7.5 Availability:</strong> We strive for high platform availability but
                    cannot guarantee uninterrupted service. Maintenance work is performed outside
                    business hours when possible.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 8 Dispute Resolution and Complaint Management
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>8.1 Mediation Process:</strong> For disputes between customers and
                    service providers, we offer free mediation service. Both parties may request
                    mediation within 14 days of project completion.
                  </p>
                  <p>
                    <strong>8.2 Complaint Processing:</strong> We process complaints about our
                    platform or services within 48 hours. For complex cases, final response within 7
                    business days. Complaints can be sent to support@taskilo.de.
                  </p>
                  <p>
                    <strong>8.3 Escalation Process:</strong> If disputes cannot be resolved through
                    mediation, the EU Online Dispute Resolution platform
                    (https://ec.europa.eu/consumers/odr) is available for consumers.
                  </p>
                  <p>
                    <strong>8.4 Account Suspension:</strong> For serious violations of these Terms
                    or applicable law, we may temporarily or permanently suspend accounts. Usually a
                    warning precedes suspension, except for particularly serious violations.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 9 Termination and Contract Termination
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>9.1 Ordinary Termination:</strong> Both parties may terminate the usage
                    contract at any time with 30 days&apos; notice to month-end. Premium
                    subscriptions may be terminated at the end of the respective term.
                  </p>
                  <p>
                    <strong>9.2 Extraordinary Termination:</strong> Termination for cause is
                    possible, particularly for:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Serious violations of these Terms</li>
                    <li>Payment default exceeding 30 days</li>
                    <li>Platform abuse or fraudulent behavior</li>
                    <li>Violation of third-party rights</li>
                  </ul>
                  <p>
                    <strong>9.3 Consequences of Termination:</strong> Upon contract termination,
                    your data will be handled according to our privacy policy. Ongoing projects may
                    continue to their natural end. Already paid fees are not refunded unless
                    extraordinary termination is attributable to us.
                  </p>
                  <p>
                    <strong>9.4 Data Portability:</strong> Upon request, we provide your data in a
                    common, machine-readable format.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 10 Special Provisions for Consumers
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>10.1 Right of Withdrawal:</strong> Consumers have a 14-day withdrawal
                    right for paid contracts. The withdrawal right expires upon complete performance
                    of services if execution began with express consumer consent before the
                    withdrawal period expires.
                  </p>
                  <p>
                    <strong>10.2 Warranty:</strong> Statutory warranty rights apply to consumers.
                    For platform defects, consumers may initially demand rectification.
                  </p>
                  <p>
                    <strong>10.3 Liability:</strong> Toward consumers, we are liable according to
                    statutory provisions. Liability limitations apply only to the extent legally
                    permissible.
                  </p>
                  <p>
                    <strong>10.4 Dispute Resolution:</strong> We participate in out-of-court dispute
                    resolution proceedings before a consumer arbitration board. The General Consumer
                    Arbitration Board of the Center for Arbitration e.V. is responsible.
                  </p>
                </div>
              </section>

              {/* Section 11 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 11 Data Protection
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>11.1 Data Processing:</strong> Personal data processing occurs according
                    to our privacy policy available at /datenschutz and current data protection
                    regulations (GDPR).
                  </p>
                  <p>
                    <strong>11.2 Purpose Limitation:</strong> We process personal data only for
                    platform operation, contract fulfillment, and legal obligations.
                  </p>
                  <p>
                    <strong>11.3 Payment Data:</strong> Payment data is processed exclusively by our
                    PCI-DSS certified partner Stripe. Taskilo receives no complete credit card data
                    or sensitive payment information.
                  </p>
                  <p>
                    <strong>11.4 International Data Transfer:</strong> When using cloud services and
                    Stripe, data may be processed outside the EU. We ensure GDPR data protection
                    level through appropriate safeguards (standard contractual clauses, adequacy
                    decisions).
                  </p>
                  <p>
                    <strong>11.5 Data Processing Agreements:</strong> Where we use external service
                    providers like Stripe with access to personal data, we conclude corresponding
                    data processing agreements according to Art. 28 GDPR.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 12 Changes to Terms
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>12.1 Right to Change:</strong> We reserve the right to change these
                    Terms for important reasons, particularly:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Changes in law or case law</li>
                    <li>New or changed platform features</li>
                    <li>Security improvements or technical adaptations</li>
                    <li>Changes in business strategy, as far as reasonable</li>
                  </ul>
                  <p>
                    <strong>12.2 Notification:</strong> You will be informed of changes at least 30
                    days before they take effect via email and notice on the platform.
                  </p>
                  <p>
                    <strong>12.3 Right to Object:</strong> You may object to changes in writing
                    within 30 days. For objections to substantial changes, both parties may
                    terminate the contract extraordinarily.
                  </p>
                  <p>
                    <strong>12.4 Consent:</strong> If you continue using the platform after changed
                    Terms take effect, they are deemed accepted.
                  </p>
                </div>
              </section>

              {/* Section 13 */}
              <section>
                <h2 className="text-2xl font-semibold text-white drop-shadow-lg mb-4">
                  § 13 Final Provisions
                </h2>
                <div className="text-white/90 drop-shadow-lg space-y-4">
                  <p>
                    <strong>13.1 Applicable Law:</strong> The law of the Republic of Cyprus applies.
                    For consumers from Germany, mandatory consumer protection provisions of German
                    law also apply insofar as they are more favorable.
                  </p>
                  <p>
                    <strong>13.2 Jurisdiction:</strong> For disputes with businesses, exclusive
                    jurisdiction is Paphos, Cyprus. For consumers from Germany, statutory
                    jurisdiction in Germany applies, whereby we are entitled to sue at the
                    consumer&apos;s place of residence.
                  </p>
                  <p>
                    <strong>13.3 Severability Clause:</strong> Should individual provisions of these
                    Terms be or become invalid or unenforceable, the validity of remaining
                    provisions remains unaffected. Invalid provisions will be replaced by valid ones
                    that come closest to the intended economic purpose.
                  </p>
                  <p>
                    <strong>13.4 Written Form Requirement:</strong> Changes or additions to these
                    Terms require written form. This also applies to waiving this written form
                    clause.
                  </p>
                  <p>
                    <strong>13.5 Assignment:</strong> You are not entitled to assign your rights and
                    obligations under this contract without our prior written consent.
                  </p>
                  <p>
                    <strong>13.6 Contract Language:</strong> These Terms are concluded in English.
                    The English version is always authoritative.
                  </p>
                </div>
              </section>

              {/* Contact Information */}
              <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg mt-8">
                <h3 className="text-lg font-semibold text-white drop-shadow-lg mb-4">
                  Contact Information
                </h3>
                <div className="text-sm text-white/90 drop-shadow-lg space-y-2">
                  <p>
                    <strong>The Freelancer Marketing Ltd.</strong>
                  </p>
                  <p>Konstantinou Kanari 36, Office 801</p>
                  <p>8046 Paphos, Cyprus</p>
                  <p>Registration Number: HE 458650</p>
                  <p>VAT: CY60058879W</p>
                  <p>Bank: Revolut Bank</p>
                  <p>IBAN: LT703250024720869498</p>
                  <p>BIC: REVOLT21</p>

                  <div className="mt-4 space-y-1">
                    <p>
                      <strong>Contact Options:</strong>
                    </p>
                    <p>General Support: support@taskilo.de</p>
                    <p>Technical Support: tech@taskilo.de</p>
                    <p>Privacy Inquiries: privacy@taskilo.de</p>
                    <p>Business Inquiries: business@taskilo.de</p>
                    <p>Billing Questions: billing@taskilo.de</p>
                    <p>Legal Matters: legal@taskilo.de</p>
                    <p>Disputes & Mediation: disputes@taskilo.de</p>
                  </div>

                  <p className="mt-4">
                    <strong>Trademark Notice:</strong> Taskilo is a registered trademark (File
                    Number: DE 3020252302804, Filing Date: 14.07.2025) of Elisabeth Schröder and
                    Andy Staudinger. The trademark is protected for technological services, software
                    development, and electronic applications.
                  </p>
                  <p className="mt-4">
                    <strong>Version of these Terms:</strong> August 2025
                  </p>
                  <p className="mt-4 text-xs">
                    These Terms were created considering case law and best practices of leading
                    online marketplaces and SaaS providers. They are regularly reviewed and updated
                    as needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

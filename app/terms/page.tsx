import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>These starter terms describe how AgreedLink is meant to be used. They have not been reviewed by a lawyer.</p>
      <h2>What the service does</h2>
      <p>AgreedLink lets you record agreement details, share a link for a customer to respond, and keep a history of versions, changes, and decisions entered in the app.</p>
      <h2>What the service is not</h2>
      <p>AgreedLink is not a bank, escrow service, payment processor, or law firm, and does not give legal advice. It does not hold funds, verify identities, or guarantee that anyone will keep an agreement. Records created in AgreedLink may not be legally enforceable in your situation. [Legal review needed.]</p>
      <h2>Accounts</h2>
      <p>You must provide accurate account details and keep your password private. By creating an account you agree to these Terms and the Privacy Policy.</p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Enter accurate information and have the right to share what you enter.</li>
        <li>Keep your password and customer links private. Anyone with a link can respond on the customer page, so use the revoke option if a link is shared by mistake.</li>
        <li>Do not use the service for unlawful or abusive purposes.</li>
      </ul>
      <h2>Plans and limits</h2>
      <p>The Free plan allows up to 3 active agreements at one time (draft, awaiting approval, or approved). Completed, declined, expired and cancelled agreements are kept and do not count. Pro ($9 per month) and Premium ($24 per month) are planned but not available to buy yet. Naira amounts shown are approximate. If a paid plan ends you return to Free and nothing is deleted. [Legal review needed: pricing, refunds, taxes, and changes to plans.]</p>
      <h2>Availability and liability</h2>
      <p>The service is provided as is, and may change or be unavailable. [Legal review needed: limitation of liability, governing law, and dispute terms.]</p>
    </LegalPage>
  );
}

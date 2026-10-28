import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>This page explains what AgreedLink records. It is a starter draft and has not been reviewed by a lawyer.</p>
      <h2>What we collect from account holders</h2>
      <ul>
        <li>Email address and a hashed password, handled by our authentication provider (Supabase).</li>
        <li>Full name, optional phone number, business name, time zone, and default currency that you enter, and the time you accepted these terms.</li>
        <li>An optional profile photo, stored privately so only you can access it.</li>
        <li>Agreements you create: project details, prices, dates, and the client name and optional client email you enter.</li>
        <li>Optional business profile details you enter in Settings (business email, phone, website, address). They are shown to customers on the approval page for your agreements.</li>
      </ul>
      <h2>What we record when customers use a link</h2>
      <ul>
        <li>The name, optional email, and message a customer types when they approve, decline, or ask a question.</li>
        <li>The time of each decision, stored in UTC.</li>
        <li>The first and most recent time a link was opened, and how many times. We do not store IP addresses or precise location in the app database. An open does not prove the customer read or understood the agreement.</li>
      </ul>
      <h2>Messages sent through the contact form</h2>
      <p>If you use the contact form we store your name, email address, and message so we can reply. The form is protected against spam and limits how many messages one address can send per hour.</p>
      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell personal data or send marketing email.</li>
        <li>We do not send email to your customers. The app does not send email at all in this release.</li>
        <li>We do not process payments or store card or bank details.</li>
      </ul>
      <h2>Hosting and providers</h2>
      <p>Data is stored with Supabase and the site is served by your hosting provider. These providers may keep their own technical logs, such as IP addresses. [Legal review needed: list providers, locations, and retention periods.]</p>
      <h2>Your choices</h2>
      <p>You can ask for access to, export of, or deletion of your data. [Legal review needed: describe the request process and legal bases for each region, including GDPR and the Nigeria Data Protection Act if they apply.]</p>
    </LegalPage>
  );
}

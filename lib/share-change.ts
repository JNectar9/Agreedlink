import { formatDeltaMinor, formatMinorSafe } from './money';
import { formatPlainDate } from './time';

/** Message for sharing a change request, used for WhatsApp, email and the device share sheet. */
export function buildChangeShareMessage(p: {
  creator: string;
  project: string;
  url: string;
  currency: string;
  currentMinor: number;
  newMinor: number;
  deltaMinor: number;
  currentDate: string;
  newDate: string;
  description: string;
}): string {
  const lines = [
    `Hello,`,
    ``,
    `${p.creator} proposed a change to "${p.project}":`,
    p.description,
    ``,
    `Total: ${formatMinorSafe(p.currentMinor, p.currency)} to ${formatMinorSafe(p.newMinor, p.currency)} (${formatDeltaMinor(p.deltaMinor, p.currency)})`,
    `Deadline: ${formatPlainDate(p.currentDate)}${p.currentDate === p.newDate ? ' (unchanged)' : ` to ${formatPlainDate(p.newDate)}`}`,
    ``,
    `Nothing changes until you decide. Review and approve or reject here:`,
    p.url
  ];
  return lines.join('\n');
}

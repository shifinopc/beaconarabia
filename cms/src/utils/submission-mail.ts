import nodemailer from 'nodemailer';

/**
 * Notification and acknowledgement emails for website form submissions.
 *
 * On each new enquiry up to two messages go out:
 *   1. a notification to the team (recipientEmail), and
 *   2. an acknowledgement back to whoever submitted.
 *
 * SMTP settings live in the "Email Settings" single type rather than in env
 * vars, so a changed mailbox or recipient is a CMS edit rather than a deploy.
 *
 * Nothing here ever throws. The enquiry is already saved by the time this runs
 * (it is called from afterCreate), and losing a notification is far less bad
 * than a mail failure rolling back the submission that caused it. Each send is
 * isolated too, so a bounced acknowledgement can't suppress the team's copy.
 */

declare const strapi: any;

export type EnquiryKind = 'contact' | 'newsletter' | 'popup';

/** Which per-form toggle in Email Settings gates the notification. */
const TOGGLE_FIELD: Record<EnquiryKind, string> = {
  contact: 'notifyContact',
  newsletter: 'notifyNewsletter',
  popup: 'notifyPopup',
};

const LABEL: Record<EnquiryKind, string> = {
  contact: 'Contact form enquiry',
  newsletter: 'Newsletter signup',
  popup: 'Enquiry popup submission',
};

const AUTOREPLY_SUBJECT: Record<EnquiryKind, string> = {
  contact: "We've received your message — Beacon",
  newsletter: 'Welcome to the Beacon newsletter',
  popup: "We've received your enquiry — Beacon",
};

const AUTOREPLY_BODY: Record<EnquiryKind, string> = {
  contact:
    "Thanks for getting in touch with Beacon. We've received your message and a member of our team will come back to you shortly.",
  newsletter:
    'Thanks for subscribing to the Beacon newsletter. You will be among the first to receive our latest insights on doing business across the GCC.',
  popup:
    "Thanks for your enquiry. We've received your details and one of our advisors will be in touch shortly.",
};

/** Fields shown in the notification, in order. Absent ones are skipped. */
const FIELDS: Record<EnquiryKind, string[]> = {
  contact: ['name', 'email', 'phone', 'subject', 'message', 'enquiryType', 'region', 'sourcePath'],
  newsletter: ['email', 'region', 'sourcePath'],
  popup: ['name', 'email', 'phone', 'subject', 'message', 'region', 'sourcePath'],
};

const PRETTY: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  subject: 'Subject',
  message: 'Message',
  enquiryType: 'Enquiry type',
  region: 'Region',
  sourcePath: 'Submitted from',
};

const REGION_LABEL: Record<string, string> = {
  global: 'Global',
  ae: 'United Arab Emirates',
  sa: 'Saudi Arabia',
};

const BRAND_GREEN = '#13670b';

interface EmailSettings {
  enabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  fromName?: string;
  fromEmail?: string;
  recipientEmail?: string;
  autoReply?: boolean;
  [key: string]: unknown;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Reads the settings with `strapi.db.query` rather than the document service.
 * The document service strips fields marked `private`, which would silently
 * remove smtpPassword and leave authentication failing for no visible reason.
 */
async function readSettings(): Promise<EmailSettings | null> {
  try {
    return await strapi.db.query('api::email-setting.email-setting').findOne({});
  } catch (error) {
    strapi.log.warn(
      `[mail] could not read Email Settings: ${error instanceof Error ? error.message : error}`,
    );
    return null;
  }
}

function buildTransport(settings: EmailSettings) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort ?? 587,
    secure: Boolean(settings.smtpSecure),
    auth:
      settings.smtpUsername && settings.smtpPassword
        ? { user: settings.smtpUsername, pass: settings.smtpPassword }
        : undefined,
  });
}

function detailRows(kind: EnquiryKind, entry: Record<string, unknown>): [string, string][] {
  const rows: [string, string][] = [];
  for (const key of FIELDS[kind]) {
    const value = entry?.[key];
    if (value === undefined || value === null || value === '') continue;
    const display = key === 'region' ? (REGION_LABEL[String(value)] ?? String(value)) : String(value);
    rows.push([PRETTY[key] ?? key, display]);
  }
  return rows;
}

/**
 * Table-based layout with inline styles: email clients strip external CSS and
 * most of flexbox, so this is the format that survives Outlook and Gmail alike.
 */
function wrap(title: string, innerHtml: string): string {
  return (
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="margin:0;padding:0;background:#f7f7f8;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:24px 12px;">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">` +
    `<tr><td style="background:${BRAND_GREEN};padding:20px 24px;">` +
    `<div style="color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(title)}</div>` +
    `</td></tr>` +
    `<tr><td style="padding:24px;color:#02040e;font-size:15px;line-height:1.6;">${innerHtml}</td></tr>` +
    `<tr><td style="padding:16px 24px;background:#f7f7f8;color:#58595b;font-size:12px;">` +
    `Beacon — sent automatically from the website.` +
    `</td></tr>` +
    `</table></td></tr></table></body></html>`
  );
}

function notificationHtml(kind: EnquiryKind, entry: Record<string, unknown>): string {
  const rows = detailRows(kind, entry)
    .map(
      ([label, value]) =>
        `<tr>` +
        `<td style="padding:8px 12px 8px 0;color:#58595b;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 0;color:#02040e;font-size:14px;">${escapeHtml(value).replace(/\n/g, '<br>')}</td>` +
        `</tr>`,
    )
    .join('');

  return (
    `<p style="margin:0 0 16px;">A new ${escapeHtml(LABEL[kind].toLowerCase())} has come in.</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>`
  );
}

function autoReplyHtml(kind: EnquiryKind, entry: Record<string, unknown>): string {
  const name = typeof entry?.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
  return (
    `<p style="margin:0 0 12px;">${name ? `Hi ${escapeHtml(name)},` : 'Hello,'}</p>` +
    `<p style="margin:0 0 12px;">${escapeHtml(AUTOREPLY_BODY[kind])}</p>` +
    `<p style="margin:0;color:#58595b;font-size:13px;">This is an automated acknowledgement — there is no need to reply to it.</p>`
  );
}

/**
 * Sends the notification and acknowledgement for a newly created enquiry.
 * Safe to call unconditionally: it returns quietly when mail is switched off or
 * not configured.
 */
export async function sendEnquiryMail(
  kind: EnquiryKind,
  entry: Record<string, unknown> | undefined,
): Promise<void> {
  if (!entry) return;

  const settings = await readSettings();
  if (!settings?.enabled) return;

  if (!settings.smtpHost || !settings.fromEmail) {
    strapi.log.warn('[mail] Email Settings is enabled but smtpHost/fromEmail are missing');
    return;
  }

  const from = settings.fromName
    ? `"${settings.fromName}" <${settings.fromEmail}>`
    : settings.fromEmail;

  const transport = buildTransport(settings);

  // 1. Notification to the team, if this form's toggle is on.
  const toggle = TOGGLE_FIELD[kind];
  if (settings[toggle] !== false && settings.recipientEmail) {
    const subjectBits = [LABEL[kind]];
    if (entry.region) subjectBits.push(REGION_LABEL[String(entry.region)] ?? String(entry.region));
    if (entry.name) subjectBits.push(String(entry.name));

    try {
      await transport.sendMail({
        from,
        to: settings.recipientEmail,
        // So a reply in the mail client goes to the enquirer, not to the
        // website mailbox — the single most useful thing about these emails.
        replyTo: isEmail(entry.email) ? String(entry.email) : undefined,
        subject: subjectBits.join(' — '),
        html: wrap(LABEL[kind], notificationHtml(kind, entry)),
      });
    } catch (error) {
      strapi.log.error(
        `[mail] notification failed for ${kind} enquiry: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  // 2. Acknowledgement to the submitter.
  if (settings.autoReply !== false && isEmail(entry.email)) {
    try {
      await transport.sendMail({
        from,
        to: String(entry.email),
        subject: AUTOREPLY_SUBJECT[kind],
        html: wrap('Thanks for getting in touch', autoReplyHtml(kind, entry)),
      });
    } catch (error) {
      strapi.log.error(
        `[mail] auto-reply failed for ${kind} enquiry: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}

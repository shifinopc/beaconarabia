import { sendEnquiryMail, type EnquiryKind } from '../../../../utils/submission-mail';

declare const strapi: any;

/**
 * Enquiry lifecycle hooks.
 *
 * Mail is sent from `afterCreate` rather than from the frontend's API route so
 * that the record is the source of truth: the enquiry is already committed by
 * the time this runs, and a mail failure cannot lose it. sendEnquiryMail never
 * throws for the same reason.
 *
 * `afterFindOne` marks an enquiry read the first time it is opened in the admin,
 * so the list distinguishes new submissions from ones already dealt with.
 */
export default {
  async afterCreate(event: { result?: Record<string, unknown> }) {
    const entry = event.result;
    const kind = (entry?.kind as EnquiryKind) ?? 'contact';
    await sendEnquiryMail(kind, entry);
  },

  async afterFindOne(event: { result?: { documentId?: string; viewed?: boolean } }) {
    const entry = event.result;
    if (!entry?.documentId || entry.viewed) return;

    try {
      await strapi.documents('api::enquiry.enquiry').update({
        documentId: entry.documentId,
        data: { viewed: true },
      });
      // Reflect it in the response being returned, so the admin doesn't need a
      // reload to show the change it just triggered.
      entry.viewed = true;
    } catch {
      // Cosmetic only — never let this interfere with reading the enquiry.
    }
  },
};

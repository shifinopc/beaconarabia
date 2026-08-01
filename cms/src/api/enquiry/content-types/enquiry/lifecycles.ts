import { sendEnquiryMail, type EnquiryKind } from '../../../../utils/submission-mail';

declare const strapi: any;

/**
 * Enquiry lifecycle hooks.
 *
 * Both hooks defer their work with setImmediate and neither is awaited. That is
 * not an optimisation — these hooks run inside the transaction that triggered
 * them, so anything awaited here holds that transaction and its table locks
 * open for the duration. An awaited hook doing I/O will hang the request and
 * block every subsequent write to the table behind it.
 */
export default {
  afterCreate(event: { result?: Record<string, unknown> }) {
    const entry = event.result;
    const kind = (entry?.kind as EnquiryKind) ?? 'contact';

    /**
     * Mail is a side effect of the enquiry, not part of it. Deferring lets the
     * transaction commit first, so the submitter is confirmed as soon as their
     * enquiry is safely stored — rather than waiting on an SMTP round trip that
     * may be slow or fail entirely.
     */
    setImmediate(() => {
      void sendEnquiryMail(kind, entry).catch(() => {
        // sendEnquiryMail logs its own failures; nothing to add.
      });
    });
  },

  /**
   * Marks an enquiry read the first time it is opened in the admin, so the list
   * distinguishes new submissions from ones already dealt with.
   *
   * `strapi.db.query().update()` rather than `strapi.documents().update()`:
   * the document service re-enters the lifecycle chain, so updating from within
   * a lifecycle hook can recurse. The db query writes straight to the table.
   */
  afterFindOne(event: { result?: { id?: number; viewed?: boolean } }) {
    const result = event.result;
    if (!result || result.viewed === true || !result.id) return;

    const id = result.id;
    setImmediate(() => {
      strapi.db
        .query('api::enquiry.enquiry')
        .update({ where: { id }, data: { viewed: true } })
        .catch((error: unknown) => {
          // Cosmetic only — never let this interfere with reading the enquiry.
          strapi.log?.warn?.(`[enquiry] auto-mark viewed failed: ${error}`);
        });
    });
  },
};

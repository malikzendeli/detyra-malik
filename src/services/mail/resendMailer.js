import { Resend } from 'resend';
import { MailDeliveryError } from '../../models/errors.js';

/** Sends email through the Resend API. Only the background worker path calls this. */
export function createResendMailer({ apiKey, from }) {
  const resend = new Resend(apiKey);

  return {
    async send({ to, subject, html, text }) {
      let response;
      try {
        response = await resend.emails.send({
          from,
          to,
          subject,
          ...(html ? { html } : {}),
          ...(text ? { text } : {}),
        });
      } catch (err) {
        throw new MailDeliveryError(`Resend request failed: ${err.message}`, { code: 'network_error', cause: err });
      }

      const { data, error } = response;
      if (error) {
        throw new MailDeliveryError(`Resend error (${error.name}): ${error.message}`, { code: error.name });
      }
      return { providerMessageId: data.id };
    },
  };
}

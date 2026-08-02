const transporter = require('../config/mailer');
const { generateQRBuffer } = require('./qrService');
const { getTicketsByRegistration, createTicketsForRegistration } = require('./registrationService');

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function log(msg) {
  console.log(`[Email] ${new Date().toISOString()} ${msg}`);
}

async function sendRegistrationConfirmation(registration, event, baseUrl) {
  if (!SMTP_CONFIGURED) {
    log(`SMTP not configured — skipping confirmation to ${registration.email}`);
    return;
  }
  if (!registration.email || !registration.email.includes('@')) {
    log(`Phone-only contact — skipping QR email for ${registration.name}`);
    return;
  }

  log(`Sending confirmation to ${registration.email} (reg ${registration.id}, event "${event.title}")`);

  // Fetch per-person tickets; create them if missing (e.g. legacy registrations)
  let tickets = await getTicketsByRegistration(registration.id);
  if (tickets.length === 0) {
    tickets = await createTicketsForRegistration(registration.id, registration.adults_count);
  }

  const eventDateBn = new Date(event.event_date).toLocaleDateString('bn-BD', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin',
  });
  const eventDateDe = new Date(event.event_date).toLocaleDateString('de-DE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Berlin',
  });

  // Generate a QR buffer for each ticket
  const qrBuffers = await Promise.all(
    tickets.map(t => generateQRBuffer(`${baseUrl}/api/validate/${t.qr_token}`))
  );

  const attachments = qrBuffers.map((buf, i) => ({
    filename: `ticket-${i + 1}.png`,
    content: buf,
    cid: `qrcode_${i + 1}`,
  }));

  const total = tickets.length;
  const ticketsHtml = tickets.map((ticket, i) => {
    const shortCode = ticket.qr_token.slice(0, 8).toUpperCase();
    return `
      <div style="margin:20px 0;padding:16px;border:1px solid #ddd;border-radius:8px;text-align:center">
        <p style="font-weight:bold;font-size:1.05rem;margin:0 0 8px">
          টিকেট ${i + 1}/${total} &nbsp;·&nbsp; Ticket ${i + 1} of ${total}
        </p>
        <img src="cid:qrcode_${i + 1}" alt="Ticket ${i + 1} QR Code"
             style="width:180px;height:180px;display:block;margin:8px auto" />
        <p style="font-size:0.85rem;color:#555;margin:4px 0">QR না হলে এই কোড দেখান / Falls QR nicht scannt:</p>
        <p style="font-family:monospace;font-size:22px;font-weight:bold;letter-spacing:4px;
                  background:#f4f4f4;padding:8px 14px;border-radius:6px;display:inline-block;margin:4px 0">
          ${shortCode}
        </p>
      </div>
    `;
  }).join('');

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: registration.email,
    subject: `নিবন্ধন নিশ্চিত / Registrierung bestätigt — ${event.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">

        <h2 style="color:#1a1a2e">নিবন্ধন নিশ্চিত হয়েছে! ✓</h2>
        <p>প্রিয় <strong>${registration.name}</strong>,</p>
        <p><strong>${event.title}</strong>-এ আপনার নিবন্ধন সফলভাবে নিশ্চিত হয়েছে।</p>
        <table style="border-collapse:collapse;width:100%;margin:12px 0">
          <tr>
            <td style="padding:6px 12px 6px 0;color:#555">তারিখ / Datum</td>
            <td style="padding:6px 0"><strong>${eventDateBn}</strong><br><small style="color:#888">${eventDateDe}</small></td>
          </tr>
          ${event.location ? `<tr><td style="padding:6px 12px 6px 0;color:#555">স্থান / Ort</td><td style="padding:6px 0"><strong>${event.location}</strong></td></tr>` : ''}
          ${registration.payment_reference ? `<tr><td style="padding:6px 12px 6px 0;color:#555">পেমেন্ট রেফারেন্স</td><td style="padding:6px 0">${registration.payment_reference}</td></tr>` : ''}
        </table>

        <p>
          প্রতিটি ব্যক্তির জন্য আলাদা QR কোড নিচে দেওয়া হয়েছে। প্রবেশদ্বারে প্রত্যেকে তাদের নিজস্ব QR কোড দেখাবেন।
          প্রতিটি কোড একবারই ব্যবহার করা যাবে।
        </p>
        <p style="color:#888;font-size:0.9rem">
          Jede Person hat einen eigenen QR-Code. Bitte zeigen Sie am Eingang jeweils Ihren eigenen Code.
          Jeder Code ist nur einmal gültig.
        </p>

        ${ticketsHtml}

        <hr style="margin:24px 0;border:none;border-top:1px solid #eee">

        <h3 style="color:#1a1a2e">Registrierung bestätigt!</h3>
        <p>Liebe/r <strong>${registration.name}</strong>,</p>
        <p>Ihre Registrierung für <strong>${event.title}</strong> wurde bestätigt.</p>
        <p style="color:#888;font-size:0.85rem">Bitte prüfen Sie auch Ihren Spam-Ordner, falls Sie diese E-Mail nicht erwartet haben.</p>
        <p style="color:#888;font-size:0.85rem">আপনি যদি এই ইমেইল না পান, স্প্যাম ফোল্ডার চেক করুন।</p>
      </div>
    `,
    attachments,
  });
  log(`Confirmation sent to ${registration.email} (${total} ticket(s)) — messageId: ${info.messageId}`);
}

async function sendPromotionEmail(recipients, subject, body, eventTitle, trackingUrl = null) {
  if (!SMTP_CONFIGURED) {
    log(`SMTP not configured — skipping promotion email to ${recipients.length} recipients`);
    return 0;
  }

  log(`Starting promotion email "${subject}" to ${recipients.length} recipients (event "${eventTitle}")`);
  const pixel = trackingUrl ? `<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="">` : '';
  let sent = 0;
  const batchSize = 50;
  const totalBatches = Math.ceil(recipients.length / batchSize);
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    log(`Sending batch ${batchNum}/${totalBatches} (${batch.length} recipients)`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      bcc: batch,
      subject,
      html: `
        <h2>${eventTitle}</h2>
        ${body}
        <hr>
        <small>You received this because you registered for ${eventTitle}.</small>
        ${pixel}
      `,
    });
    sent += batch.length;
    log(`Batch ${batchNum}/${totalBatches} sent — messageId: ${info.messageId}`);
  }
  log(`Promotion email complete: ${sent} recipients`);
  return sent;
}

module.exports = { sendRegistrationConfirmation, sendPromotionEmail };

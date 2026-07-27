const transporter = require('../config/mailer');
const { generateQRBuffer } = require('./qrService');

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

async function sendRegistrationConfirmation(registration, event, baseUrl) {
  if (!SMTP_CONFIGURED) {
    console.log(`[Email] SMTP not configured — skipping confirmation email to ${registration.email}`);
    return;
  }

  const qrUrl = `${baseUrl}/api/validate/${registration.qr_token}`;
  const qrBuffer = await generateQRBuffer(qrUrl);

  const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: registration.email,
    subject: `Registration Confirmed — ${event.title}`,
    html: `
      <h2>Registration Confirmed!</h2>
      <p>Dear ${registration.name},</p>
      <p>Your registration for <strong>${event.title}</strong> has been received.</p>
      <table>
        <tr><td><strong>Date:</strong></td><td>${eventDate}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${event.location}</td></tr>
        <tr><td><strong>Payment Reference:</strong></td><td>${registration.payment_reference || 'N/A'}</td></tr>
      </table>
      <p>Please bring or show the QR code below at the entrance:</p>
      <img src="cid:qrcode" alt="Entry QR Code" style="width:200px;height:200px;" />
      <p style="margin-top:16px">If the QR code does not scan, show this code manually at the entrance:</p>
      <p style="font-family:monospace;font-size:24px;font-weight:bold;letter-spacing:4px;background:#f4f4f4;padding:10px 16px;border-radius:6px;display:inline-block">${registration.qr_token.slice(0, 8).toUpperCase()}</p>
      <p>Your payment status will be confirmed by our team.</p>
      <p>See you at the event!</p>
    `,
    attachments: [{
      filename: 'qrcode.png',
      content: qrBuffer,
      cid: 'qrcode',
    }],
  });
}

async function sendPromotionEmail(recipients, subject, body, eventTitle) {
  if (!SMTP_CONFIGURED) {
    console.log(`[Email] SMTP not configured — skipping promotion email to ${recipients.length} recipients`);
    return 0;
  }

  let sent = 0;
  const batchSize = 50;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      bcc: batch,
      subject,
      html: `
        <h2>${eventTitle}</h2>
        ${body.replace(/\n/g, '<br>')}
        <hr>
        <small>You received this because you registered for ${eventTitle}.</small>
      `,
    });
    sent += batch.length;
  }
  return sent;
}

module.exports = { sendRegistrationConfirmation, sendPromotionEmail };

const QRCode = require('qrcode');

async function generateQRDataURL(text) {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

async function generateQRBuffer(text) {
  return QRCode.toBuffer(text, {
    width: 300,
    margin: 2,
  });
}

module.exports = { generateQRDataURL, generateQRBuffer };

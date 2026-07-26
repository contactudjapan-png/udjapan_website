let html5QrCode = null;
let scanning = false;

async function validateToken(token) {
  try {
    const res = await fetch(`/api/validate/${encodeURIComponent(token)}`);
    const data = await res.json();
    showResult(data);
  } catch (err) {
    showResult({ valid: false, message: 'Network error — could not validate.' });
  }
}

function showResult(data) {
  const box = document.getElementById('result-box');
  const icon = document.getElementById('result-icon');
  const content = document.getElementById('result-content');
  const scanner = document.getElementById('scanner-container');
  const manual = document.getElementById('manual-entry');

  scanner.style.display = 'none';
  manual.style.display = 'none';
  box.classList.remove('result-box--hidden', 'result-box--valid', 'result-box--invalid');

  if (!data.valid) {
    box.classList.add('result-box--invalid');
    icon.textContent = '✗';
    content.innerHTML = `<p class="result-message">${data.message || 'Invalid QR code'}</p>`;
  } else if (data.is_paid) {
    box.classList.add('result-box--valid');
    icon.textContent = '✓';
    content.innerHTML = `
      <p class="result-name">${escapeHtml(data.name)}</p>
      <p class="result-event">${escapeHtml(data.event)}</p>
      <p class="result-status result-paid">✓ PAID</p>
    `;
  } else {
    box.classList.add('result-box--invalid');
    icon.textContent = '!';
    content.innerHTML = `
      <p class="result-name">${escapeHtml(data.name)}</p>
      <p class="result-event">${escapeHtml(data.event)}</p>
      <p class="result-status result-unpaid">⚠ PAYMENT PENDING</p>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function extractToken(url) {
  // If it's a full URL like https://host/api/validate/TOKEN, extract TOKEN
  try {
    const withScheme = url.includes('://') ? url : `https://${url}`;
    const u = new URL(withScheme);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    return url; // treat as raw token
  }
}

function resetScanner() {
  const box = document.getElementById('result-box');
  const scanner = document.getElementById('scanner-container');
  const manual = document.getElementById('manual-entry');
  box.classList.add('result-box--hidden');
  scanner.style.display = '';
  manual.style.display = '';
  if (!scanning) startScanner();
}

function startScanner() {
  const readerEl = document.getElementById('reader');
  if (!readerEl) return;

  html5QrCode = new Html5Qrcode('reader');
  scanning = true;

  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || cameras.length === 0) {
      document.getElementById('reader').innerHTML = '<p style="padding:1rem">No camera found.</p>';
      return;
    }
    // Prefer back camera
    const camera = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];

    html5QrCode.start(
      camera.id,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (!scanning) return;
        scanning = false;
        html5QrCode.stop().catch(() => {});
        const token = extractToken(decodedText);
        validateToken(token);
      },
      () => {} // ignore errors
    ).catch(err => {
      document.getElementById('reader').innerHTML = `<p style="padding:1rem">Camera error: ${err}</p>`;
    });
  }).catch(() => {
    document.getElementById('reader').innerHTML = '<p style="padding:1rem">Could not access camera.</p>';
  });
}

// Manual form
document.getElementById('manual-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const token = document.getElementById('manual-token').value.trim();
  if (!token) return;
  const extracted = extractToken(token);
  validateToken(extracted);
});

// Start scanner on load
startScanner();

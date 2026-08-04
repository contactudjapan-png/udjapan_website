let html5QrCode = null;
let scanning = false;

async function validateToken(token) {
  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
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

  if (!data.valid && data.already_used) {
    box.classList.add('result-box--invalid');
    icon.textContent = '⛔';
    const usedTime = data.used_at
      ? new Date(data.used_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const ticketInfo = data.ticket_number && data.total_tickets
      ? `Ticket ${data.ticket_number} of ${data.total_tickets}`
      : '';
    content.innerHTML = `
      <p class="result-name">${escapeHtml(data.name || '')}</p>
      <p class="result-status result-denied">ALREADY SCANNED — ENTRY DENIED</p>
      ${ticketInfo ? `<p class="result-message">${escapeHtml(ticketInfo)}</p>` : ''}
      ${usedTime ? `<p class="result-message" style="color:#888;font-size:0.85rem">First scanned at ${usedTime}</p>` : ''}
    `;
  } else if (!data.valid) {
    box.classList.add('result-box--invalid');
    icon.textContent = '✗';
    content.innerHTML = `<p class="result-message">${data.message || 'Invalid QR code'}</p>`;
  } else if (data.is_paid) {
    box.classList.add('result-box--valid');
    icon.textContent = '✓';
    const ticketTag = data.ticket_number && data.total_tickets
      ? `<p class="result-message" style="font-weight:600">Ticket ${data.ticket_number} of ${data.total_tickets}</p>`
      : '';
    content.innerHTML = `
      <p class="result-name">${escapeHtml(data.name)}</p>
      <p class="result-event">${escapeHtml(data.event)}</p>
      ${ticketTag}
      <p class="result-persons">${personCountHtml(data)}</p>
      <p class="result-status result-paid">✓ PAID</p>
    `;
  } else {
    box.classList.add('result-box--invalid');
    icon.textContent = '!';
    content.innerHTML = `
      <p class="result-name">${escapeHtml(data.name)}</p>
      <p class="result-event">${escapeHtml(data.event)}</p>
      <p class="result-persons">${personCountHtml(data)}</p>
      <p class="result-status result-unpaid">⚠ PAYMENT PENDING</p>
    `;
  }
}

function personCountHtml(data) {
  var parts = [];
  if (data.adults_count > 0) parts.push(data.adults_count + ' adult' + (data.adults_count !== 1 ? 's' : '') + ' (15+)');
  if (data.children_count > 0) parts.push(data.children_count + ' child' + (data.children_count !== 1 ? 'ren' : '') + ' (<15)');
  var html = parts.length ? parts.join(' + ') : '1 person';
  if (data.is_special_needs) html += ' <span class="badge-special">♿ Special needs</span>';
  return html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function extractToken(input) {
  const s = (input || '').trim();
  if (!s.includes('/')) return s; // raw token — no path separators
  if (s.includes('://')) {
    try {
      const u = new URL(s);
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || s;
    } catch { return s; }
  }
  // Path-only like /api/validate/TOKEN or api/validate/TOKEN
  const parts = s.split('/').filter(Boolean);
  return parts[parts.length - 1] || s;
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

// Scan again button
document.getElementById('scan-again').addEventListener('click', resetScanner);

// Start scanner on load
startScanner();

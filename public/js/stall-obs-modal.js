function showObs(btn) {
  const name = btn.dataset.name;
  const obs = JSON.parse(document.getElementById('obs-' + btn.dataset.id).textContent);
  document.getElementById('obs-title').textContent = 'পর্যবেক্ষণ — ' + name;
  const body = document.getElementById('obs-body');
  if (!obs.length) {
    body.innerHTML = '<p style="color:#888">এখনো কোনো পর্যবেক্ষণ নেই।</p>';
  } else {
    const stars = (r) => r ? '★'.repeat(r) + '☆'.repeat(10 - r) + ' ' + r + '/১০' : '—';
    body.innerHTML = '<table class="admin-table"><thead><tr><th>সময়</th><th>ধরন</th><th>রেটিং</th><th>নোট</th><th>দ্বারা</th></tr></thead><tbody>' +
      obs.map(o => `<tr>
        <td style="white-space:nowrap">${new Date(o.created_at).toLocaleString('bn-BD')}</td>
        <td>${o.observation_type || '—'}</td>
        <td style="color:#f5b301;letter-spacing:1px">${stars(o.rating)}</td>
        <td>${o.notes || '—'}</td>
        <td><small>${o.submitted_by}</small></td>
      </tr>`).join('') +
      '</tbody></table>';
  }
  document.getElementById('obs-backdrop').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.obs-btn').forEach(btn => {
    btn.addEventListener('click', () => showObs(btn));
  });

  const backdrop = document.getElementById('obs-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.style.display = 'none';
    });
    document.getElementById('obs-close').addEventListener('click', () => {
      backdrop.style.display = 'none';
    });
  }
});

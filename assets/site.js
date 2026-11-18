// CuePointe shared behaviour: menu toggle, cookie consent (drives Google Analytics consent mode),
// HTML escaping and JSON loading. Pages set up gtag consent defaults in <head> before this runs.
'use strict';
window.cp = window.cp || {};
cp.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
cp.getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

// Dates are written for people ("April 26, 2026 · 2PM", "April – June 2026", "July 12–13, 2026").
// Returns the last day the event could run, or null when no year is given.
cp.endDate = function (text) {
  const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const t = String(text || '').toLowerCase();
  const year = (t.match(/\b(20\d\d)\b/g) || []).pop();
  if (!year) return null;
  let month = -1, at = -1;
  MONTHS.forEach((m, i) => { const p = t.lastIndexOf(m); if (p > at) { at = p; month = i; } });
  if (month < 0) return new Date(Number(year), 11, 31, 23, 59);
  const days = t.slice(at).replace(/\b20\d\d\b/g, '').match(/\b([0-3]?\d)\b/g);
  const day = days ? Number(days[days.length - 1]) : new Date(Number(year), month + 1, 0).getDate();
  return new Date(Number(year), month, day, 23, 59);
};
cp.isUpcoming = e => { const d = cp.endDate(e.date); return !d || d.getTime() >= Date.now(); };
cp.upcomingEvents = d => (d.events || []).filter(e => ['featured', 'open', 'upcoming'].includes(e.status) && cp.isUpcoming(e));

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  const bar = document.getElementById('cookie');
  let choice = null;
  try { choice = localStorage.getItem('cpCookie'); } catch (e) {}
  if (bar && choice === null) bar.classList.add('show');
  document.querySelectorAll('[data-consent]').forEach(b => b.addEventListener('click', () => {
    const yes = b.dataset.consent === 'yes';
    try { localStorage.setItem('cpCookie', yes ? '1' : '0'); } catch (e) {}
    if (typeof gtag === 'function') gtag('consent', 'update', { analytics_storage: yes ? 'granted' : 'denied' });
    bar.classList.remove('show');
  }));
});

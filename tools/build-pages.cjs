// Run from the repo root:  node tools/build-pages.cjs
// Rewrites the inner pages (schedule, rankings, news, venues, contact, about, talent fund)
// from one shell. Edit content here, not in the generated .html files.
// Generates the inner pages from one shell so header, nav, footer and buttons are identical.
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..'); // repo root

const NAV = [
  ['view-schedule.html', 'Schedule'], ['rankings.html', 'Rankings'], ['news.html', 'News'],
  ['venues.html', 'Venues'], ['talent-fund.html', 'Talent Fund'], ['about.html', 'About'], ['contact.html', 'Contact']
];

function page({ file, title, desc, css = '', main, script = '' }) {
  const nav = NAV.map(([href, label]) =>
    `      <li><a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#0E4D36">
<link rel="icon" type="image/x-icon" href="favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="canonical" href="https://cuepointe.vercel.app/${file}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CuePointe Action Pool">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="https://cuepointe.vercel.app/images/hero-1.jpg">
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  (function(){ var c = null; try { c = localStorage.getItem('cpCookie'); } catch (e) {}
    gtag('consent', 'default', { analytics_storage: c === '1' ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); })();
  gtag('js', new Date());
  gtag('config', 'G-221BNVJR22');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-221BNVJR22"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css">${css ? `\n<style>\n${css.trim()}\n</style>` : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="top">
  <div class="wrap">
    <a class="brand" href="./" aria-label="CuePointe home"><img src="logo-lockup.webp" width="120" height="63" alt="CuePointe — Empowering Talent"></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
    <ul class="nav" id="nav">
${nav}
    </ul>
    <a class="btn btn-orange nav-cta" href="register.html">Register</a>
  </div>
</header>

<main id="main">
${main.trim()}
</main>

${FOOTER}

<div class="cookie" id="cookie" role="region" aria-label="Cookie notice">
  <p>We use Google Analytics to count visits. Nothing is stored until you agree.</p>
  <button class="btn btn-orange" data-consent="yes">Accept</button>
  <button class="btn btn-line" data-consent="no">No thanks</button>
</div>
<a class="wa" href="https://wa.me/256743482588?text=Hi%20CuePointe!" target="_blank" rel="noopener">Chat on WhatsApp</a>

<script src="assets/site.js"></script>${script ? `\n<script>\n'use strict';\n${script.trim()}\n</script>` : ''}
</body>
</html>
`;
}

const FOOTER = `<footer>
  <div class="wrap">
    <div>
      <p style="color:var(--text);font-weight:800">CuePointe Action Pool</p>
      <p>Kampala, Uganda · © 2026</p>
    </div>
    <ul aria-label="Footer links">
      <li><a href="register.html">Register</a></li>
      <li><a href="view-schedule.html">Schedule</a></li>
      <li><a href="rankings.html">Rankings</a></li>
      <li><a href="news.html">News</a></li>
      <li><a href="talent-fund.html">Talent Fund</a></li>
      <li><a href="about.html">About</a></li>
      <li><a href="contact.html">Contact</a></li>
      <li><a href="https://www.facebook.com/CuePointe" target="_blank" rel="noopener">Facebook</a></li>
      <li><a href="https://www.instagram.com/cuepointe" target="_blank" rel="noopener">Instagram</a></li>
      <li><a href="https://www.tiktok.com/@cuepointe" target="_blank" rel="noopener">TikTok</a></li>
      <li><a href="https://www.youtube.com/channel/UCJs5yTrm9EU0CBG6YOfU3Cw" target="_blank" rel="noopener">YouTube</a></li>
      <li><a href="admin.html">Staff</a></li>
    </ul>
  </div>
</footer>`;

const head = (kicker, h1, lead) => `
<div class="page-head"><div class="wrap">
  <p class="kicker">${kicker}</p>
  <h1>${h1}</h1>
  <p class="lead">${lead}</p>
</div></div>`;

/* shared form submit used by contact + venues */
const FORM_JS = `
function wireForm(formId, url, build, doneId){
  const form = document.getElementById(formId), btn = form.querySelector('.submit'), msg = form.querySelector('.form-msg');
  const label = btn.textContent;
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    msg.className = 'form-msg';
    let body;
    try { body = build(form); } catch (e) { msg.textContent = e.message; msg.className = 'form-msg err'; return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => r.json().catch(() => ({})).then(d => { if (!r.ok) throw new Error(d.error || 'Could not send right now. Please try again or message us on WhatsApp.'); }),
            () => { throw new Error('No connection. Please check your internet and try again.'); })
      .then(() => { form.style.display = 'none'; document.getElementById(doneId).classList.add('show'); })
      .catch(err => { msg.textContent = err.message; msg.className = 'form-msg err'; btn.disabled = false; btn.textContent = label; });
  });
}
const need = (v, m) => { if (!String(v || '').trim()) throw new Error(m); return String(v).trim(); };`;

const pages = [];

/* ── Schedule ── */
pages.push({
  file: 'view-schedule.html',
  title: 'Schedule | CuePointe',
  desc: 'CuePointe pool knockouts, leagues and championships in Kampala. Venues rotate; each event’s venue is on the schedule and confirmed on WhatsApp.',
  main: `${head('Knockouts · leagues · championships', 'Schedule', 'Venues rotate across Kampala. Each event’s venue and start time are confirmed on WhatsApp before the night.')}
<section class="sec" aria-labelledby="up-title">
  <div class="wrap">
    <h2 class="h2" id="up-title">Coming up</h2>
    <ul class="fixtures" id="up"><li class="empty">Loading…</li></ul>
  </div>
</section>
<section class="sec" aria-labelledby="past-title" id="past-sec" hidden>
  <div class="wrap">
    <h2 class="h2" id="past-title">Past events</h2>
    <ul class="fixtures" id="past"></ul>
  </div>
</section>
<section class="sec">
  <div class="wrap grid2">
    <div class="card-paper">
      <h3>Want in?</h3>
      <p>Register online and we confirm your slot, date and venue on WhatsApp.</p>
      <p style="margin-top:14px"><a class="btn btn-dark" href="register.html">Register to play</a></p>
    </div>
    <div class="card-dark felt">
      <h3>Run a pool hall?</h3>
      <p>Host a CuePointe night at your venue.</p>
      <p style="margin-top:14px"><a class="btn btn-cream" href="venues.html#host">Host a night</a></p>
    </div>
  </div>
</section>`,
  script: `
const { esc } = cp;
const row = (e, past) => \`<li>
  <span class="st \${past ? 'past' : (e.status === 'open' ? 'open' : '')}">\${esc(past ? 'Played' : (e.status === 'open' ? 'Open' : e.status))}</span>
  <div><h3>\${esc(e.title)}</h3><p class="meta">\${esc(e.date || 'Date on WhatsApp')}\${e.venue ? ' · ' + esc(e.venue) : ''}</p></div>
  <span class="fee">\${esc(e.entry || '')}\${e.prize ? '<br>Prize ' + esc(e.prize) : ''}</span>
</li>\`;
cp.getJSON('schedule.json').then(d => {
  const up = cp.upcomingEvents(d);
  const past = (d.events || []).filter(e => !up.includes(e) && e.status !== 'tba');
  document.getElementById('up').innerHTML = up.length ? up.map(e => row(e, false)).join('')
    : '<li class="empty">No dates on the schedule right now. <a class="more" href="https://wa.me/256743482588?text=Hi%20CuePointe%2C%20when%20is%20the%20next%20knockout%3F" target="_blank" rel="noopener">Ask on WhatsApp</a> for the next knockout.</li>';
  if (past.length) { document.getElementById('past').innerHTML = past.map(e => row(e, true)).join(''); document.getElementById('past-sec').hidden = false; }
}).catch(() => { document.getElementById('up').innerHTML = '<li class="empty">The schedule could not load. Please refresh.</li>'; });`
});

/* ── Rankings ── */
pages.push({
  file: 'rankings.html',
  title: 'Player Rankings | CuePointe',
  desc: 'Live CuePointe player ratings from recorded matches. New players start at 1000; beat a higher-rated player and you gain more.',
  css: `.how{margin-top:28px}
.how ol{margin:10px 0 0 20px;color:var(--ink)}
.how li{margin-bottom:6px}
.pname strong{color:#fff;font-weight:800}
.pname span{display:block;font:500 12px var(--mono);color:var(--muted)}`,
  main: `${head('Season 2026', 'Rankings', 'Live from recorded matches. New players start at 1000 points; beat a higher-rated player and you gain more.')}
<section class="sec" aria-labelledby="top-title">
  <div class="wrap">
    <h2 class="h2" id="top-title">Top of the board</h2>
    <div class="board" id="top"><p class="empty">Loading players…</p></div>
  </div>
</section>
<section class="sec" aria-labelledby="all-title">
  <div class="wrap">
    <h2 class="h2" id="all-title">Every ranked player</h2>
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>#</th><th>Player</th><th>Area</th><th class="num">Played</th><th class="num">Won</th><th class="num">Win %</th><th class="num">Rating</th><th>Trait</th></tr></thead>
      <tbody id="rows"><tr><td colspan="8" class="empty">Loading…</td></tr></tbody>
    </table></div>
    <div class="card-paper how">
      <h3>How the rating works</h3>
      <ol>
        <li>Everyone starts at <strong>1000</strong>.</li>
        <li>After every recorded match the winner gains points and the loser loses the same number.</li>
        <li>Beating a stronger player earns more (up to 32 points); beating a weaker one earns fewer (at least 1).</li>
      </ol>
    </div>
  </div>
</section>`,
  script: `
const { esc } = cp;
const rating = p => Math.round(Number(p.rating ?? p.score) || 1000);
const cpid = (p, i) => String(p.id || i + 1).replace(/[^A-Za-z0-9-]/g, '').padStart(4, '0');
const photoOf = p => { const ph = Array.isArray(p.photos) ? p.photos[0] : (p.photos || p.photo); return ph ? String(ph) : ''; };
cp.getJSON('players.json').then(d => {
  const ps = (Array.isArray(d) ? d : (d.players || [])).slice().sort((a, b) => rating(b) - rating(a));
  const card = (p, i) => {
    const ph = photoOf(p);
    return \`<article class="pcard">
      <div class="row"><span class="pos">#\${i + 1}</span><span class="cpid">CP-\${esc(cpid(p, i))}</span></div>
      \${ph ? \`<img class="photo" src="\${esc(ph)}" alt="\${esc(p.name)}" loading="lazy">\` : ''}
      <h3>\${esc(p.name)}</h3><p class="area">\${esc(p.area || 'Kampala')}</p>
      <p class="rating">\${rating(p)}<small>CUEPOINTE RATING</small></p>
      <p class="wl"><span>\${Number(p.events) || 0} played</span><span>\${Number(p.wins) || 0} won</span></p>
      \${p.traits ? \`<span class="trait">\${esc(p.traits)}</span>\` : ''}
    </article>\`;
  };
  const top = ps.slice(0, 3).map(card);
  if (ps.length < 3) top.push(\`<article class="pcard join"><span class="cpid" style="align-self:flex-start">CP-????</span><h3>Your card</h3><p>Play one knockout and you are on the board.</p><a class="btn btn-orange" href="register.html">Register</a></article>\`);
  document.getElementById('top').innerHTML = top.join('');
  document.getElementById('rows').innerHTML = ps.length ? ps.map((p, i) => {
    const ev = Number(p.events) || 0, w = Number(p.wins) || 0;
    return \`<tr><td class="num">\${i + 1}</td><td class="pname"><strong>\${esc(p.name)}</strong><span>CP-\${esc(cpid(p, i))}</span></td>
      <td>\${esc(p.area || '—')}</td><td class="num">\${ev}</td><td class="num">\${w}</td><td class="num">\${ev ? Math.round(w / ev * 100) + '%' : '—'}</td>
      <td class="num">\${rating(p)}</td><td>\${esc(p.traits || '')}</td></tr>\`;
  }).join('') : '<tr><td colspan="8" class="empty">No ranked players yet.</td></tr>';
}).catch(() => { document.getElementById('top').innerHTML = '<p class="empty">Rankings could not load. Please refresh.</p>'; });`
});

/* ── News ── */
pages.push({
  file: 'news.html',
  title: 'News | CuePointe',
  desc: 'CuePointe results, ranking moves and event announcements from Kampala\’s pool knockouts and leagues.',
  css: `.posts{display:grid;gap:22px;max-width:820px}
.post{display:grid;grid-template-columns:200px 1fr;gap:18px;border-top:3px solid var(--orange);padding-top:16px}
.post.noimg{grid-template-columns:1fr}
@media (max-width:640px){.post{grid-template-columns:1fr}}
.post img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px}
.post time,.post .cat{font:500 13px var(--mono);color:var(--muted)}
.post h2{font-variation-settings:'wdth' 78;font-weight:800;font-size:24px;color:#fff;margin:6px 0;line-height:1.15}
.post p{color:#DDE4DF}`,
  main: `${head('Results · rankings · announcements', 'News', 'Match results, ranking moves and what is coming next.')}
<section class="sec">
  <div class="wrap">
    <div class="posts" id="posts"><p class="empty">Loading…</p></div>
  </div>
</section>`,
  script: `
const { esc } = cp;
cp.getJSON('news.json').then(d => {
  const posts = (d.posts || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  document.getElementById('posts').innerHTML = posts.length ? posts.map(p => {
    const img = (p.images || [])[0];
    const when = p.date ? new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return \`<article class="post\${img ? '' : ' noimg'}">
      \${img ? \`<img src="\${esc(img)}" alt="" loading="lazy">\` : ''}
      <div><p><time datetime="\${esc(p.date)}">\${esc(when)}</time>\${p.category ? ' · <span class="cat">' + esc(p.category) + '</span>' : ''}</p>
      <h2>\${esc(p.title)}</h2>\${p.excerpt ? \`<p>\${esc(p.excerpt)}</p>\` : ''}</div>
    </article>\`;
  }).join('') : \`<div class="card-paper"><h2 style="font-variation-settings:'wdth' 75;font-weight:900;font-size:26px;margin-bottom:8px">No news posted yet</h2>
      <p>Match-night results go up on our socials first: <a href="https://www.facebook.com/CuePointe" target="_blank" rel="noopener">Facebook</a> · <a href="https://www.instagram.com/cuepointe" target="_blank" rel="noopener">Instagram</a> · <a href="https://www.tiktok.com/@cuepointe" target="_blank" rel="noopener">TikTok</a>.</p></div>\`;
}).catch(() => { document.getElementById('posts').innerHTML = '<p class="empty">News could not load. Please refresh.</p>'; });`
});

/* ── Venues ── */
pages.push({
  file: 'venues.html',
  title: 'Venues | CuePointe',
  desc: 'CuePointe brings pool knockouts to halls across Kampala. Run a pool hall? Host a CuePointe night.',
  main: `${head('Pool halls across Kampala', 'Venues', 'CuePointe has no single home hall. We take knockouts to pool halls around Kampala, and each event\’s venue is on the schedule.')}
<section class="sec">
  <div class="wrap grid2">
    <div class="card-paper">
      <h2 class="h3">Coming to play?</h2>
      <p>Check the schedule for the next venue, or ask us on WhatsApp.</p>
      <p style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-dark" href="view-schedule.html">See the schedule</a>
      <a class="btn btn-cream" style="border:2px solid var(--ink)" href="https://wa.me/256743482588?text=Hi%20CuePointe%2C%20where%20is%20the%20next%20knockout%3F" target="_blank" rel="noopener">Ask on WhatsApp</a></p>
    </div>
    <div class="card-dark">
      <h2 class="h3">What a CuePointe night needs</h2>
      <p>Pool tables in good condition, room for players to wait their turn, and an evening slot. We bring the bracket, the officiating and the match records.</p>
    </div>
  </div>
</section>
<section class="sec" id="host" aria-labelledby="host-title">
  <div class="wrap grid2" style="align-items:start">
    <div class="prose">
      <h2 class="h2" id="host-title">Host a CuePointe night</h2>
      <p>We run the night: the knockout bracket, the officiating, and recording every match for the player ratings. You provide the tables and the space.</p>
      <p>Tell us about your hall and we will call you to talk dates.</p>
    </div>
    <div class="formcard">
      <form id="venue-form" novalidate>
        <div class="field"><label for="v-name">Your name</label><input type="text" id="v-name" autocomplete="name" maxlength="120" required></div>
        <div class="two">
          <div class="field"><label for="v-venue">Venue name</label><input type="text" id="v-venue" maxlength="160" required></div>
          <div class="field"><label for="v-phone">Phone / WhatsApp</label><input type="tel" id="v-phone" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="07XX XXX XXX" required></div>
        </div>
        <div class="field"><label for="v-area">Area / address</label><input type="text" id="v-area" maxlength="200" placeholder="e.g. Kansanga, near the stage"></div>
        <fieldset class="field">
          <legend>Pool tables</legend>
          <div class="chips">
            <input type="radio" name="tables" id="t1" value="1 table"><label for="t1">1</label>
            <input type="radio" name="tables" id="t2" value="2 tables"><label for="t2">2</label>
            <input type="radio" name="tables" id="t3" value="3 tables"><label for="t3">3</label>
            <input type="radio" name="tables" id="t4" value="4+ tables"><label for="t4">4+</label>
          </div>
        </fieldset>
        <div class="field"><label for="v-notes">Anything else? <span class="opt">(optional)</span></label><textarea id="v-notes" maxlength="2000" placeholder="Best days, opening hours…"></textarea></div>
        <button type="submit" class="btn btn-orange submit">Send venue details</button>
        <p class="form-msg" role="alert"></p>
      </form>
      <div class="done" id="venue-done" role="status" aria-live="polite">
        <p class="kicker">Received</p><h2>Thank you.</h2><p>We will call you on the number you gave to talk about hosting.</p>
      </div>
    </div>
  </div>
</section>`,
  script: `${FORM_JS}
wireForm('venue-form', '/api/venue', f => ({
  name: need(f.querySelector('#v-name').value, 'Please enter your name.'),
  venue: need(f.querySelector('#v-venue').value, 'Please enter the venue name.'),
  phone: need(f.querySelector('#v-phone').value, 'Please enter a phone number.'),
  address: f.querySelector('#v-area').value.trim(),
  tables: (f.querySelector('input[name=tables]:checked') || {}).value || '',
  notes: f.querySelector('#v-notes').value.trim()
}), 'venue-done');`
});

/* ── Contact ── */
pages.push({
  file: 'contact.html',
  title: 'Contact | CuePointe',
  desc: 'Contact CuePointe on WhatsApp, phone or email about playing, sponsorship, hosting a venue or media.',
  css: `.reach li{list-style:none;margin-bottom:12px}
.reach .k{display:block;font:600 12px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft)}
.reach .v{font-size:20px;font-weight:800}`,
  main: `${head('WhatsApp is fastest', 'Contact', 'Questions about playing, sponsorship, hosting a night or media. Message us and the right person replies.')}
<section class="sec">
  <div class="wrap grid2" style="align-items:start">
    <div class="card-paper">
      <ul class="reach">
        <li><span class="k">WhatsApp / call</span><span class="v"><a href="https://wa.me/256743482588" target="_blank" rel="noopener">0743 482 588</a></span></li>
        <li><span class="k">Call</span><span class="v"><a href="tel:+256704100353">0704 100 353</a></span></li>
        <li><span class="k">Email</span><span class="v"><a href="mailto:cuepointe@gmail.com">cuepointe@gmail.com</a></span></li>
        <li><span class="k">Follow</span><span class="v" style="font-size:17px"><a href="https://www.facebook.com/CuePointe" target="_blank" rel="noopener">Facebook</a> · <a href="https://www.instagram.com/cuepointe" target="_blank" rel="noopener">Instagram</a> · <a href="https://www.tiktok.com/@cuepointe" target="_blank" rel="noopener">TikTok</a> · <a href="https://www.youtube.com/channel/UCJs5yTrm9EU0CBG6YOfU3Cw" target="_blank" rel="noopener">YouTube</a></span></li>
      </ul>
    </div>
    <div class="formcard">
      <form id="contact-form" novalidate>
        <fieldset class="field">
          <legend>About</legend>
          <div class="chips c3">
            <input type="radio" name="subject" id="c1" value="Playing" checked><label for="c1">Playing</label>
            <input type="radio" name="subject" id="c2" value="Sponsorship"><label for="c2">Sponsorship</label>
            <input type="radio" name="subject" id="c3" value="Hosting a venue"><label for="c3">Hosting</label>
            <input type="radio" name="subject" id="c4" value="Media"><label for="c4">Media</label>
            <input type="radio" name="subject" id="c5" value="Other"><label for="c5">Other</label>
          </div>
        </fieldset>
        <div class="two">
          <div class="field"><label for="m-name">Your name</label><input type="text" id="m-name" autocomplete="name" maxlength="120" required></div>
          <div class="field"><label for="m-phone">Phone / WhatsApp</label><input type="tel" id="m-phone" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="07XX XXX XXX" required></div>
        </div>
        <div class="field"><label for="m-email">Email <span class="opt">(optional)</span></label><input type="email" id="m-email" autocomplete="email" maxlength="160"></div>
        <div class="field"><label for="m-msg">Message</label><textarea id="m-msg" maxlength="3000" required></textarea></div>
        <button type="submit" class="btn btn-orange submit">Send message</button>
        <p class="form-msg" role="alert"></p>
      </form>
      <div class="done" id="contact-done" role="status" aria-live="polite">
        <p class="kicker">Message received</p><h2>Thank you.</h2><p>We will reply on WhatsApp or by email.</p>
      </div>
    </div>
  </div>
</section>`,
  script: `${FORM_JS}
wireForm('contact-form', '/api/contact', f => ({
  origin: 'contact',
  subject: (f.querySelector('input[name=subject]:checked') || {}).value || '',
  name: need(f.querySelector('#m-name').value, 'Please enter your name.'),
  phone: need(f.querySelector('#m-phone').value, 'Please enter your phone or WhatsApp number.'),
  email: f.querySelector('#m-email').value.trim(),
  message: need(f.querySelector('#m-msg').value, 'Please write a message.')
}), 'contact-done');`
});

/* ── About ── */
pages.push({
  file: 'about.html',
  title: 'About | CuePointe',
  desc: 'CuePointe started in Kabalagala, Kansanga and along Ggaba Road to give Kampala\’s pool players an organised, fair stage with a public rating.',
  css: `.values{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
@media (max-width:860px){.values{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.values{grid-template-columns:1fr}}
.values h3{font-size:20px}
.founder .role{font:600 13px var(--mono);color:var(--orange-ink);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;align-items:start}
.gallery figure{margin:0;background:#0B1F18;border:1px solid rgba(255,255,255,.12);border-radius:12px;overflow:hidden}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.gallery figcaption{padding:10px 14px;color:var(--muted);font-size:15px}
.gallery figure:first-child{grid-column:span 2}
@media (max-width:640px){.gallery figure:first-child{grid-column:auto}}
.partners{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.partner{display:flex;flex-direction:column;background:var(--paper);color:var(--ink);border-radius:12px;padding:20px;text-decoration:none;border:2px solid transparent;transition:border-color .2s}
a.partner:hover,a.partner:focus-visible{border-color:var(--orange)}
.partner .plogo{height:72px;display:flex;align-items:center;margin-bottom:14px}
.partner .plogo img{max-height:72px;max-width:180px;object-fit:contain}
.partner h3{font-variation-settings:'wdth' 75;font-weight:900;font-size:22px;line-height:1.1}
.partner p{font-size:15px;color:var(--ink-soft);margin-top:6px;flex:1}
.partner .visit{font:600 13px var(--mono);color:var(--orange-ink);margin-top:12px}`,
  main: `${head('Who we are', 'About CuePointe', 'An organised stage for Kampala\’s pool players, with every match on the record.')}
<section class="sec">
  <div class="wrap grid2" style="align-items:start">
    <div class="prose">
      <h2 class="h2">Where it started</h2>
      <p>Pool has long been a favourite pastime for young people in Kampala. But it stayed informal: few organised competitions, no records, and no way for a good player to be noticed beyond their own neighbourhood.</p>
      <p>CuePointe started in Kabalagala, Kansanga and along Ggaba Road with one idea: every player deserves a fair, organised stage.</p>
      <p>We run knockouts and leagues, record every match, and keep a public rating for every player, so progress is earned at the table and visible to everyone.</p>
    </div>
    <div class="card-paper founder">
      <p class="role">Founder &amp; Director</p>
      <h3>Otieno Thomas</h3>
      <p>Brand strategist and market developer. Leads CuePointe's events, partnerships and player mobilisation.</p>
    </div>
  </div>
</section>
<section class="sec" aria-labelledby="gallery-title" id="gallery-sec" hidden>
  <div class="wrap">
    <h2 class="h2" id="gallery-title">On the table</h2>
    <div class="gallery" id="gallery"></div>
  </div>
</section>
<section class="sec" aria-labelledby="values-title">
  <div class="wrap">
    <h2 class="h2" id="values-title">What we hold to</h2>
    <div class="values">
      <div class="card-dark"><h3>Integrity</h3><p>Fairness and honest conduct, on and off the table.</p></div>
      <div class="card-dark"><h3>Community</h3><p>Strength through taking part together, open to everyone.</p></div>
      <div class="card-dark"><h3>Opportunity</h3><p>Doors open for talent, whatever a player's background.</p></div>
      <div class="card-dark"><h3>Accountability</h3><p>Public results and a public <a class="more" href="talent-fund.html">fund ledger</a>.</p></div>
    </div>
  </div>
</section>
<section class="sec" aria-labelledby="partners-title" id="partners-sec" hidden>
  <div class="wrap">
    <h2 class="h2" id="partners-title">Our partners</h2>
    <div class="partners" id="partners"></div>
  </div>
</section>
<section class="sec">
  <div class="wrap grid2">
    <div class="card-dark felt">
      <h3>Partner with CuePointe</h3>
      <p>Sponsors and pool halls make the knockouts possible. Tell us how you would like to be involved.</p>
      <p style="margin-top:14px"><a class="btn btn-cream" href="contact.html">Talk to us</a></p>
    </div>
    <div class="card-paper">
      <h3>Play with us</h3>
      <p>Register online and your player card starts at 1000.</p>
      <p style="margin-top:14px"><a class="btn btn-dark" href="register.html">Register to play</a></p>
    </div>
  </div>
</section>`,
  script: `
const { esc } = cp;
const OWN = /^(media|images)\\/[A-Za-z0-9/_.-]{1,200}$/;
const WEB = /^https?:\\/\\/[^\\s"'<>]{3,300}$/i;
cp.getJSON('about.json').then(d => {
  const photos = (d.photos || []).filter(p => OWN.test(String(p.src || '')));
  if (photos.length) {
    document.getElementById('gallery').innerHTML = photos.map(p => \`<figure>
      <img src="\${esc(p.src)}" alt="\${esc(p.caption || 'CuePointe match night')}" loading="lazy">
      \${p.caption ? \`<figcaption>\${esc(p.caption)}</figcaption>\` : ''}
    </figure>\`).join('');
    document.getElementById('gallery-sec').hidden = false;
  }
  const partners = (d.partners || []).filter(p => p && p.name);
  if (partners.length) {
    document.getElementById('partners').innerHTML = partners.map(p => {
      const url = WEB.test(String(p.url || '')) ? String(p.url) : '';
      const logo = OWN.test(String(p.logo || '')) ? String(p.logo) : '';
      const inner = \`\${logo ? \`<div class="plogo"><img src="\${esc(logo)}" alt="\${esc(p.name)} logo" loading="lazy"></div>\` : ''}
        <h3>\${esc(p.name)}</h3>\${p.blurb ? \`<p>\${esc(p.blurb)}</p>\` : '<p></p>'}
        \${url ? \`<span class="visit">Visit \${esc(url.replace(/^https?:\\/\\/(www\\.)?/i, '').replace(/\\/$/, ''))} ↗</span>\` : ''}\`;
      return url ? \`<a class="partner" href="\${esc(url)}" target="_blank" rel="noopener">\${inner}</a>\` : \`<div class="partner">\${inner}</div>\`;
    }).join('');
    document.getElementById('partners-sec').hidden = false;
  }
}).catch(() => {});`
});

/* ── Talent Fund ── */
pages.push({
  file: 'talent-fund.html',
  title: 'Talent Fund | CuePointe',
  desc: 'The CuePointe Talent Fund ledger: every contribution received and every payout made, listed in public.',
  css: `.totals{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
@media (max-width:640px){.totals{grid-template-columns:1fr}}
.totals .card-paper .k{font:600 12px var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft)}
.totals .card-paper .v{font:600 28px var(--mono);color:var(--ink);margin-top:6px}
.in{color:var(--ok)} .out{color:#FF9B85}`,
  main: `${head('In public, as it happens', 'Talent Fund', 'Every contribution received and every payout made to players, venues and youth programmes is listed here.')}
<section class="sec">
  <div class="wrap">
    <div class="totals" id="totals" hidden>
      <div class="card-paper"><p class="k">Received</p><p class="v" id="t-in">–</p></div>
      <div class="card-paper"><p class="k">Paid out</p><p class="v" id="t-out">–</p></div>
      <div class="card-paper"><p class="k">Balance</p><p class="v" id="t-bal">–</p></div>
    </div>
    <h2 class="h2">Ledger</h2>
    <div id="ledger"><p class="empty">Loading…</p></div>
  </div>
</section>
<section class="sec">
  <div class="wrap">
    <div class="card-dark felt">
      <h3>Back the fund</h3>
      <p>Contributions go to prize money, equipment and access for new players, and every shilling appears in the ledger above.</p>
      <p style="margin-top:14px"><a class="btn btn-cream" href="contact.html">Talk to us about sponsoring</a></p>
    </div>
  </div>
</section>`,
  script: `
const { esc } = cp;
const ugx = n => 'UGX ' + Math.round(Number(n) || 0).toLocaleString('en-UG');
cp.getJSON('fund.json').then(d => {
  const es = (d.entries || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!es.length) {
    document.getElementById('ledger').innerHTML = '<div class="card-paper"><h3>The ledger is open</h3><p>The first contribution or payout will appear here, with its date, purpose and amount.</p></div>';
    return;
  }
  const inn = es.filter(e => e.type === 'in' && e.status !== 'pending').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const out = es.filter(e => e.type === 'out' && e.status === 'disbursed').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  document.getElementById('t-in').textContent = ugx(inn);
  document.getElementById('t-out').textContent = ugx(out);
  document.getElementById('t-bal').textContent = ugx(inn - out);
  document.getElementById('totals').hidden = false;
  document.getElementById('ledger').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>What for</th><th>Programme</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>' +
    es.map(e => \`<tr><td class="num" style="text-align:left">\${esc(e.date)}</td><td>\${esc(e.desc)}\${e.sub ? '<br><span style="color:var(--muted);font-size:13px">' + esc(e.sub) + '</span>' : ''}</td>
      <td>\${esc(e.program || '')}</td><td class="num \${e.type === 'in' ? 'in' : 'out'}">\${e.type === 'in' ? '+' : '−'} \${esc(ugx(e.amount))}</td><td>\${esc(e.status || '')}</td></tr>\`).join('') +
    '</tbody></table></div>';
}).catch(() => { document.getElementById('ledger').innerHTML = '<p class="empty">The ledger could not load. Please refresh.</p>'; });`
});

for (const p of pages) {
  fs.writeFileSync(path.join(OUT, p.file), page(p));
  console.log('wrote', p.file);
}

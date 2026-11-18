# CuePointe Action Pool 🎱
**Uganda's #1 Youth Cue-Sports Platform**

> Structured leagues. Digital rankings. Real pathways for talent — from Kabalagala to the world.

🌐 **Live Site:** [cuepointe.vercel.app](https://cuepointe.vercel.app)
📍 **Base:** Kabalagala, Kampala, Uganda
📧 **Email:** cuepointe@gmail.com
📱 **WhatsApp:** +256 743 482 588

---

## What is CuePointe?

CuePointe Action Pool is Uganda's first integrated youth cue-sports platform. Founded in the vibrant urban hubs of Kabalagala and Kansanga, we have transformed a traditional neighbourhood pastime into a structured, data-driven career path for emerging talent.

We run weekly knockouts, seasonal leagues, and community tournaments across Kampala — with digital player rankings, talent tracking, and transparent prize pools.

---

## Site Structure

```
cuepointe.vercel.app/
│
├── index.html              # Homepage — hero slideshow, schedule, rankings, registration
├── about.html              # Our story, team, partners & sponsors
├── rankings.html           # Live player rankings with photo slideshows
├── register.html           # Player registration form
├── news.html               # News & updates
├── venues.html             # Venue listings & host application
├── contact.html            # Contact form & info
├── talent-fund.html        # Talent fund transparency dashboard
├── view-schedule.html      # Tournament schedule feed
│
├── admin.html              # 🔑 Admin panel — update everything from your browser/phone
│
├── players.json            # Player data — rankings source of truth
├── matches.json            # Match ledger — every recorded result (drives Elo ratings)
├── schedule.json           # Tournament schedule — homepage tabs + schedule page
├── news.json               # News & updates posts
├── fund.json               # Talent fund ledger + headline stats
│
├── update_rankings.py      # (Legacy) CLI tool to add/update player entries
├── add_player.py           # (Legacy) CLI tool to add a new player
├── record_match.py         # (Legacy) CLI tool to record match results
│
├── CuePointe_Logo.jpg      # Brand logo
├── favicon.ico             # Favicon
├── robots.txt              # SEO crawler rules
├── sitemaps.xml            # XML sitemap
├── site.webmanifest        # PWA manifest
│
└── images/                 # All media assets
    ├── hero-1.jpg          # Homepage hero slideshow (hero-1 to hero-5)
    ├── hero-2.jpg
    ├── hero-3.jpg
    ├── hero-4.jpg
    ├── hero-5.jpg
    ├── about/              # About page story images & videos
    ├── team/               # Staff & team member photos
    ├── partners/           # Partner & sponsor logos
    ├── players/            # Player profile photos
    └── videos/             # Short video clips (MP4)
```

---

## How to Update Content — Admin Panel (recommended)

Open **`https://cuepointe.vercel.app/admin.html`** on any device.

Sign in with your admin **email and password**. No GitHub token is needed any more.

**One-time setup (first admin only):**
1. In Vercel → project `cuepointe` → Settings → Environment Variables, add
   `ADMIN_SETUP_CODE` (type *Sensitive*, Production) with a phrase of at least 8 characters
   that only you know. Redeploy.
2. Open the admin page. It shows **Create Admin Account**. Enter the setup code, your email
   and a password of at least 10 characters.
3. Setup switches itself off once an admin exists. You can then delete `ADMIN_SETUP_CODE`.

From the admin panel you can:

| Tab | What it does |
|-----|--------------|
| **Inbox** | Every registration, contact message and venue application, with status (new → contacted → confirmed / paid → archived), payment screenshots and CSV export |
| **Players** | Add / edit / remove players (name, area, traits, photos) |
| **Record Match** | Log a result — ratings (Elo), events & wins update automatically (match and ratings save together) |
| **Schedule** | Add / edit tournaments — homepage tabs, schedule page and the registration dropdowns update |
| **News** | Publish news posts — featured story, grid, and sidebar all update |
| **Talent Fund** | Add ledger entries — totals on the fund page are computed automatically |
| **Photos** | Upload player/team/partner/news images to Vercel Blob; paste the returned `media/...` path |

Saves go live within about 10 seconds. If two people edit the same section at once, the second
save is refused and the page reloads the latest data, so nothing is silently overwritten.

## How the data works

| Record | Stored in | Public URL |
|--------|-----------|------------|
| Registrations, contact messages, venue applications | Neon Postgres tables | none (admin only) |
| Payment screenshots | Vercel Blob, private | none (admin only) |
| Players, matches, schedule, news, fund | Neon Postgres (`documents` table) | `/players.json`, `/matches.json`, `/schedule.json`, `/news.json`, `/fund.json` |
| Admin-uploaded photos | Vercel Blob | `/media/...` |

- The API lives in `api/` (Vercel Functions) with shared code in `lib/`.
- Tables are created automatically on the first request after a deploy.
- `data/seed/*.json` is only the starting data. It is copied into the database once, and editing
  these files later changes nothing. Use the admin panel.
- Environment variables: `DATABASE_URL` (added by the Neon integration), `BLOB_READ_WRITE_TOKEN`
  (added by the Blob store), `ADMIN_SETUP_CODE` (first setup only). Never put any of them in code.

### Player record format

A player object looks like:

```json
{
  "id": "0001",
  "name": "Player Name",
  "area": "Kabalagala",
  "events": 10,
  "wins": 7,
  "rating": 1024,
  "traits": "Strong Breaker",
  "badges": [],
  "photos": ["images/players/0001a.jpg", "images/players/0001b.jpg"]
}
```

> Note: `rating` replaces the old hand-typed `score`. Numbers are stored as
> numbers (not strings). New players start at **1000** and move with each
> recorded match result.

---

### Add Story Images / Videos (About Page)

Upload files to `images/about/` with these names:

| File | Purpose |
|------|---------|
| `story-1.jpg` or `story-1.mp4` | Story slideshow slide 1 |
| `story-2.jpg` or `story-2.mp4` | Story slideshow slide 2 |
| `story-3.jpg` or `story-3.mp4` | Story slideshow slide 3 |

Then in `about.html`, replace the placeholder `<div>` inside each slide with:

```html
<!-- For a photo -->
<img src="images/about/story-1.jpg" alt="CuePointe Story">

<!-- For a video -->
<video autoplay muted loop playsinline>
  <source src="images/about/story-1.mp4" type="video/mp4">
</video>
```

---

### Add Team Members (About Page)

Upload photo to `images/team/member-1.jpg` then in `about.html` update the relevant team card:

```html
<div class="team-name">Thomas Otieno</div>
<div class="team-role">Founder & Director</div>
<div class="team-bio">Your bio text here.</div>
```

Duplicate a full `team-card` block to add more members.

---

### Add Partners & Sponsors (About Page)

Upload logo to `images/partners/partner-1.png` then in `about.html` update:

```html
<div class="partner-name">Company Name</div>
<div class="partner-type">Gold Sponsor</div>
<div class="partner-desc">Description of the partnership.</div>
```

Tier options: `Gold Sponsor` · `Silver Sponsor` · `Bronze Sponsor` · `Community Partner`

---

### Add Videos (Homepage)

Upload MP4 clips to `images/videos/` or use YouTube embed codes.

In `index.html`, find the video slot divs and replace the placeholder with:

```html
<!-- MP4 option -->
<video autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover">
  <source src="images/videos/highlight-1.mp4" type="video/mp4">
</video>

<!-- YouTube option -->
<iframe style="width:100%;height:100%;border:none"
  src="https://www.youtube.com/embed/YOUR_VIDEO_ID?rel=0"
  allowfullscreen>
</iframe>
```

---

### Update Hero Slideshow (Homepage)

Replace `images/hero-1.jpg` through `images/hero-5.jpg` with new images. Recommended size: **1920×1080px**, JPEG at 80% quality.

---

## Player Data Fields (`players.json`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique CP-ID e.g. `"0001"` |
| `name` | string | Full player name |
| `area` | string | Neighbourhood / area |
| `events` | number | Total events played (auto-updated by admin) |
| `wins` | number | Total wins (auto-updated by admin) |
| `rating` | number | Elo rating — starts at 1000, moves with each match |
| `traits` | string | Badge e.g. `"Strong Breaker"` |
| `badges` | array | Achievement emoji e.g. `["⚡","🎯"]` |
| `photos` | array | Paths to profile photos (slideshow) |

---

## Social & Contact

| Platform | Link |
|----------|------|
| 🌐 Website | [cuepointe.vercel.app](https://cuepointe.vercel.app) |
| 📘 Facebook | [facebook.com/CuePointe](https://www.facebook.com/CuePointe) |
| 📸 Instagram | [instagram.com/cuepointe](https://www.instagram.com/cuepointe) |
| 🎵 TikTok | [tiktok.com/@cuepointe](https://www.tiktok.com/@cuepointe) |
| ▶ YouTube | [CuePointe Channel](https://www.youtube.com/channel/UCJs5yTrm9EU0CBG6YOfU3Cw) |
| 📝 Blog | [cuepointe.blogspot.com](https://cuepointe.blogspot.com) |

---

## Tech Stack

- Pure **HTML5 / CSS3 / Vanilla JavaScript** pages — no frameworks, no build step
- Hosted on **Vercel** (project `cuepointe`, production branch `New-Test`) with security headers in `vercel.json`
- **Vercel Functions** (`api/`) for forms, admin sign-in and content
- **Neon Postgres** (Vercel Marketplace, free plan) for all records
- **Vercel Blob** (private store `cuepointe-uploads`) for payment screenshots and photos
- Google Analytics via **GA4** (`G-221BNVJR22`)

---

## License

© 2026 CuePointe Action Pool · Kampala, Uganda · All Rights Reserved.

This repository contains the official CuePointe website. Content, branding, and media are proprietary and may not be reproduced without permission.

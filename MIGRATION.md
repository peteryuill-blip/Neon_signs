# NEON SIGNS — Migration & Deployment Guide

This document covers everything needed to run NEON SIGNS outside of the Manus platform.

---

## What Changed from the Manus Version

| Component | Before (Manus) | After (Portable) |
|---|---|---|
| Authentication | Manus OAuth (external login portal) | Local password via bcrypt + JWT |
| File storage | Manus Forge S3 proxy | Cloudflare R2 (S3-compatible) |
| LLM | Manus Forge API | OpenAI API (`OPENAI_API_KEY`) |
| Image generation | Manus Forge ImageService | OpenAI DALL-E 3 |
| Notifications | Manus Forge push service | Logged to stdout (stub) |
| Maps | Manus Forge proxy | Direct Google Maps API |
| Database | Manus-managed TiDB | Any MySQL 8+ / TiDB |

---

## Prerequisites

- Node.js 22+
- pnpm 10+
- A MySQL 8+ or TiDB database
- A Cloudflare account with R2 enabled

---

## Step 1 — Set Admin Password

Generate a bcrypt hash for your admin password:

```bash
node scripts/hash-password.mjs
```

Copy the output hash — you will need it as `ADMIN_PASSWORD_HASH`.

---

## Step 2 — Configure Environment Variables

Copy `env.template` to `.env` and fill in all values:

```bash
cp env.template .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | 64-char random string for session signing |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash from Step 1 |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name (e.g. `neon-signs`) |
| `R2_PUBLIC_URL` | Public URL for the bucket |

Optional variables:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | For LLM and image generation features |
| `GOOGLE_MAPS_API_KEY` | For map features |
| `PORT` | Server port (default: 3000) |

---

## Step 3 — Set Up the Database

Run the Drizzle migrations to create all tables:

```bash
pnpm db:push
```

Then import your data from the SQL backup:

```bash
mysql -h HOST -u USER -p DATABASE < database_backup_2026-03-21.sql
```

---

## Step 4 — Set Up Cloudflare R2

1. Go to Cloudflare Dashboard → R2 → Create bucket → name it `neon-signs`
2. Enable **Public access** on the bucket (or configure a custom domain)
3. Go to **Manage R2 API tokens** → Create token with **Object Read & Write** permissions
4. Copy the **Access Key ID** and **Secret Access Key** into your env file
5. Upload your images to R2:

```bash
# Install AWS CLI or use rclone
aws s3 cp image_export/works/ s3://neon-signs/neon-signs/works/ \
  --recursive \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

aws s3 cp image_export/materials/ s3://neon-signs/neon-signs/materials/ \
  --recursive \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

6. After uploading, update the `photoUrl` column in `works_core` and `materials` to point to your R2 public URL. A helper script is provided:

```bash
node scripts/update-photo-urls.mjs \
  --old-prefix "https://OLD_MANUS_URL" \
  --new-prefix "https://pub-xxxx.r2.dev/neon-signs"
```

---

## Step 5 — Run Locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and log in with your admin password.

---

## Step 6 — Deploy to Railway

### Option A: GitHub Integration (recommended)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `peteryuill-blip/Neon_signs`
3. Railway will detect `railway.toml` and use the Dockerfile automatically
4. Add all environment variables in the Railway dashboard under **Variables**
5. Click **Deploy**

### Option B: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

### Required Railway Variables

Set all variables from Step 2 in the Railway dashboard. Railway automatically sets `PORT` — do not override it.

---

## Step 7 — Verify

After deployment, visit your Railway URL and:

1. Go to `/login` and sign in with your admin password
2. Check the Works page loads all 126 trials
3. Upload a new trial photo and verify it saves to R2
4. Check the Command Center analytics loads correctly

---

## Restoring Notifications

The notification system currently logs to stdout only. To restore real notifications, replace `notifyOwner()` in `server/_core/notification.ts` with one of:

- **Email:** [Resend](https://resend.com) — `npm install resend`
- **Slack:** Incoming Webhooks — `fetch(SLACK_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text }) })`
- **Telegram:** Bot API — `fetch('https://api.telegram.org/bot{TOKEN}/sendMessage', ...)`
- **Ntfy:** `fetch('https://ntfy.sh/your-topic', { method: 'POST', body: content })`

---

## Troubleshooting

**Login fails with "Auth not configured"**
→ `ADMIN_PASSWORD_HASH` is not set or is empty. Run `node scripts/hash-password.mjs` and set the output.

**Images not loading after migration**
→ The `photoUrl` values in the database still point to Manus S3. Run `scripts/update-photo-urls.mjs` to update them.

**"R2 credentials missing" error**
→ Check `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` are all set.

**Database connection fails**
→ Ensure `DATABASE_URL` includes SSL params for TiDB: `?ssl={"rejectUnauthorized":true}`

---

## Data Files

| File | Description |
|---|---|
| `database_backup_2026-03-21.sql` | Full SQL dump of all 13 tables |
| `data_export/*.csv` | Per-table CSV exports |
| `image_export/manifest.json` | Image inventory with original S3 URLs |
| `image_export/works/` | 126 work photos (not in git — download from Manus or use manifest) |
| `image_export/materials/` | 16 material photos |
| `image_export.zip` | Zipped archive of all images |

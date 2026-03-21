# NEON SIGNS — Site Architecture Reference

**Project:** NEON SIGNS — The Mirror That Glows  
**Owner:** Peter Yuill  
**Domains:** peter-yuill.com · neonsigns.manus.space  
**Purpose:** Personal practice-tracking tool for a year-long visual art project ("The Crucible Year"). Tracks weekly studio roundups, individual material trials, materials library, pattern analysis against a historical archive, and a contact log.

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.x |
| Frontend routing | Wouter | 3.x |
| UI components | shadcn/ui + Radix UI | — |
| Styling | Tailwind CSS | 4.x |
| Charts | Recharts | 2.x |
| Animation | Framer Motion | 12.x |
| API layer | tRPC | 11.x |
| Server framework | Express | 4.x |
| Database ORM | Drizzle ORM | 0.44.x |
| Database | MySQL / TiDB | — |
| Auth | Manus OAuth (JWT cookies) | — |
| File storage | S3-compatible (via Manus Forge proxy) | — |
| LLM integration | Manus Forge LLM API | — |
| Build tool | Vite | 7.x |
| Runtime | Node.js (ESM) | — |
| Package manager | pnpm | 10.x |
| Testing | Vitest | 2.x |
| Language | TypeScript | 5.9 |

The application is a **monorepo** with a shared `drizzle/schema.ts` providing end-to-end types. All API traffic flows through tRPC at `/api/trpc`. Authentication is handled by Manus OAuth; sessions are stored as signed JWT cookies.

---

## 2. Repository Structure

```
neon-signs/
├── client/
│   ├── index.html
│   ├── public/               ← Static assets (served at /)
│   └── src/
│       ├── App.tsx           ← Route definitions
│       ├── main.tsx          ← React entry point + providers
│       ├── index.css         ← Global CSS variables and Tailwind theme
│       ├── components/
│       │   ├── BottomNav.tsx        ← Persistent mobile bottom navigation
│       │   ├── ErrorBoundary.tsx
│       │   └── ui/                  ← shadcn/ui component library
│       ├── contexts/
│       │   └── ThemeContext.tsx
│       ├── hooks/
│       │   └── usePersistFn.ts
│       ├── lib/
│       │   ├── trpc.ts       ← tRPC client binding
│       │   └── utils.ts
│       └── pages/            ← Page-level components (see §4)
├── drizzle/
│   ├── schema.ts             ← Single source of truth for all DB types
│   ├── relations.ts
│   └── meta/                 ← Migration snapshots (0000–0022)
├── server/
│   ├── _core/                ← Framework plumbing (do not edit)
│   │   ├── context.ts        ← tRPC context builder (injects ctx.user)
│   │   ├── env.ts            ← Typed environment variable access
│   │   ├── imageGeneration.ts
│   │   ├── llm.ts            ← invokeLLM() helper
│   │   ├── notification.ts   ← notifyOwner() helper
│   │   ├── oauth.ts          ← Manus OAuth callback handler
│   │   ├── trpc.ts           ← publicProcedure / protectedProcedure
│   │   └── voiceTranscription.ts
│   ├── db/                   ← Modular query helpers
│   │   ├── analytics.ts
│   │   ├── archive.ts
│   │   ├── common.ts
│   │   ├── materials.ts
│   │   ├── roundups.ts
│   │   ├── settings.ts
│   │   ├── users.ts
│   │   └── works.ts
│   ├── db.ts                 ← Re-exports all db helpers
│   ├── routers.ts            ← All tRPC procedures (see §5)
│   ├── storage.ts            ← storagePut() / storageGet() S3 helpers
│   ├── uploadPhoto.ts        ← Photo upload + thumbnail generation
│   ├── generateThumbnail.ts
│   └── csv-helpers.ts        ← CSV export builder
├── shared/
│   ├── types.ts              ← Re-exports all schema types
│   ├── const.ts
│   ├── imageOptimization.ts
│   └── naturalSort.ts
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 3. Database Schema

All tables use MySQL/TiDB with Drizzle ORM. All timestamps are stored as UTC. The database is accessed only from server-side tRPC procedures.

### 3.1 `users`

Core auth table, populated by Manus OAuth.

| Column | Type | Notes |
|---|---|---|
| id | int PK autoincrement | |
| openId | varchar(64) unique | Manus OAuth subject |
| name | text | |
| email | varchar(320) | |
| loginMethod | varchar(64) | |
| role | enum('user','admin') | default 'user' |
| createdAt | timestamp | |
| updatedAt | timestamp | auto-updated |
| lastSignedIn | timestamp | |

### 3.2 `weekly_roundups`

One or more entries per week per user. Supports multiple check-ins within a single week (`entryNumber` 1–7).

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int FK → users | |
| weekNumber | int | 0–52 |
| year | int | |
| entryNumber | int | 1–7, multiple per week |
| weatherReport | text | |
| studioHours | float | |
| worksMade | text | |
| jesterActivity | int | 0–10 scale |
| energyLevel | enum | 'hot' \| 'sustainable' \| 'depleted' |
| walkingEngineUsed | boolean | |
| walkingInsights | text | nullable |
| partnershipTemperature | text | |
| thingWorked | text | |
| thingResisted | text | |
| somaticState | text | |
| doorIntention | text | nullable |
| worksData | json | `WorkEntry[]` — structured works summary |
| dailySteps | json | `{mon,tue,wed,thu,fri,sat,sun}` |
| weeklyStepTotal | int | calculated |
| dailyStepAverage | int | calculated |
| city | varchar(100) | for weather lookup |
| weatherData | json | `WeatherData` object |
| quickNotes | json | `QuickNoteSnapshot[]` — notes collected that week |
| phaseDnaAssigned | varchar(32) | AI-assigned phase tag |
| createdDayOfWeek | varchar(16) | |
| updatedAt | timestamp | |

**Embedded JSON types:**

`WorkEntry`: `{ id, workTitle?, medium, emotionalTemp, started, finished, abandoned, keyInquiry, technicalNote?, abandonmentReason? }`

`WeatherData`: `{ temp, feelsLike, humidity, conditions, icon, fetchedAt }`

`QuickNoteSnapshot`: `{ id, content, createdAt }`

### 3.3 `archive_entries`

Historical journal entries imported from prior practice phases, used for pattern matching against current roundups.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| sourcePhase | varchar(16) | PH1, PH2, PH2A, PH3, PH3A, PH4, PH4A, NE |
| sourceDate | timestamp | |
| content | text | |
| phraseTags | json | `string[]` — extracted key phrases |
| emotionalStateTag | varchar(64) | |
| phaseDnaTag | varchar(32) | |
| createdAt | timestamp | |

### 3.4 `pattern_matches`

Links a current week's roundup to matched archive entries.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| currentWeekId | int FK → weekly_roundups | |
| matchedArchiveId | int FK → archive_entries | |
| matchType | enum | 'phrase' \| 'emotional' \| 'phase-dna' |
| relevanceScore | int | 0–100 |
| matchedPhrase | text | nullable |
| createdAt | timestamp | |

### 3.5 `user_settings`

One row per user. Configures the Crucible Year timeline.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int unique FK → users | |
| crucibleStartDate | timestamp | Week 0 start (default: 2025-12-21 Bangkok) |
| checkInDay | enum | day of week, default 'Sunday' |
| timezone | varchar(64) | default 'Asia/Bangkok' |
| currentCycle | int | default 1 |
| createdAt / updatedAt | timestamp | |

### 3.6 `quick_notes`

Scratchpad notes captured during the week. Cleared after being included in a roundup.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int FK → users | |
| content | text | |
| createdAt | timestamp | |
| usedInRoundupId | int | nullable FK → weekly_roundups |

### 3.7 `materials`

The materials library — surfaces, mediums, and tools used in artwork trials.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int FK → users | |
| materialId | varchar(32) unique | Auto-generated system code: S_001, M_001, T_001 |
| materialType | enum | 'Surface' \| 'Medium' \| 'Tool' |
| code | varchar(32) | User-defined code: S4, MB1, T2 |
| displayName | varchar(100) | |
| brand | varchar(100) | |
| specs | text | |
| size | varchar(100) | |
| purchaseLocation | varchar(200) | |
| cost | varchar(50) | |
| notes | text | |
| aliases | json | `string[]` |
| firstUsedDate | timestamp | |
| usedInWorksCount | int | incremented on use |
| photoUrl | varchar(500) | S3 URL |
| photoKey | varchar(500) | S3 key |
| **Surface-specific** | | |
| reactivityProfile | enum | Stable \| Responsive \| Volatile \| Chaotic |
| edgeBehavior | enum | Sharp \| Feathered \| Blooming \| Fractured |
| absorptionCurve | enum | Immediate \| Delayed \| Variable |
| consistencyPattern | enum | Reliable \| Variable \| Glitch_Prone |
| practiceRole | enum | Final_Work \| Exploration \| Anxiety_Discharge \| Conditioning |
| **Medium-specific** | | |
| viscosityBand | enum | Thin \| Balanced \| Dense |
| chromaticForce | enum | Muted \| Balanced \| Aggressive |
| reactivationTendency | enum | Low \| Medium \| High |
| forgivenessWindow | enum | Narrow \| Medium \| Wide |
| dilutionSensitivity | enum | Low \| Medium \| High |
| sedimentationBehavior | enum | Stable \| Variable |
| **Tool-specific** | | |
| contactMode | enum | Direct \| Indirect \| Mediated \| Mechanical |
| controlBias | enum | Precision \| Balanced \| Chaos |
| repeatability | enum | High \| Medium \| Low |
| createdAt / updatedAt | timestamp | |

### 3.8 `works_core`

Individual material trial records — the core unit of the Crucible system.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int FK → users | |
| code | varchar(16) unique | Auto-generated: T_001, T_002… |
| date | timestamp | |
| technicalIntent | varchar(140) | Pre-action hypothesis |
| discovery | varchar(280) | Post-action observation |
| rating | int | 1–5 (Material Test → Breakthrough) |
| disposition | enum | Trash \| Probably_Trash \| Save_Archive \| Save_Has_Potential |
| heightCm | float | |
| widthCm | float | |
| hours | float | |
| photoUrl | text | S3 URL |
| photoKey | varchar(256) | S3 key |
| photoThumbnail | longtext | Base64 thumbnail for fast display |
| sessionId | int | nullable, reserved |
| createdAt / updatedAt | timestamp | |

### 3.9 Junction Tables

Materials are attached to works and presets via many-to-many junction tables.

| Table | Columns | Purpose |
|---|---|---|
| `work_surfaces` | workId, surfaceId | Surfaces used in a trial |
| `work_mediums` | workId, mediumId | Mediums used in a trial |
| `work_tools` | workId, toolId | Tools used in a trial |
| `preset_surfaces` | presetId, surfaceId | Surfaces in an intake preset |
| `preset_mediums` | presetId, mediumId | Mediums in an intake preset |
| `preset_tools` | presetId, toolId | Tools in an intake preset |

### 3.10 `intake_presets`

Saved material combinations for fast trial logging.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int FK → users | |
| name | varchar(100) | e.g., "Sumi + Rice Paper" |
| description | text | |
| sortOrder | int | custom ordering |
| createdAt / updatedAt | timestamp | |

### 3.11 `contacts`

Simple contact log for gallery contacts, collectors, collaborators.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| userId | int FK → users | |
| name | varchar(255) | |
| role | varchar(255) | |
| organization | varchar(255) | |
| city | varchar(100) | |
| phone | varchar(100) | |
| instagram | varchar(100) | |
| email | varchar(320) | |
| howConnected | text | |
| notes | text | |
| createdAt | timestamp | |

---

## 4. Frontend Pages and Routes

Navigation is provided by a persistent **bottom navigation bar** (`BottomNav.tsx`) with five primary tabs. A "More" overflow menu exposes secondary pages.

### 4.1 Primary Navigation

| Tab | Route | Component | Description |
|---|---|---|---|
| Home | `/` | `Home.tsx` | Dashboard — current week status, studio hours, trials, jester score, quick notes |
| Intake | `/crucible/intake` | `CrucibleIntake.tsx` | Log a new material trial — select materials, dimensions, rating, disposition, photo |
| Works | `/crucible/works` | `CrucibleWorks.tsx` | Full trial archive — photo grid with search, surface filter, disposition filter, rating filter |
| Analytics | `/analytics` | `CommandCenter.tsx` | Unified analytics — material usage, rating distributions, discovery density, temporal trends |
| More | (overlay menu) | `BottomNav.tsx` | Expands to secondary pages |

### 4.2 Secondary Pages (More Menu)

| Label | Route | Component | Description |
|---|---|---|---|
| Materials Library | `/materials` | `Materials.tsx` | Browse, add, and edit surfaces/mediums/tools |
| History & Trends | `/history` | `History.tsx` | Weekly roundup history, jester/energy trends |
| Weekly Roundup | `/roundup` | `RoundupForm.tsx` | Multi-step weekly check-in form |
| Contact Log | `/contacts` | `ContactLog.tsx` | Add and browse contacts |
| Settings | `/settings` | `Settings.tsx` | Crucible Year configuration, timezone, check-in day |

### 4.3 Detail and Edit Pages

| Route | Component | Description |
|---|---|---|
| `/results/:id` | `Results.tsx` | Roundup result view with AI pattern analysis |
| `/edit/:id` | `EditRoundup.tsx` | Edit a submitted roundup |
| `/crucible/work/:id` | `WorkDetail.tsx` | Full detail view for a single trial |
| `/crucible/work/:id/edit` | `WorkEdit.tsx` | Edit a trial record |

### 4.4 Design System

The app uses a **dark theme** throughout. CSS custom properties defined in `client/src/index.css` govern all colours. Key tokens:

| Token | Usage |
|---|---|
| `--void-black` | Page background |
| `--near-black` | Card/panel background |
| `--neon-cyan` | Primary accent (data, counts, links) |
| `--neon-magenta` | Secondary accent (headings, active states) |
| `--text-muted` | Secondary text |
| `--border-default` | Dividers |
| `--status-trash` | Disposition: Trash |
| `--status-probably-trash` | Disposition: Probably Trash |
| `--status-save` | Disposition: Save Archive |
| `--status-potential` | Disposition: Save Has Potential |

Fonts are loaded from Google Fonts CDN in `client/index.html`.

---

## 5. API Layer — tRPC Procedures

All procedures are defined in `server/routers.ts` and exported as `appRouter`. The client binds to them via `client/src/lib/trpc.ts`. All procedures except `auth.me` and `auth.logout` require an authenticated session (`protectedProcedure`).

### 5.1 `auth`

| Procedure | Type | Description |
|---|---|---|
| `auth.me` | query (public) | Returns current user or null |
| `auth.logout` | mutation (public) | Clears session cookie |

### 5.2 `roundup`

| Procedure | Type | Description |
|---|---|---|
| `roundup.canSubmit` | query | Whether user can submit a new roundup this week |
| `roundup.submit` | mutation | Submit a new weekly roundup (triggers weather fetch, LLM phase-DNA assignment, pattern matching) |
| `roundup.getById` | query | Fetch single roundup by ID |
| `roundup.getAll` | query | Fetch all roundups for current user |
| `roundup.getLast` | query | Fetch most recent roundup |

### 5.3 `patterns`

| Procedure | Type | Description |
|---|---|---|
| `patterns.analyze` | mutation | Run LLM-based pattern analysis against archive, store matches |
| `patterns.getForRoundup` | query | Retrieve stored pattern matches for a roundup |

### 5.4 `neon`

| Procedure | Type | Description |
|---|---|---|
| `neon.generateReading` | mutation | Generate an LLM "Neon Reading" — a reflective narrative based on roundup data and archive matches |

### 5.5 `stats`

| Procedure | Type | Description |
|---|---|---|
| `stats.dashboard` | query | Aggregate stats for home dashboard |
| `stats.trends` | query | Jester/energy/hours trends over time |
| `stats.comparison` | query | Week-over-week comparison |

### 5.6 `archive`

| Procedure | Type | Description |
|---|---|---|
| `archive.stats` | query | Archive entry counts by phase |
| `archive.seed` | mutation | Bulk import archive entries (admin) |

### 5.7 `export`

| Procedure | Type | Description |
|---|---|---|
| `export.csv` | query | Full roundup history as CSV |
| `export.unifiedCsv` | query | Unified export including works data |
| `export.pdfData` | query | Data payload for PDF report generation |

### 5.8 `settings`

| Procedure | Type | Description |
|---|---|---|
| `settings.get` | query | Fetch user settings |
| `settings.update` | mutation | Update crucible start date, check-in day, timezone |
| `settings.newCycle` | mutation | Advance to next Crucible Year cycle |

### 5.9 `roundupEdit`

| Procedure | Type | Description |
|---|---|---|
| `roundupEdit.get` | query | Fetch roundup for editing |
| `roundupEdit.update` | mutation | Save edits to a submitted roundup |

### 5.10 `quickNotes`

| Procedure | Type | Description |
|---|---|---|
| `quickNotes.getAll` | query | All quick notes for user |
| `quickNotes.getUnused` | query | Notes not yet included in a roundup |
| `quickNotes.getWeekly` | query | Notes from the current week |
| `quickNotes.create` | mutation | Add a new quick note |
| `quickNotes.delete` | mutation | Delete a quick note |
| `quickNotes.markUsed` | mutation | Mark notes as used in a roundup |

### 5.11 `materials`

| Procedure | Type | Description |
|---|---|---|
| `materials.getAll` | query | All materials for user |
| `materials.getByType` | query | Filter by 'Surface' \| 'Medium' \| 'Tool' |
| `materials.get` | query | Single material by ID |
| `materials.create` | mutation | Add a new material |
| `materials.update` | mutation | Edit a material |
| `materials.uploadPhoto` | mutation | Upload material photo to S3 |

### 5.12 `works`

| Procedure | Type | Description |
|---|---|---|
| `works.getAll` | query | All trials for user (no cap; enriched with surfaceIds + surfaceCodes) |
| `works.get` | query | Single trial by ID |
| `works.getSurfaces` | query | Surfaces attached to a trial |
| `works.getMediums` | query | Mediums attached to a trial |
| `works.getTools` | query | Tools attached to a trial |
| `works.getNextCode` | query | Next available T_XXX code + total count |
| `works.lastTrialDefaults` | query | Pre-fill defaults from last trial |
| `works.commonDimensions` | query | Most-used dimension combinations |
| `works.exportCSV` | query | All trials as CSV |
| `works.create` | mutation | Log a new trial |
| `works.update` | mutation | Edit a trial |
| `works.updateMaterials` | mutation | Replace surface/medium/tool assignments |
| `works.uploadPhoto` | mutation | Upload trial photo to S3, generate thumbnail |

### 5.13 `intakePresets`

| Procedure | Type | Description |
|---|---|---|
| `intakePresets.getAll` | query | All presets for user |
| `intakePresets.get` | query | Single preset |
| `intakePresets.create` | mutation | Save a new preset |
| `intakePresets.update` | mutation | Edit a preset |
| `intakePresets.delete` | mutation | Delete a preset |

### 5.14 `crucibleAnalytics`

| Procedure | Type | Description |
|---|---|---|
| `crucibleAnalytics.ratingBySurface` | query | Rating distribution per surface |
| `crucibleAnalytics.ratingByMedium` | query | Rating distribution per medium |
| `crucibleAnalytics.pairOutcomes` | query | Surface+medium combination outcomes |
| `crucibleAnalytics.velocitySignal` | query | Trash rate as velocity signal |
| `crucibleAnalytics.discoveryDensity` | query | Discovery text density over time |
| `crucibleAnalytics.lowRatingHighDiscovery` | query | Trials with low rating but rich discovery |
| `crucibleAnalytics.materialUsage` | query | Usage counts per material |
| `crucibleAnalytics.ratingDistribution` | query | Overall rating distribution |
| `crucibleAnalytics.dispositionBreakdown` | query | Disposition counts |
| `crucibleAnalytics.dimensionalStats` | query | Size distribution stats |
| `crucibleAnalytics.timeInvestment` | query | Hours distribution |
| `crucibleAnalytics.temporalTrends` | query | Trials over time |
| `crucibleAnalytics.summary` | query | Unified summary for Command Center |
| `crucibleAnalytics.worksForWeek` | query | Trials within a specific week range |
| `crucibleAnalytics.unifiedSummary` | query | Full analytics payload |

### 5.15 `contacts`

| Procedure | Type | Description |
|---|---|---|
| `contacts.create` | mutation | Add a contact |
| `contacts.update` | mutation | Edit a contact |
| `contacts.getAll` | query | All contacts for user |
| `contacts.delete` | mutation | Delete a contact |

### 5.16 `system` (framework-level)

| Procedure | Type | Description |
|---|---|---|
| `system.notifyOwner` | mutation | Push a notification to the project owner |

---

## 6. Authentication

Authentication uses **Manus OAuth**. The flow is:

1. Frontend redirects to `VITE_OAUTH_PORTAL_URL` with `appId` and `redirect_uri`.
2. Manus OAuth server redirects back to `/api/oauth/callback` with a code.
3. The server exchanges the code for user info, creates or updates the `users` row, and sets a signed JWT session cookie.
4. Subsequent requests to `/api/trpc` include the cookie; `server/_core/context.ts` decodes it and injects `ctx.user`.
5. `protectedProcedure` throws `UNAUTHORIZED` if `ctx.user` is null.

The frontend reads auth state via `trpc.auth.me.useQuery()` and uses `getLoginUrl()` from the auth context to construct the login redirect URL.

---

## 7. File Storage

Photos (trial images and material photos) are stored in S3-compatible object storage via the Manus Forge proxy. The server-side helpers are in `server/storage.ts`.

```
storagePut(relKey, data, contentType) → { key, url }
storageGet(relKey) → { key, url }
```

File keys follow the pattern `{userId}-works/{code}-{randomSuffix}.jpg`. The S3 bucket is public-read; URLs are stored directly in the database (`photoUrl` column). The `photoKey` column is stored for future deletion. A base64 thumbnail (`photoThumbnail`) is generated server-side and stored in the database for fast grid rendering without S3 round-trips.

---

## 8. Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `DATABASE_URL` | Server | MySQL/TiDB connection string |
| `JWT_SECRET` | Server | Session cookie signing key |
| `VITE_APP_ID` | Client + Server | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Server | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Client | Manus login portal URL |
| `OWNER_OPEN_ID` | Server | Owner's Manus OpenID (for notifications) |
| `OWNER_NAME` | Server | Owner display name |
| `BUILT_IN_FORGE_API_URL` | Server | Manus Forge API base URL (LLM, storage, notifications) |
| `BUILT_IN_FORGE_API_KEY` | Server | Bearer token for Forge API (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | Client | Bearer token for Forge API (client-side, limited) |
| `VITE_FRONTEND_FORGE_API_URL` | Client | Forge API URL for client-side calls |
| `VITE_ANALYTICS_ENDPOINT` | Client | Analytics event endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Client | Analytics site identifier |

---

## 9. Key Business Logic

### 9.1 Crucible Year Timeline

The app operates on a 52-week "Crucible Year" starting from a configurable `crucibleStartDate` (default: 2025-12-21, Bangkok time). Week numbers (0–52) are calculated relative to this start date. The `checkInDay` setting (default: Sunday) determines when a new week begins. Multiple entries per week are supported (`entryNumber` 1–7).

### 9.2 Trial Coding

Each trial is auto-assigned a sequential code (`T_001`, `T_002`…) via `works.getNextCode`. The code is unique per user. Material codes (`S4`, `MB1`, `T2`) are user-defined short identifiers stored in `materials.code`.

### 9.3 Rating Scale

| Rating | Label |
|---|---|
| 1 | Material Test |
| 2 | Glitch Harvest |
| 3 | Stable Execution |
| 4 | Signal Detected |
| 5 | Breakthrough |

### 9.4 Disposition Values

| Value | Meaning |
|---|---|
| `Trash` | Discard |
| `Probably_Trash` | Likely discard |
| `Save_Archive` | Keep for reference |
| `Save_Has_Potential` | Actively promising |

### 9.5 Pattern Matching

On roundup submission, the server runs an LLM-based analysis (`patterns.analyze`) that compares the current roundup's text against the `archive_entries` table. Matches are stored in `pattern_matches` with a relevance score (0–100) and match type (phrase, emotional, phase-dna). The "Neon Reading" (`neon.generateReading`) uses these matches to produce a reflective narrative.

### 9.6 Quick Notes Lifecycle

Quick notes are created throughout the week via the home dashboard. On roundup submission, unused notes are snapshotted into `weekly_roundups.quickNotes` (JSON), marked as used (`usedInRoundupId`), and deleted from the `quick_notes` table.

---

## 10. Migration Considerations

### 10.1 Database

The database is MySQL-compatible (TiDB). The full schema is in `drizzle/schema.ts`. Migration SQL can be generated with `pnpm db:push` (runs `drizzle-kit generate && drizzle-kit migrate`). Migration history is in `drizzle/meta/` (snapshots 0000–0022).

### 10.2 File Storage

All trial and material photos are stored in S3-compatible storage. The `photoUrl` and `photoKey` columns in `works_core` and `materials` reference these files. A migration must either re-point these URLs to a new bucket or copy the objects and update the database records.

### 10.3 Authentication

The current auth is tightly coupled to Manus OAuth. A migration would require replacing `server/_core/oauth.ts` and `server/_core/context.ts` with a new auth provider (e.g., Auth0, Clerk, NextAuth) and re-issuing session cookies. The `users.openId` field would need to be remapped to the new provider's subject identifier.

### 10.4 LLM Integration

The pattern analysis and Neon Reading features call `invokeLLM()` from `server/_core/llm.ts`, which proxies to the Manus Forge LLM API. A migration would replace this with a direct OpenAI/Anthropic API call using the same message format.

### 10.5 Notifications

`notifyOwner()` in `server/_core/notification.ts` calls the Manus Forge notification API. This would need to be replaced with an email service (e.g., Resend, SendGrid) or removed.

### 10.6 API Layer

The tRPC setup is framework-agnostic. The router definitions in `server/routers.ts` can be adapted to any Node.js server (Fastify, Hono, Next.js API routes) by replacing the Express adapter in `server/_core/index.ts`.

---

*Document generated from source code as of checkpoint `995fa562` (2026-03-19).*

# Beacon Platform

Consolidated replacement for the three separate Beacon codebases
(`Beacon`, `BeaconUAE`, `beaconSaudi`): **one** Next.js frontend serving all
three regions, backed by **one** Strapi 5 CMS on MySQL.

```
beacon-platform/
├── cms/        Strapi 5 (TypeScript) — content backend, port 1337
└── frontend/   Next.js 16 (App Router, Tailwind) — port 3000
```

## Why this exists

The three legacy sites had diverged badly — comparing the global and UAE repos
found exactly **one** byte-identical JS file, and the Saudi repo used an
entirely different component vocabulary. Every change had to be made three
times. They also shipped six live URLs across two domains
(`bmcglobal.co` + `beaconarabia.com`) with identical content, **no canonical
tags and no hreflang**, which invites duplicate-content and cannibalisation
problems.

This project fixes both: one codebase, one domain, regional subdirectories.

| Region | URL | hreflang |
|---|---|---|
| Global | `/` | `x-default` |
| UAE | `/ae` | `en-AE` |
| Saudi Arabia | `/sa` | `en-SA` |

## Prerequisites

- Node.js 22, 24 or 26 LTS (Strapi 5 does not support odd-numbered releases)
- **MySQL 8.0 or newer** — Strapi 5 does *not* support MySQL 5.7

## Setup

### 1. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE beacon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Configure the CMS

Copy `cms/.env.example` to `cms/.env` (the scaffold already created `.env`) and
fill in your MySQL credentials:

```ini
DATABASE_CLIENT=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=beacon
DATABASE_USERNAME=your_user
DATABASE_PASSWORD=your_password
```

### 3. Install and run

```bash
npm run install:all
npm run dev
```

That starts both apps together:

- Frontend → http://localhost:3000
- Strapi admin → http://localhost:1337/admin

Or run them separately with `npm run dev:cms` and `npm run dev:frontend`.

### 4. First-run CMS configuration

1. Create the admin user at http://localhost:1337/admin.
2. Public read access is granted **automatically** — `cms/src/index.ts` has a
   bootstrap that adds `find` / `findOne` on Page, Service, Post and Faq to the
   Public role on every start. It is idempotent, so manual changes made in the
   admin UI are preserved, and the same config reproduces on every environment
   without clicking through Settings → Roles.
3. Add content. Every entry has a **region** field (`global` / `ae` / `sa`) —
   that is what routes it to the correct regional site.

To lock the API down instead, remove the bootstrap call, issue an API token
(**Settings → API Tokens**) and set `STRAPI_API_TOKEN` in
`frontend/.env.local`; the frontend client already sends it when present.

### Memory note (development)

`strapi develop` serves the admin through a Vite dev server whose esbuild step
needs a large block of virtual memory. On a machine already running other dev
servers it can die with `fatal error: runtime: cannot allocate memory`, leaving
the admin panel blank while the API keeps working.

If that happens, build the admin once and serve it prebuilt:

```bash
npm run build:cms
npm run start:cms
```

Trade-off: no hot reload, so re-run `build:cms` after changing a content type
or any file under `cms/src/`.

## Content model

All four collection types carry a `region` enum, so a single backend feeds all
three regional sites.

| Type | Fields |
|---|---|
| **Page** | title, slug, region, body, seoTitle, seoDescription |
| **Service** | title, slug, region, summary, body, icon, order |
| **Post** | title, slug, region, excerpt, body, cover |
| **Faq** | question, answer, region, order |

Schemas live in `cms/src/api/*/content-types/*/schema.json` and are versioned in
git — edit them in the file or through the admin UI.

## Deployment notes

- **Database**: `config/database.ts` selects its connection from
  `DATABASE_CLIENT`, so moving between sqlite/mysql/postgres is env-only.
- **Two processes**: Strapi and Next.js deploy separately. Strapi needs a
  persistent Node host (your MySQL server), not a serverless platform.
- **Uploads**: Strapi writes to `cms/public/uploads` by default. On a host with
  an ephemeral filesystem, configure an S3/Cloudinary upload provider.
- **`NEXT_PUBLIC_SITE_URL`** drives `metadataBase`, canonicals, hreflang,
  `sitemap.xml` and `robots.txt`. Set it to the final production domain — it is
  the single switch that makes all SEO output correct.

## Outstanding decisions

- **Which domain to keep** (`beaconarabia.com` vs `bmcglobal.co`). Check Google
  Search Console for which holds the impressions, then 301 the other.
- **The expired TLS certificate** on `bmcglobal.co` (expired 28 Aug 2025).
- **Content migration** from the three legacy repos into Strapi.

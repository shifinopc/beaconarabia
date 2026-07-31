# Deployment

Production runs on Verpex shared hosting (cPanel + CloudLinux Node.js Selector,
LiteSpeed/Passenger), with the domain proxied through Cloudflare.

- Frontend — `https://beaconarabia.com`, app root `/home/beaconarabia/frontend`
- CMS — `https://cms.beaconarabia.com`, app root `/home/beaconarabia/cms.beaconarabia.com`
- Database — MySQL (MariaDB-flavoured) `beaconarabia_db`

Both apps are started by cPanel as `node server.js`; the `server.js` in each is
an entry point for that, not something used in development.

---

## The two rules that matter

**1. Never run `npm run build` for the CMS on the server.** Strapi builds its
admin panel with Vite, which shells out to esbuild, and esbuild segfaults under
CloudLinux's CageFS (`SIGSEGV` from `esbuild --version` during install). Build
the CMS locally and upload `dist/` instead — see below. The frontend is
unaffected: Next compiles with SWC and bundles with Turbopack, both Rust, so it
builds fine on the server.

**2. The frontend needs `--webpack` and a worker cap.** Turbopack refuses
cPanel's symlinked `node_modules` ("it points out of the filesystem root"), and
Next otherwise sees 32 CPUs and spawns 26 workers, blowing past the account's
100-process limit with `spawn EAGAIN`.

---

## Deploying a frontend change

```bash
source /home/beaconarabia/nodevenv/frontend/24/bin/activate
cd /home/beaconarabia/frontend
rm -rf .next
CIRCLE_NODE_TOTAL=3 taskset -c 0,1 npx next build --webpack
touch tmp/restart.txt
```

Confirm the build actually finished — `BUILD_ID` alone is not enough, it is
written before static generation:

```bash
ls .next/prerender-manifest.json && echo "BUILD OK"
```

A missing `prerender-manifest.json` means the build died partway and **every
request will 500**, while LiteSpeed serves a default page that looks like a
stale site rather than an error.

## Deploying a CMS change

Locally:

```bash
cd beacon-platform/cms
npm run build          # produces dist/ (compiled TS + admin panel)
```

Upload `dist/` to `/home/beaconarabia/cms.beaconarabia.com/`, replacing the
existing one, then:

```bash
touch ~/cms.beaconarabia.com/tmp/restart.txt
```

---

## Environment variables

Set through cPanel's Node.js app screen, which writes them into the docroot's
`.htaccess` as `SetEnv` lines. See `frontend/.env.example` and
`cms/.env.example` for the full annotated list.

Non-obvious ones:

- **`ENCRYPTION_KEY` and `API_TOKEN_SALT` (CMS)** must match whatever database
  you are running against. They decrypt and hash-verify the stored API token
  respectively — change either and the frontend's token silently stops
  authenticating, with no error that names the cause.
- **`STRAPI_API_TOKEN` (frontend)** is not regenerated for an existing
  database. `ensureApiToken` only creates a token when none exists, so after
  restoring a dump you must reuse the original plaintext value; it is never
  recoverable from the database.
- **`EMAILJS_PRIVATE_KEY`** is required. EmailJS rejects non-browser calls
  without it, and the forms now send server-side.
- **Do not set `SEED_CONTENT` or `OPTIMISE_MEDIA` in production.** They are
  opt-in precisely so they cannot run against real data by accident.

---

## Restoring the database

`mysql` CLI access may not be available; phpMyAdmin usually is. Two things
break a naive import:

1. **Collation.** Dumps from MySQL 8 contain `utf8mb4_0900_ai_ci`, which
   MariaDB does not have (`#1273 - Unknown collation`). Rewrite it:
   ```bash
   sed 's/utf8mb4_0900_ai_ci/utf8mb4_unicode_ci/g' dump.sql > dump-fixed.sql
   ```
2. **Statement size.** A default `mysqldump` batches thousands of rows into one
   `INSERT`; phpMyAdmin aborts partway through, leaving some tables populated
   and others empty with no error shown. Dump with `--skip-extended-insert` so
   each row is its own statement, and split the file into <400 KB parts.

Symptom of a partial import: the admin panel logs in fine (its tables are early
in the file) while every content type shows zero entries.

Note that restoring also replaces `admin_users`, so log in afterwards with the
credentials from the source database.

Media lives in `cms/public/uploads` and is **not** in git — the database rows
reference those filenames, so both must be restored together.

---

## Cloudflare

- **IP Geolocation** must be on (Network settings) or `proxy.ts` cannot
  geo-route AE/SA visitors; without the `CF-IPCountry` header everyone simply
  gets the global site.
- **Do not cache HTML at `/`.** A cached homepage would bypass `proxy.ts`
  entirely and serve one region's redirect to everybody.
- Rate limiting and `clientIp()` both prefer `CF-Connecting-IP`, which the edge
  sets itself; that only works while the domain is proxied (orange cloud).

---

## Things that have gone wrong before

| Symptom | Cause |
| --- | --- |
| Old site served despite new code deployed | Cloudflare DNS still pointing at the previous host |
| Every route 500s, `stderr.log` empty | Incomplete build — check `prerender-manifest.json` |
| `/api/*` 404s while `/admin` works | `dist/src/api` directories missing the execute bit; `chmod 755` recursively |
| CMS won't boot, `libvips` error | `sharp` installed without its Linux binary — `npm install --include=optional sharp` |
| Content types all empty after import | Partial SQL import (see above) |
| `Invalid URL … input: ''` at boot | An env var is present but empty; `??` does not catch empty strings |

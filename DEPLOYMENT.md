# Deployment

Production runs on Verpex shared hosting (cPanel + CloudLinux Node.js Selector,
LiteSpeed/Passenger), with the domain proxied through Cloudflare.

- Frontend — `https://beaconarabia.com`, app root `/home/beaconarabia/frontend`
- CMS — `https://cms.beaconarabia.com`, app root `/home/beaconarabia/cms.beaconarabia.com`
- Database — MySQL (MariaDB-flavoured) `beaconarabia_db`

Both apps are started by cPanel as `node server.js`; the `server.js` in each is
an entry point for that, not something used in development.

---

## The three rules that matter

**1. Neither app can be built on the server. Build locally, upload the output.**

- The **CMS** dies because Strapi builds its admin panel with Vite, which shells
  out to esbuild, and esbuild segfaults under CloudLinux's CageFS (`SIGSEGV`
  from `esbuild --version`).
- The **frontend** dies because CloudLinux's LVE layer refuses to fork:
  `spawn ... EAGAIN`, or `OS can't spawn worker thread` from inside Rust. This
  is *not* a process-count problem — it happens with 5 processes running and
  `ulimit -u unlimited`, and it happens even after forcing a single worker
  (`experimental.cpus: 1`, which the config supports via `NEXT_BUILD_CPUS`).
  The binding constraint is the LVE memory cap; a webpack build wants more than
  the plan allows. Check cPanel → Resource Usage for `MEM`/`NPROC` faults at
  build times, and ask Verpex to raise the limit if you want on-server builds
  back.

Note that `taskset` does **not** help: it constrains CPU affinity, but
`os.cpus()` still reports every core, so Next sizes its worker pool the same.
Only `experimental.cpus` changes the worker count.

**2. `chmod -R u+rwX,go+rX` after EVERY extraction. Non-negotiable.**

Archives extracted on this host arrive with directories missing their execute
bit, which makes them untraversable. This has caused three separate outages:

- `app/api` and `public/*` → build failed with `EACCES: scandir`
- all fourteen `dist/src/api` directories → Strapi registered **zero** content
  routes, so `/api/*` 404'd while `/admin` returned 200 and the app looked
  healthy
- `.next/static/*` → every request 503'd

The capital `X` matters: it sets the execute bit on directories only, leaving
files at `644`. Do not try to fix it with `find -exec chmod` — `find` cannot
descend into the broken directories in the first place.

**3. Never delete a working build before the replacement is proven.**

`rm -rf .next` followed by a build that fails leaves no way to serve the site.
Swap only on success:

```bash
mv .next .next.old && <build command> && rm -rf .next.old || (rm -rf .next && mv .next.old .next)
```

---

## Deploying a frontend change

Build **locally**, against the live CMS, so the prerendered pages contain real
content and the inlined `NEXT_PUBLIC_*` values are the production ones:

```bash
cd beacon-platform/frontend
rm -rf .next
NEXT_PUBLIC_SITE_URL="https://beaconarabia.com" \
STRAPI_URL="https://cms.beaconarabia.com" \
STRAPI_API_TOKEN="<the live read-only token>" \
NODE_ENV=production npx next build --webpack
```

`NEXT_PUBLIC_SITE_URL` is baked in at build time, so building with the local
value publishes localhost canonicals, hreflang and sitemap entries. Before
shipping, confirm nothing sensitive was captured:

```bash
grep -rl "$STRAPI_API_TOKEN" .next | wc -l   # must be 0
grep -rl "localhost" .next/static | wc -l    # 1 is fine (URL polyfill), more is not
```

Zip `.next`, upload, extract into `/home/beaconarabia/frontend/`, then:

```bash
cd ~/frontend
chmod -R u+rwX,go+rX .next          # REQUIRED — see rule 2
find .next -type d ! -perm -u+x | wc -l   # must print 0
ls .next/prerender-manifest.json && touch tmp/restart.txt
```

`prerender-manifest.json` is the real completion marker. `BUILD_ID` is written
*before* static generation, so its presence means nothing — a build that died
midway leaves `BUILD_ID` behind and every request 503s or 500s while LiteSpeed
serves a default page that looks like a stale site rather than an error.

## Deploying a CMS change

Locally:

```bash
cd beacon-platform/cms
npm run build          # produces dist/ (compiled TS + admin panel)
```

Upload `dist/` to `/home/beaconarabia/cms.beaconarabia.com/`, replacing the
existing one, then:

```bash
cd ~/cms.beaconarabia.com
chmod -R u+rwX,go+rX dist           # REQUIRED — see rule 2
touch tmp/restart.txt
```

Verify the API is actually serving, not just the admin panel — a permissions
problem shows up as `/admin` working while every content route 404s:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <token>" \
  https://cms.beaconarabia.com/api/services     # expect 200
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

**Geo-routing cannot be tested by sending your own `CF-IPCountry` header** —
Cloudflare overwrites it with the real value, which is the point of it. To check
the proxy is running at all, use the override path, which does not depend on
geography:

```bash
curl -sI "https://beaconarabia.com/?region=global"   # expect 307 + Set-Cookie
```

`https://beaconarabia.com/cdn-cgi/trace` reports the country Cloudflare has
assigned you (`loc=`), which is what the proxy will actually see.

---

## Things that have gone wrong before

| Symptom | Cause |
| --- | --- |
| Old site served despite new code deployed | Cloudflare DNS still pointing at the previous host |
| Every route 503s, `EACCES: scandir` in `stderr.log` | Extracted directories missing the execute bit — `chmod -R u+rwX,go+rX` |
| Every route 500s, `stderr.log` empty | Incomplete build — check `prerender-manifest.json`, not `BUILD_ID` |
| `/api/*` 404s while `/admin` returns 200 | Same execute-bit problem on `dist/src/api`; Strapi silently registers zero routes |
| `spawn ... EAGAIN` / `OS can't spawn worker thread` during build | CloudLinux LVE limit (memory, not process count). Build locally instead |
| CMS won't boot, `libvips` error | `sharp` installed without its Linux binary — `npm install --include=optional sharp` |
| Content types all empty after import | Partial SQL import (see above) |
| `Invalid URL … input: ''` at boot | An env var is present but empty; `??` does not catch empty strings |
| Site serves localhost canonicals | Built with the local `NEXT_PUBLIC_SITE_URL` — it is inlined at build time |
| Forms return 503 | `EMAILJS_*` not set; note the names are unprefixed and `EMAILJS_PRIVATE_KEY` is required |

Two of these — the execute-bit problem and the incomplete build — are dangerous
specifically because the site *looks* like it is merely stale rather than
broken. Check `stderr.log` before assuming a caching issue.

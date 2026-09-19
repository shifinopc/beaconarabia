# Deployment

Production runs on Verpex shared hosting (cPanel + CloudLinux Node.js Selector,
LiteSpeed/Passenger), with the domain proxied through Cloudflare.

- Frontend — `https://beaconarabia.com`, app root `/home/beaconarabia/frontend`
- CMS — `https://cms.beaconarabia.com`, app root `/home/beaconarabia/cms.beaconarabia.com`
- Database — MySQL (MariaDB-flavoured) `beaconarabia_db`

Both apps are started by cPanel as `node server.js`; the `server.js` in each is
an entry point for that, not something used in development.

---

## The five rules that matter

**0. Check for duplicate processes BEFORE and AFTER every deploy.**

```bash
bash ~/scripts/nproc-census.sh
```

Expect exactly one `frontend` and one `cms.beaconarabia.com` Node process, and a
thread total well under 100. The script is fork-free, so it still runs when the
account is at its limit and `ps` cannot.

Two frontend processes have two causes on this host:

- **LiteSpeed starts a second instance by itself under load.** On 18 and
  19 Sep 2026 a second `lsnode (frontend)` appeared minutes after a clean
  start, with the *same parent* as the first and no restart in between —
  typically after a burst of parallel requests (scripted checks, a site-wide
  revalidate). Each costs ~39 threads, so two frontends plus the CMS sits at
  ~88/100.
- **Stop App does not always end it.** Both times, Stop App ended one frontend
  and left the second running, still on the old code. Starting the app then
  gives two instances on two different builds.

So check **between Stop App and Start App**, not only after: the census must
show zero `(frontend)` processes before you start. A survivor is ended with
`kill <pid>` from cPanel → Terminal (a plain `kill` has been enough; use
`kill -9` only if it is still listed a few seconds later). Verpex has been asked
whether LiteSpeed can be capped at one instance per app; until they confirm,
this check is the workaround.

This is the single most common failure here, and its symptoms are misleading:

- **Requests flap between builds.** The same blog URL returned 200 and 404 on
  alternating requests, because one instance had the new build and one the old.
- **A deploy appears not to take effect**, because responses come from whichever
  instance answers.
- **The account runs out of threads.** Each instance carries its own thread
  pool, so duplicates double the cost and produce
  `pthread_create: Resource temporarily unavailable` — severe enough that even
  an SSH shell can no longer fork.

Kill the older PID (`kill -9 <pid>`), keep the newest, and re-check. The hosting
team has also cleared these manually on request.

**1. Neither app can be built on the server. Build locally, upload the output.**

- The **CMS** dies because Strapi builds its admin panel with Vite, which shells
  out to esbuild, and esbuild segfaults under CloudLinux's CageFS (`SIGSEGV`
  from `esbuild --version`).
- The **frontend** dies because CloudLinux's LVE layer refuses to fork:
  `spawn ... EAGAIN`, or `OS can't spawn worker thread` from inside Rust.
  An earlier version of this note said this was *not* a process-count problem,
  because only 5 processes were visible and `ulimit -u` reports unlimited. That
  was wrong. CloudLinux enforces NPROC separately from `ulimit`, and it counts
  **threads**, not processes — Resource Usage shows a hard ceiling of 100 tasks
  on this account. Five Node processes with twenty-odd threads each is the whole
  budget. A webpack build's worker threads push straight past it.

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

**4. Ship `.tar.gz`, never a PowerShell `.zip`.**

`Compress-Archive` writes Windows path separators. Extracted with `unzip` on
this host, that produces files literally *named* `dist\build\foo.js` — no
directories at all, junk permissions, and `rm` unable to descend into them.
cPanel's File Manager happens to cope; the command line does not.

`tar` uses POSIX separators and preserves file modes, which also makes rule 2
belt-and-braces rather than essential:

```bash
tar -czf out.tar.gz dist          # from Git Bash, using /m/... not M:\...
tar -xzf out.tar.gz               # on the server
```

`tar` reads a Windows drive letter as a remote host, so `M:/Projects/...` fails
with "Cannot connect to M: resolve failed". Use the `/m/Projects/...` form.

---

## Deploying a frontend change

Build **locally, against a local CMS**. Start Strapi (`npm run develop` in
`cms/`), let it finish booting, then:

```bash
cd beacon-platform/frontend
rm -rf .next
STRAPI_URL="https://cms.beaconarabia.com" \
STRAPI_INTERNAL_URL="http://localhost:1337" \
NEXT_PUBLIC_SITE_URL="https://beaconarabia.com" \
STRAPI_API_TOKEN="<local token from frontend/.env.local>" \
NODE_ENV=production npx next build --webpack
```

The two Strapi variables are doing different jobs and both matter:

- `STRAPI_INTERNAL_URL` is where this build *fetches* from. Pointing it at the
  local CMS keeps the build off the production one — which is not a nicety: a
  build's concurrent fetches have taken the production CMS down more than once,
  and repeated builds while diagnosing took it down for the better part of an
  hour.
- `STRAPI_URL` is the origin baked into image URLs for browsers, so it must name
  the **public** CMS even though nothing is fetched from it during the build.

This only works while the local and production databases hold the same content.
`NEXT_PUBLIC_SITE_URL` is inlined at build time too, so building with the local
value publishes localhost canonicals, hreflang and sitemap entries.

Before shipping, confirm nothing leaked:

```bash
grep -rl "$STRAPI_API_TOKEN" .next | wc -l          # must be 0
grep -rl "localhost" .next/server/app --include='*.html' | wc -l   # must be 0
```

Two compiled route files legitimately contain the literal
`|| "http://localhost:1337"` fallback. That is source text, not an emitted URL,
and is unreachable once `STRAPI_URL` is set — check the rendered `.html` files,
not the whole tree.

Package and upload:

```bash
cd /m/Projects/beacon/beacon-platform/frontend
tar -czf ../deploy/beacon-next-build.tar.gz --exclude='.next/cache' --exclude='.next/dev' --exclude='*.map' .next public/og-default.png
```

The exclusions matter. `.next/cache` is ~119 MB of build cache and `.next/dev`
is ~110 MB left behind by any local `next dev` session; neither has a runtime
purpose. With them the archive is ~70 MB, without them ~3–4 MB — if the
archive is much over 5 MB, something extra got in.

On the server — **stop the frontend app in cPanel first** (Setup Node.js App →
beaconarabia.com → Stop App), then:

```bash
cd ~/frontend
rm -rf .next.old                          # see below — without this, mv fails
mv .next .next.old                        # rule 3
tar -xzf beacon-next-build.tar.gz
chmod -R u+rwX,go+rX .next public         # rule 2
find .next -type d ! -perm -u+x | wc -l   # must print 0
ls .next/prerender-manifest.json          # must exist before starting
```

Before **Start App**, confirm nothing survived the stop (rule 0):

```bash
bash ~/scripts/nproc-census.sh | grep -c '(frontend)'   # must print 0
```

If it prints 1 or more, `kill` that PID first. Then **Start App** in cPanel.

**`server.js` is not in the archive.** The `.next` package carries the build
only; `frontend/server.js` (the entry point cPanel runs) is deployed on its own.
When it changes, upload it to `~/frontend/`, check it with the app's own Node,
then Stop App → census → Start App — no `.next` swap needed:

```bash
source ~/nodevenv/frontend/24/bin/activate && node --check ~/frontend/server.js && echo OK; deactivate
```

**Never `touch tmp/restart.txt`.** It asks for a graceful restart, which starts
the new Node process while the old one is still alive, and on this host the old
one does not reliably exit. Each deploy can leave a full set of idle threads
behind. The account's NPROC ceiling is 100 *tasks* — CloudLinux counts every
thread, not just processes — and one Node app is roughly 20–25 of them. On
15 September the account sat pinned at 100/100 for eleven straight hours with
CPU at 0% and only 5 entry processes: nothing was busy, the budget was simply
full of leftovers, and the frontend 503'd because it could not fork. Stop, then
start, frees the old threads before the new process claims any.

**Clear `.next.old` first.** If it survives from the previous deploy, `mv .next
.next.old` does not replace it — it moves `.next` *inside* it, and fails with
`cannot move '.next' to '.next.old/.next': Directory not empty`. Because the
steps are chained with `&&`, everything after that is skipped: no extract, no
restart, no error page. The old build keeps serving and the deploy looks like it
happened. This has already cost one silent no-op deploy.

Deleting it is safe — it is only the rollback copy of the *previous* build, and
the currently-live `.next` becomes the new rollback a moment later.

Verify with `grep -o`, never `grep -c`: Next emits the whole document on one
line, so `grep -c` reports `1` for any pattern that appears at all, including
zero-vs-many differences. `curl -s https://beaconarabia.com/ | grep -o 'as="image"' | wc -l`
is the correct shape.

`prerender-manifest.json` is the real completion marker. `BUILD_ID` is written
*before* static generation, so its presence means nothing — a build that died
midway leaves `BUILD_ID` behind and every request 503s or 500s while LiteSpeed
serves a default page that looks like a stale site rather than an error.

## Deploying a CMS change

Locally — **stop `strapi develop` first**. It wipes `dist/build` on every
restart, so a `dist` packaged while it is running ships without the admin panel
(a ~96 KB archive instead of ~14 MB is the tell):

```bash
cd beacon-platform/cms
rm -rf dist && npm run build      # dist/ = compiled TS + admin panel
ls dist/build | wc -l             # ~334 files
```

```bash
cd /m/Projects/beacon/beacon-platform/cms
tar -czf ../deploy/beacon-cms-dist.tar.gz dist
```

If dependencies changed, upload `cms/package.json` too and install **with the
frontend app stopped** in cPanel — the install needs process headroom this
account does not otherwise have:

```bash
source /home/beaconarabia/nodevenv/cms.beaconarabia.com/24/bin/activate
cd ~/cms.beaconarabia.com
npm install --ignore-scripts --no-audit --no-fund
```

`--ignore-scripts` is required: esbuild's postinstall segfaults under CageFS.
The trade-off is that packages needing a postinstall may be left incomplete —
`sharp` was, and had to be repaired with
`npm install --include=optional sharp`.

Then:

Stop the CMS app in cPanel first, then:

```bash
cd ~/cms.beaconarabia.com
rm -rf dist.old
mv dist dist.old                    # rule 3
tar -xzf beacon-cms-dist.tar.gz
chmod -R u+rwX,go+rX dist           # rule 2
```

Then Start App. Same reason as the frontend: no `touch tmp/restart.txt`.

Start the frontend app again, then verify the API is serving, not just the admin
panel — a permissions problem shows up as `/admin` working while every content
route 404s:

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
- **`STRAPI_WRITE_TOKEN` (frontend)** is a second, custom token scoped to
  `api::enquiry.enquiry.create` and nothing else. Without it the contact forms
  return 502. The CMS provisions one on boot but only *logs* the value in
  production — and Passenger does not reliably capture Strapi's stdout here, so
  it is usually lost. Create it by hand instead: admin → Settings → API Tokens →
  Custom, ticking only Enquiry `create`. The value is shown once.
- **Do not set `SEED_CONTENT` or `OPTIMISE_MEDIA` in production.** They are
  opt-in precisely so they cannot run against real data by accident.
- **`UV_THREADPOOL_SIZE=2`** and **`NODE_OPTIONS=--v8-pool-size=2`** on both apps
  cut per-process threads. Not required, but this account has little headroom.

EmailJS is gone. Mail is sent by the CMS over SMTP (nodemailer), configured in
the admin's **Email Settings** single type rather than by environment variable,
so a changed mailbox is a CMS edit rather than a deploy.

---

## Logs

The frontend's output goes to `~/frontend/stderr.log` (the CMS's to
`~/cms.beaconarabia.com/stderr.log`).

- **`[server] <METHOD> <url> -> 500: <message>`** — an error Next threw out of
  its request handler, caught by `server.js` (since 19 Sep 2026) and answered
  with a plain 500. `-> response cut short` means the page had already started
  sending, so the status could not change. Any such line is worth
  investigating; before this guard these were full stack traces with no
  response sent.
- **A fetch error naming `status: 530` and an endpoint** — the frontend could
  not reach the CMS through Cloudflare, usually because the CMS app was down or
  restarting at that moment.

To clear the log, **truncate it — do not delete it**. The running app keeps its
file handle, so a deleted log is never recreated until the next restart:

```bash
: > ~/frontend/stderr.log
```

It was last cleared on 19 Sep 2026, from 1.9 MB, almost all of it
`NoFallbackError` stack traces from before the `dynamicParams` fix below.

---

## Runtime constraints

**Image optimization is off, and must stay off** (`images.unoptimized: true`).

Every `<Image>` without `unoptimized` becomes a `/_next/image` request that runs
sharp/libvips in the server process, each with its own thread pool. The homepage
issued **42 of them**, so one visitor meant 42 concurrent optimizations. That
exhausted the account's threads — `pthread_create: Resource temporarily
unavailable`, `fork: retry` even in an SSH shell — and repeatedly took both apps
down. The hosting team independently identified the frontend as the source.

Little is lost, because the images are already optimized at rest: the CMS media
pipeline re-encodes anything over 250 KB to WebP at a maximum of 1600px, so the
optimizer was largely turning WebP into WebP. What is given up is per-breakpoint
resizing; Cloudflare Image Resizing can restore that at the edge, outside this
process.

To confirm after a deploy:

```bash
curl -s https://beaconarabia.com/ | grep -o '/_next/image' | wc -l   # must be 0
```

**Blog articles are prerendered, and new ones appear without a rebuild.**
Both `/blog/[slug]` and `/[region]/blog/[slug]` declare `generateStaticParams`,
so every article that exists at build time ships as static HTML. They also set
`dynamicParams = true` (since 8 Sep 2026): an article published in the CMS
after the last build is rendered on its first request, then cached like the
rest. The refresh interval is set on the CMS fetches, not the routes: every
Strapi request in `lib/strapi.ts` uses `next: { revalidate: 60 }`, so an edit
to a published article shows within about a minute, or immediately when the
Strapi webhook calls `/api/revalidate`. Before that change such an article returned 404
until the next deploy. The same applies to service and office pages. An
unknown slug still returns 404 — the page calls `notFound()` when the CMS has
no such entry.

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
- **Always Use HTTPS is on** (SSL/TLS → Edge Certificates, since 18 Sep 2026).
  Cloudflare answers every `http://` request with a 301 itself, so nothing
  depends on the origin's port 80 — which stopped responding that day. The
  `cf-visitor` rule in `next.config.ts` is now a fallback; it cannot loop,
  because it only fires for a visitor scheme of plain `http`.
- **Old regional hosts.** `ksa` and `uae` are proxied A records to the origin
  (190.92.174.37), and exist in cPanel → Domains with document root
  `public_html`, so the same Node app receives them and the host-based rules in
  `next.config.ts` redirect them into `/sa` and `/ae`. `www.ksa` / `www.uae`
  are not set up: HTTPS for a second-level subdomain needs Cloudflare's paid
  Advanced Certificate. Test with
  `curl -sI https://ksa.beaconarabia.com/pages/Contact` (expect 308 to
  `/sa/contact`).

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
| Contact forms return 502 | `STRAPI_WRITE_TOKEN` missing on the frontend; it falls back to the read-only token, which cannot create |
| `pthread_create` / `fork: Resource temporarily unavailable` | Duplicate `lsnode` processes (rule 0), or image optimization left on |
| Same URL returns 200 and 404 alternately | Two app instances serving different builds — rule 0 |
| Blog articles time out, other pages fine | `generateStaticParams` missing; the route is rendering per request and cannot reach the CMS |
| Production CMS falls over during a build | Built against it. Use `STRAPI_INTERNAL_URL` pointed at a local CMS |
| CMS `dist` archive is ~96 KB not ~14 MB | Packaged while `strapi develop` was running; it wipes `dist/build` |
| `unzip` warns about backslashes; files named `dist\build\…` | Archive made with PowerShell `Compress-Archive` — use `tar` (rule 4) |
| `/ae`, `/sa` and their section pages 404 after a CMS publish, `NoFallbackError` in the log; detail pages fine | A route with `dynamicParams = false` cannot regenerate after `/api/revalidate`. Every `[region]` route must use `true` and call `notFound()` itself. A restart clears it until the next publish |
| Two `lsnode (frontend)` processes with the same parent, the second started minutes after a deploy with no restart | LiteSpeed starting a second app instance on its own under concurrent requests — not a deploy leftover. Each costs ~39 threads, so two frontends plus the CMS sits near the NPROC limit of 100. Avoid bursts of parallel requests (e.g. scripted checks) and ask the host whether the per-app instance count can be capped at 1 |

Several of these are dangerous specifically because the site *looks* merely
stale rather than broken: the execute-bit problem, the incomplete build, and
duplicate instances serving different builds. Check `stderr.log` and rule 0
before assuming a caching issue.

---

## Standard deploy sequence

Both apps at once is what has caused the most trouble. One at a time:

1. Check headroom: cPanel → Resource Usage → Current usage. NPROC should be
   well under 100 before you start. If it is not, stop both apps, run
   `scripts/nproc-census.sh` to see what is holding it, and clear it first.
2. Deploy the **frontend** (Stop App, census shows no frontend, extract,
   `chmod`, Start App), verify. If `server.js` changed, upload it too.
3. Deploy the **CMS**, with the frontend app **stopped** if `npm install` is
   needed. Start the frontend again afterwards.
4. Re-check for duplicates — both apps just restarted.
5. Verify, then remove `.next.old` / `dist.old`.

Verification worth running every time:

```bash
for p in / /ae /sa /blog /blog/oman-vision-2040; do
  printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 30 "https://beaconarabia.com$p"
done
curl -s https://beaconarabia.com/ | grep -o '/_next/image' | wc -l   # must be 0
curl -s -o /dev/null -w "%{http_code}\n" https://cms.beaconarabia.com/admin
```

Run the route check twice. Consistent results matter more than any single 200 —
alternating codes mean duplicate instances.

---

## Standing constraint

This account has hit its resource ceiling repeatedly: during builds, during
`npm install`, from the image optimizer under normal traffic, and from duplicate
Passenger instances. Removing the image optimizer and the GA dashboard plugin's
gRPC dependency cut the steady-state footprint substantially, but two Node
applications plus MySQL on an entry shared plan leaves little margin.

Verpex has cleared stuck processes on request but has not stated the account's
actual `NPROC`/`PMEM` limits. Worth asking for those numbers before adding
anything that runs continuously.

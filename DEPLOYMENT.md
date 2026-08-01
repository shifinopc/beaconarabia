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
ps -u beaconarabia -o pid,etime,cmd | grep lsnode
```

Expect exactly one `frontend` and one `cms.beaconarabia.com`. Passenger on this
host regularly fails to reap the previous instance on restart, leaving two
running — one 22 hours old alongside a fresh one, in the worst case observed.

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
tar -czf ../deploy/beacon-next-build.tar.gz --exclude='.next/cache' .next public/og-default.png
```

Excluding `.next/cache` matters: it is ~119 MB of build cache with no runtime
purpose, against ~9.5 MB for everything else.

On the server:

```bash
cd ~/frontend
mv .next .next.old                        # rule 3
tar -xzf beacon-next-build.tar.gz
chmod -R u+rwX,go+rX .next public         # rule 2
find .next -type d ! -perm -u+x | wc -l   # must print 0
ls .next/prerender-manifest.json && touch tmp/restart.txt
```

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

```bash
cd ~/cms.beaconarabia.com
mv dist dist.old                    # rule 3
tar -xzf beacon-cms-dist.tar.gz
chmod -R u+rwX,go+rX dist           # rule 2
touch tmp/restart.txt
```

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

**Blog articles must stay prerendered.** Both `/blog/[slug]` and
`/[region]/blog/[slug]` declare `generateStaticParams` and `dynamicParams =
false`. Without them the routes render per request, which needs the server to
reach the CMS mid-response — and it cannot, so every article timed out while
every other page served in ~130ms. A new article therefore needs a rebuild to
appear.

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
| Contact forms return 502 | `STRAPI_WRITE_TOKEN` missing on the frontend; it falls back to the read-only token, which cannot create |
| `pthread_create` / `fork: Resource temporarily unavailable` | Duplicate `lsnode` processes (rule 0), or image optimization left on |
| Same URL returns 200 and 404 alternately | Two app instances serving different builds — rule 0 |
| Blog articles time out, other pages fine | `generateStaticParams` missing; the route is rendering per request and cannot reach the CMS |
| Production CMS falls over during a build | Built against it. Use `STRAPI_INTERNAL_URL` pointed at a local CMS |
| CMS `dist` archive is ~96 KB not ~14 MB | Packaged while `strapi develop` was running; it wipes `dist/build` |
| `unzip` warns about backslashes; files named `dist\build\…` | Archive made with PowerShell `Compress-Archive` — use `tar` (rule 4) |

Several of these are dangerous specifically because the site *looks* merely
stale rather than broken: the execute-bit problem, the incomplete build, and
duplicate instances serving different builds. Check `stderr.log` and rule 0
before assuming a caching issue.

---

## Standard deploy sequence

Both apps at once is what has caused the most trouble. One at a time:

1. `ps -u beaconarabia -o pid,etime,cmd | grep lsnode` — kill duplicates first.
2. Deploy the **frontend** (extract, `chmod`, `touch tmp/restart.txt`), verify.
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

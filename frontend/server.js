/**
 * Entry point for hosts (cPanel/CloudLinux "Node.js Selector", Passenger,
 * etc.) that start the app as `node server.js` rather than running the
 * `start` npm script directly. Passenger sets `PORT` itself; `next start`
 * alone has no such file for it to point at.
 *
 * Requires `next build` to have already run — this only serves the build.
 */
const { createServer } = require("http");
const next = require("next");

/**
 * Boot-time environment check.
 *
 * Deliberately duplicated from lib/env.ts, which cannot enforce anything on its
 * own: it runs when a React module is first loaded, and statically prerendered
 * pages are served straight from disk without ever loading it — so a throw
 * there is logged but the site keeps serving pages built with the wrong URLs.
 * Refusing to start is only possible here, before anything is served.
 *
 * lib/env.ts remains the fuller version (recommended-variable warnings, alias
 * handling); this is the subset whose absence produces silently wrong output
 * rather than an obvious failure. Keep the two lists in step.
 */
function checkEnv() {
  const required = ["NEXT_PUBLIC_SITE_URL", "STRAPI_URL", "STRAPI_API_TOKEN"];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length) {
    console.error(
      `[env] Missing required environment variables: ${missing.join(", ")}.\n` +
        "      Without them the site serves localhost URLs to crawlers and\n" +
        "      falls back to hardcoded content instead of the CMS. Refusing to start.",
    );
    process.exit(1);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!/^https?:\/\//.test(siteUrl)) {
    console.error(
      `[env] NEXT_PUBLIC_SITE_URL must be an absolute URL including the scheme; got "${siteUrl}". Refusing to start.`,
    );
    process.exit(1);
  }
  if (siteUrl.includes("localhost")) {
    console.error(
      `[env] NEXT_PUBLIC_SITE_URL is "${siteUrl}" in production. Every canonical,\n` +
        "      hreflang and sitemap entry would publish that host. Refusing to start.",
    );
    process.exit(1);
  }
}

if (process.env.NODE_ENV === "production") checkEnv();

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

/**
 * Last-resort guard around Next's request handler.
 *
 * With this bare createServer setup (rather than `next start`), an error that
 * Next throws out of `handle` is not turned into a response: it escapes as an
 * unhandled rejection with a full stack trace in stderr.log, and the client is
 * left waiting. Bot traffic made that routine — `NoFallbackError` from routes
 * with `dynamicParams = false` filled stderr.log to 1.8 MB before those routes
 * were switched to `true` on 18 Sep 2026.
 *
 * Any such error now gets one log line and a plain 500, so the next surprise is
 * visible without burying the log. Normal 404s never reach this: Next renders
 * those itself.
 */
async function handleSafely(req, res) {
  try {
    await handle(req, res);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    // Once headers are out the status can't change; say so rather than
    // logging a 500 the client never received.
    const outcome = res.headersSent ? "response cut short" : "500";
    console.error(`[server] ${req.method} ${req.url} -> ${outcome}: ${message}`);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    } else {
      res.end();
    }
  }
}

app.prepare().then(() => {
  createServer(handleSafely).listen(port, () => {
    console.log(`> Ready on port ${port}`);
  });
});

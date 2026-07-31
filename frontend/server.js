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

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> Ready on port ${port}`);
  });
});

/**
 * Entry point for hosts (cPanel/CloudLinux "Node.js Selector", Passenger,
 * LiteSpeed's lsnode, etc.) that start the app as `node server.js`.
 *
 * Strapi is booted **in-process**, not by shelling out to `npm start`. Those
 * wrappers hand the app a socket to listen on and only wrap the process they
 * spawned; a child process never inherits that arrangement, so Strapi would
 * bind plain TCP :1337 while the web server waited forever on a socket nobody
 * was listening to — the app is up, every request times out, and the logs look
 * completely healthy. Booting in-process keeps Strapi in the process the
 * wrapper is actually managing.
 *
 * Requires `npm run build` to have already run (or a prebuilt `dist/` to have
 * been uploaded) — this only serves what's in dist/, matching `tsconfig.json`'s
 * outDir.
 */
const path = require("path");
const { createStrapi } = require("@strapi/strapi");

createStrapi({
  appDir: __dirname,
  distDir: path.join(__dirname, "dist"),
}).start();

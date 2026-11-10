import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { pageRoutes, publicRoot, renderPage } from "./render-page.mjs";

const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }

  const route =
    pathname === "/index.html" ? "/" : pathname.replace(/\/$/, "") || "/";
  if (pageRoutes.includes(route)) {
    try {
      const markup = await renderPage(route);
      response.writeHead(200, {
        "Content-Type": types[".html"],
        "Content-Length": Buffer.byteLength(markup),
        "Cache-Control": "no-cache",
      });
      response.end(request.method === "HEAD" ? undefined : markup);
    } catch (error) {
      console.error(error);
      response.writeHead(500).end();
    }
    return;
  }

  const file = resolve(publicRoot, `.${pathname}`);
  const fromRoot = relative(publicRoot, file);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    response.writeHead(404).end();
    return;
  }

  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    "Content-Type": types[extname(file)] || "application/octet-stream",
    "Content-Length": info.size,
    "Cache-Control": "no-cache",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file)
    .on("error", () => response.destroy())
    .pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Демо: http://127.0.0.1:${port}/`);
});

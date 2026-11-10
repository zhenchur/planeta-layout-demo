import { cp, lstat, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { pageRoutes, publicRoot, renderPage } from "./render-page.mjs";

const { values } = parseArgs({
  options: { base: { type: "string", default: "/" } },
});
const rawBase = values.base;
if (
  !/^\/(?:[\w.-]+(?:\/[\w.-]+)*\/?)?$/.test(rawBase) ||
  rawBase.split("/").some((segment) => segment === "." || segment === "..")
) {
  throw new Error("Expected a base path such as / or /moltek-demo/.");
}
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
const output = fileURLToPath(new URL("./dist", import.meta.url));

function rebaseCss(css) {
  return css.replace(/(\burl\(\s*(?:["']|&quot;|&#39;)?)\/(?!\/)/gi, `$1${base}`);
}

function rebaseHtml(html) {
  return rebaseCss(html)
    .replace(/(\s(?:href|src|poster|xlink:href)\s*=\s*["'])\/(?!\/)/gi, `$1${base}`)
    .replace(/(\ssrcset\s*=\s*)(["'])(.*?)\2/gis, (_, attribute, quote, srcset) =>
      `${attribute}${quote}${srcset.replace(/(^\s*|,\s+)\/(?!\/)/g, `$1${base}`)}${quote}`,
    );
}

// The output is the script's own dist directory, independent of the caller's cwd.
const existingOutput = await lstat(output).catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return null;
});
if (existingOutput?.isSymbolicLink()) {
  throw new Error(`Refusing to replace symlink: ${output}`);
}
await rm(output, { recursive: true, force: true });
await cp(publicRoot, output, {
  recursive: true,
  filter: (source) => !source.endsWith(".html"),
});

if (base !== "/") {
  const files = await readdir(output, { recursive: true });
  await Promise.all(files.filter((file) => file.endsWith(".css")).map(async (file) => {
    const path = join(output, file);
    const css = await readFile(path, "utf8");
    await writeFile(path, rebaseCss(css));
  }));
}

await Promise.all(pageRoutes.map(async (route) => {
  const directory = join(output, route.slice(1));
  const html = rebaseHtml(await renderPage(route));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), html);
}));
await writeFile(join(output, ".nojekyll"), "");

console.log(`Built ${pageRoutes.length} pages for ${base} in ${output}`);

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));

const stageOrigin = "https://stage-frontend-leto.planeta-mall.ru";
const interiorPages = new Map([
  [
    "/vacancies",
    {
      fragment: "vacancies.html",
      title: "Подпишись и находи работу мечты рядом! — ТРЦ «Планета» Пермь",
    },
  ],
  [
    "/news/article_95088",
    { fragment: "stroller-rental.html", title: "Прокат колясок для собак" },
  ],
]);

export const pageRoutes = ["/", ...interiorPages.keys()];

export async function renderPage(route) {
  const page = interiorPages.get(route);
  let markup = await readFile(resolve(publicRoot, "index.html"), "utf8");
  if (page) {
    const fragment = await readFile(
      resolve(publicRoot, "pages", page.fragment),
      "utf8",
    );
    markup = markup
      .replace(/<main class="main-content">[\s\S]*?<\/main>/, () =>
        fragment.trim(),
      )
      .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
      .replace(
        "</head>",
        '  <link rel="stylesheet" href="/pages/content.css" />\n  </head>',
      );
  }

  for (const localRoute of interiorPages.keys()) {
    markup = markup.replaceAll(
      `href="${stageOrigin}${localRoute}"`,
      `href="${localRoute}"`,
    );
  }
  return markup;
}

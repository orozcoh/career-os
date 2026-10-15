import { createServer, type Server } from "node:http";
import { copyFile, mkdir } from "node:fs/promises";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium, type Browser } from "playwright";
import {
  findRepoRoot,
  loadTemplates,
  LOCALE_STORAGE_KEY,
  repoPaths,
  SUPPORTED_LOCALES,
} from "@career/core";

/**
 * Prints each built resume page to PDF with headless Chromium.
 *
 * Why Chromium: it produces real, selectable, machine-readable text in DOM
 * order — exactly what ATS parsers extract — and it prints the very same
 * HTML the website serves, so the PDF and the online version never diverge.
 * Page geometry comes from the print stylesheet (@page { size: A4 }).
 *
 * Uses the locally installed Google Chrome when available; falls back to
 * Playwright's bundled Chromium (CI: `pnpm exec playwright install chromium`).
 */

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

/** Minimal static server for website/dist — mirrors production path layout. */
function serveStatic(root: string): Server {
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
    if (path.startsWith("..")) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let file = join(root, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME_TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    console.log("  (system Chrome not found, using Playwright's Chromium)");
    return await chromium.launch();
  }
}

async function main(): Promise<void> {
  const paths = repoPaths(findRepoRoot());
  if (!existsSync(join(paths.websiteDist, "index.html"))) {
    throw new Error("website/dist not found — run `pnpm build:site` first.");
  }

  const templates = await loadTemplates(paths.templatesDir);

  const server = serveStatic(paths.websiteDist);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await launchBrowser();
  try {
    for (const locale of SUPPORTED_LOCALES) {
      // The site defaults to the browser locale on first visit; headless
      // Chromium reports en-US, which would redirect /es/… to /en/… and
      // produce English PDFs. Seed the stored preference per locale so the
      // detection script stays quiet, and match the context locale too.
      const context = await browser.newContext({
        locale: locale === "en" ? "en-US" : "es-ES",
      });
      await context.addInitScript(
        ({ key, value }) => {
          localStorage.setItem(key, value);
        },
        { key: LOCALE_STORAGE_KEY, value: locale },
      );
      const page = await context.newPage();

      const pdfDir = join(paths.generatedDir, locale, "pdf");
      const distResumesDir = join(paths.websiteDist, locale, "resumes");
      const publicResumesDir = join(paths.websitePublic, locale, "resumes");
      await Promise.all([pdfDir, distResumesDir, publicResumesDir].map((dir) => mkdir(dir, { recursive: true })));

      for (const template of templates) {
        const { slug } = template;
        await page.goto(`${baseUrl}/${locale}/${slug}`, { waitUntil: "networkidle" });

        // 1. Standard 1-column ATS PDF
        const out1Col = join(pdfDir, `${slug}.pdf`);
        await page.pdf({
          path: out1Col,
          format: "A4",
          preferCSSPageSize: true, // @page { size: A4 } in the print stylesheet wins
          printBackground: true,
          tagged: true,
        });

        await copyFile(out1Col, join(distResumesDir, `${slug}.pdf`));
        await copyFile(out1Col, join(publicResumesDir, `${slug}.pdf`));
        console.log(`  ✓ ${locale}/${slug}.pdf (1 column)`);

        // 2. ATS-valid 2-column PDF (linear DOM order + CSS Grid print rules)
        await page.locator("article.resume").evaluate((el) => {
          el.setAttribute("data-columns", "2");
        });

        const out2Col = join(pdfDir, `${slug}-2col.pdf`);
        await page.pdf({
          path: out2Col,
          format: "A4",
          preferCSSPageSize: true,
          printBackground: true,
          tagged: true,
        });

        await copyFile(out2Col, join(distResumesDir, `${slug}-2col.pdf`));
        await copyFile(out2Col, join(publicResumesDir, `${slug}-2col.pdf`));
        console.log(`  ✓ ${locale}/${slug}-2col.pdf (2 columns)`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(
    `\nGenerated ${templates.length * 2} PDFs (1-col + 2-col) × ${SUPPORTED_LOCALES.length} locales into ${paths.generatedDir}`,
  );
}

main().catch((error: unknown) => {
  console.error(`\nPDF generation failed.\n${error instanceof Error ? (error.stack ?? error.message) : error}`);
  process.exit(1);
});

import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  findRepoRoot,
  loadAllLocales,
  loadCareerData,
  loadTemplates,
  renderDocx,
  renderMarkdown,
  repoPaths,
  resolveAll,
  SUPPORTED_LOCALES,
} from "@career/core";

/**
 * Generates every non-site artifact from the YAML data, organized by locale:
 *   generated/{locale}/markdown/<slug>.md
 *   generated/{locale}/docx/<slug>.docx        (+ staged into website/dist/{locale}/resumes/)
 *   generated/{locale}/html/<slug>.html        (copied from the built site)
 *
 * Must run AFTER `astro build` (website/dist must exist).
 * PDFs are produced separately by scripts/pdf.ts.
 */
async function main(): Promise<void> {
  const paths = repoPaths(findRepoRoot());
  if (!existsSync(join(paths.websiteDist, "index.html"))) {
    throw new Error("website/dist not found — run `pnpm build:site` first.");
  }

  const [data, templates, locales] = await Promise.all([
    loadCareerData(paths.dataDir),
    loadTemplates(paths.templatesDir),
    loadAllLocales(SUPPORTED_LOCALES),
  ]);
  const resumes = resolveAll(data, templates);

  for (const locale of SUPPORTED_LOCALES) {
    const localeFile = locales[locale];
    const markdownDir = join(paths.generatedDir, locale, "markdown");
    const docxDir = join(paths.generatedDir, locale, "docx");
    const htmlDir = join(paths.generatedDir, locale, "html");
    const distResumesDir = join(paths.websiteDist, locale, "resumes");
    
    await Promise.all(
      [markdownDir, docxDir, htmlDir, distResumesDir].map((dir) =>
        mkdir(dir, { recursive: true }),
      ),
    );

    for (const resume of resumes) {
      const { slug } = resume.template;

      await writeFile(join(markdownDir, `${slug}.md`), renderMarkdown(resume, localeFile, locale));

      const docx = await renderDocx(resume, localeFile, locale);
      await writeFile(join(docxDir, `${slug}.docx`), docx);
      await copyFile(join(docxDir, `${slug}.docx`), join(distResumesDir, `${slug}.docx`));

      // The built site page is the single HTML source — archive it verbatim.
      await copyFile(
        join(paths.websiteDist, locale, slug, "index.html"),
        join(htmlDir, `${slug}.html`),
      );

      console.log(`  ✓ ${locale}/${slug}: markdown, docx, html`);
    }

    await copyFile(join(paths.websiteDist, locale, "index.html"), join(htmlDir, "index.html"));
  }

  console.log(`\nGenerated ${resumes.length} resumes × ${SUPPORTED_LOCALES.length} locales into ${paths.generatedDir}`);
}

main().catch((error: unknown) => {
  console.error(`\nGeneration failed.\n${error instanceof Error ? (error.stack ?? error.message) : error}`);
  process.exit(1);
});

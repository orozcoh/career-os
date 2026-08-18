import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Astro integration that stages generated PDF/DOCX resumes into the site's
 * `public/` directory so download links (`/<locale>/resumes/<slug>.pdf|.docx`)
 * resolve in any build or dev server.
 *
 * `astro build` copies `public/` → `dist/`, so staging here means a bare
 * `astro build` (or `pnpm build:site`) already produces a deployable
 * `website/dist` that includes the resumes — no separate post-build step
 * required. `astro dev` serves `public/` directly, so downloads work locally
 * too.
 *
 * The source of truth is the committed `generated/` tree (kept fresh by the
 * full `pnpm build` pipeline via scripts/generate.ts + scripts/pdf.ts).
 */
export function stageResumes() {
  return {
    name: "stage-resumes",
    hooks: {
      "astro:config:setup": () => stageGeneratedResumes(),
    },
  };
}

async function stageGeneratedResumes() {
  // Anchor from this module's location so it works regardless of cwd.
  const websiteDir = fileURLToPath(new URL("../..", import.meta.url));
  const root = findRepoRoot(websiteDir);
  const generatedDir = join(root, "generated");
  const publicDir = join(root, "website", "public");

  if (!existsSync(generatedDir)) {
    console.warn("  [stage-resumes] generated/ not found — skipping resume staging");
    return;
  }

  const locales = (await readdir(generatedDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const locale of locales) {
    const resumesDir = join(publicDir, locale, "resumes");
    await rm(resumesDir, { recursive: true, force: true });
    await mkdir(resumesDir, { recursive: true });

    for (const format of ["pdf", "docx"]) {
      const sourceDir = join(generatedDir, locale, format);
      if (!existsSync(sourceDir)) continue;
      for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(`.${format}`)) continue;
        await copyFile(join(sourceDir, entry.name), join(resumesDir, entry.name));
      }
    }

    console.log(`  [stage-resumes] staged ${locale}/resumes`);
  }
}

function findRepoRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate repo root (pnpm-workspace.yaml) from ${startDir}`);
    }
    dir = parent;
  }
}
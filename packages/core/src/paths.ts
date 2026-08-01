import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Walks up from `startDir` until it finds the workspace root
 * (identified by pnpm-workspace.yaml). Works regardless of which
 * workspace member's cwd the process was started from.
 */
export function findRepoRoot(startDir: string = process.cwd()): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not locate repo root (pnpm-workspace.yaml) starting from ${startDir}`,
      );
    }
    dir = parent;
  }
}

export interface RepoPaths {
  root: string;
  dataDir: string;
  templatesDir: string;
  generatedDir: string;
  websiteDist: string;
}

/** Canonical repo layout. Overridable via env for tests and future tooling. */
export function repoPaths(root: string = findRepoRoot()): RepoPaths {
  return {
    root,
    dataDir: process.env["CAREER_DATA_DIR"] ?? join(root, "data"),
    templatesDir: process.env["CAREER_TEMPLATES_DIR"] ?? join(root, "templates"),
    generatedDir: join(root, "generated"),
    websiteDist: join(root, "website", "dist"),
  };
}

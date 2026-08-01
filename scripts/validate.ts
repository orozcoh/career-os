import {
  findRepoRoot,
  loadCareerData,
  loadTemplates,
  repoPaths,
  resolveAll,
} from "@career/core";

/**
 * Validates every YAML file in data/ and templates/ against the Zod schemas,
 * then resolves all templates to prove filtering works end to end.
 * Run directly with `pnpm validate`; also the first step of `pnpm build`.
 */
async function main(): Promise<void> {
  const paths = repoPaths(findRepoRoot());
  console.log(`Validating data in ${paths.dataDir}`);

  const [data, templates] = await Promise.all([
    loadCareerData(paths.dataDir),
    loadTemplates(paths.templatesDir),
  ]);

  const resumes = resolveAll(data, templates);

  console.log(
    `\n${resumes.length} templates resolved from ${data.experience.length} roles, ` +
      `${data.projects.length} projects, ${data.skills.length} skill categories:\n`,
  );
  for (const r of resumes) {
    const bullets = r.experience.reduce((n, role) => n + role.bullets.length, 0);
    console.log(
      `  ✓ ${r.template.slug.padEnd(20)} ` +
        `${r.experience.length} roles (${bullets} bullets), ` +
        `${r.projects.length} projects, ` +
        `${r.skills.length} skill categories`,
    );
  }
  console.log("\nValidation passed.");
}

main().catch((error: unknown) => {
  console.error(`\nValidation failed.\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

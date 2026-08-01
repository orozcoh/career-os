import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ZodType } from "zod";
import {
  educationListSchema,
  experienceSchema,
  languagesSchema,
  profileSchema,
  projectsSchema,
  skillsSchema,
  templateSchema,
} from "../schema/index";
import type {
  Education,
  Language,
  Profile,
  Project,
  Role,
  SkillCategory,
  Template,
} from "../schema/index";

export interface CareerData {
  profile: Profile;
  experience: Role[];
  projects: Project[];
  education: Education[];
  skills: SkillCategory[];
  languages: Language[];
}

async function loadYamlFile<T>(path: string, schema: ZodType<T>): Promise<T> {
  const raw = await readFile(path, "utf8");
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (cause) {
    throw new Error(`YAML syntax error in ${path}: ${(cause as Error).message}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid data in ${path}:\n${issues}`);
  }
  return result.data;
}

/** Loads and validates every file in dataDir. Throws with precise locations on error. */
export async function loadCareerData(dataDir: string): Promise<CareerData> {
  const [profile, experience, projects, education, skills, languages] =
    await Promise.all([
      loadYamlFile(join(dataDir, "profile.yaml"), profileSchema),
      loadYamlFile(join(dataDir, "experience.yaml"), experienceSchema),
      loadYamlFile(join(dataDir, "projects.yaml"), projectsSchema),
      loadYamlFile(join(dataDir, "education.yaml"), educationListSchema),
      loadYamlFile(join(dataDir, "skills.yaml"), skillsSchema),
      loadYamlFile(join(dataDir, "languages.yaml"), languagesSchema),
    ]);
  return { profile, experience, projects, education, skills, languages };
}

/**
 * Loads every templates/<name>/template.yaml, sorted by each template's
 * `order` field (ties broken by slug) so the landing page and generated
 * outputs have a stable, intentional sequence.
 */
export async function loadTemplates(templatesDir: string): Promise<Template[]> {
  const entries = await readdir(templatesDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const templates = await Promise.all(
    dirs.map((dir) => loadYamlFile(join(templatesDir, dir, "template.yaml"), templateSchema)),
  );
  templates.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

  const slugs = new Set<string>();
  for (const t of templates) {
    if (slugs.has(t.slug)) {
      throw new Error(`Duplicate template slug "${t.slug}" in ${templatesDir}`);
    }
    slugs.add(t.slug);
  }
  return templates;
}

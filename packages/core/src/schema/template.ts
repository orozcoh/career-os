import { z } from "zod";
import { localizedTextSchema } from "./locale";

export const sectionIdSchema = z.enum([
  "summary",
  "experience",
  "projects",
  "skills",
  "education",
  "languages",
]);

/**
 * How projects are rendered inside this template.
 *   compact  — name + tagline + highlights + inline technologies (no description, no links)
 *   standard — name + tagline + description + highlights + technologies + links (links hidden in print)
 *   complete — everything, including links in every output format
 */
export const projectLayoutSchema = z.enum(["compact", "standard", "complete"]);

/**
 * A template is configuration only: it selects content from the shared data,
 * never defines content of its own (summary_override / title_override are the
 * deliberate exceptions — they tailor framing, not facts).
 */
export const templateSchema = z.object({
  id: z.string().min(1),
  /** Display name used on the website landing card. */
  name: localizedTextSchema,
  /** URL + filename slug, e.g. "software-engineer" → /software-engineer */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected kebab-case"),
  description: localizedTextSchema,
  title_override: localizedTextSchema.nullable().default(null),
  summary_override: localizedTextSchema.nullable().default(null),
  /** ["*"] disables filtering (master resume). */
  include_tags: z.array(z.string().min(1)).min(1),
  exclude_tags: z.array(z.string().min(1)).default([]),
  /** null = no limit. Bullets are taken in file order (most important first). */
  max_bullets_per_role: z.number().int().positive().nullable().default(null),
  /**
   * How projects are rendered: compact, standard, or complete.
   * Defaults to "complete" so existing templates keep their current behavior.
   */
  project_layout: projectLayoutSchema.default("complete"),
  /** null = show every education highlight; 0 = none. */
  max_education_highlights: z.number().int().nonnegative().nullable().default(null),
  /** Section render order. */
  sections: z.array(sectionIdSchema).min(1),
  /** Landing-page card order (ascending). Convention: targeted variants first, master last. */
  order: z.number().int().default(100),
  skills: z
    .object({
      /** null = include every skill; otherwise keep skills with intersecting tags. */
      filter_tags: z.array(z.string().min(1)).nullable().default(null),
    })
    .default({ filter_tags: null }),
});

export type SectionId = z.infer<typeof sectionIdSchema>;
export type ProjectLayout = z.infer<typeof projectLayoutSchema>;
export type Template = z.infer<typeof templateSchema>;

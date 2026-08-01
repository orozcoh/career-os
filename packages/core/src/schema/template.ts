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
export type Template = z.infer<typeof templateSchema>;

import { z } from "zod";
import { taggedBulletSchema } from "./experience";
import { localizedTextSchema } from "./locale";

export const projectLinkSchema = z.object({
  label: localizedTextSchema,
  url: z.string().min(1),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: localizedTextSchema,
  description: localizedTextSchema,
  technologies: z.array(z.string().min(1)).default([]),
  links: z.array(projectLinkSchema).default([]),
  tags: z.array(z.string().min(1)).default([]),
  highlights: z.array(taggedBulletSchema).default([]),
});

export const projectsSchema = z.array(projectSchema);

export type ProjectLink = z.infer<typeof projectLinkSchema>;
export type Project = z.infer<typeof projectSchema>;

import { z } from "zod";
import { localizedTextSchema } from "./locale";

export const skillSchema = z.object({
  name: localizedTextSchema,
  tags: z.array(z.string().min(1)).default([]),
});

export const skillCategorySchema = z.object({
  category: localizedTextSchema,
  items: z.array(skillSchema).min(1),
});

export const skillsSchema = z.array(skillCategorySchema);

export type Skill = z.infer<typeof skillSchema>;
export type SkillCategory = z.infer<typeof skillCategorySchema>;

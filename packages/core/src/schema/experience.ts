import { z } from "zod";
import { localizedTextSchema } from "./locale";

export const employmentTypeSchema = z.enum([
  "full-time",
  "part-time",
  "contract",
  "freelance",
  "internship",
  "self-employed",
]);

/** A "YYYY-MM" month string, e.g. "2023-03". */
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM");

export const taggedBulletSchema = z.object({
  text: localizedTextSchema,
  tags: z.array(z.string().min(1)).default([]),
});

export const roleSchema = z.object({
  id: z.string().min(1),
  title: localizedTextSchema,
  /** Localized company name; a locale may be empty when the title already conveys it. */
  company: localizedTextSchema,
  employment_type: employmentTypeSchema,
  location: z.string().min(1),
  start: monthSchema,
  /** null = Present */
  end: monthSchema.nullable(),
  tags: z.array(z.string().min(1)).default([]),
  bullets: z.array(taggedBulletSchema).default([]),
});

export const experienceSchema = z.array(roleSchema);

export type EmploymentType = z.infer<typeof employmentTypeSchema>;
export type TaggedBullet = z.infer<typeof taggedBulletSchema>;
export type Role = z.infer<typeof roleSchema>;

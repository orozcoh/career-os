import { z } from "zod";
import { localizedTextSchema } from "./locale";

/** Education dates accept both YYYY and YYYY-MM formats. */
const yearSchema = z.string().regex(/^\d{4}(-\d{2})?$/, "Expected YYYY or YYYY-MM");

export const educationSchema = z.object({
  id: z.string().min(1),
  institution: z.string().min(1),
  degree: localizedTextSchema,
  field: localizedTextSchema,
  location: z.string().min(1),
  start: yearSchema,
  /** null = Present / in progress */
  end: yearSchema.nullable(),
  highlights: z.array(localizedTextSchema).default([]),
});

export const educationListSchema = z.array(educationSchema);

export type Education = z.infer<typeof educationSchema>;

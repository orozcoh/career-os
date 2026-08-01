import { z } from "zod";
import { localizedTextSchema } from "./locale";

export const proficiencySchema = z.enum([
  "native",
  "fluent",
  "professional",
  "intermediate",
  "basic",
]);

export const languageSchema = z.object({
  name: localizedTextSchema,
  proficiency: proficiencySchema,
});

export const languagesSchema = z.array(languageSchema);

export type Proficiency = z.infer<typeof proficiencySchema>;
export type Language = z.infer<typeof languageSchema>;

import { z } from "zod";
import { localizedTextSchema } from "./locale";

export const profileSchema = z.object({
  name: z.string().min(1),
  title: localizedTextSchema,
  summary_short: localizedTextSchema,
  summary: localizedTextSchema,
  location: z.string().min(1),
  email: z.string().min(1),
  linkedin: z.string().min(1),
  github: z.string().min(1),
  website: z.string().min(1),
  cv: z.string().min(1),
});

export type Profile = z.infer<typeof profileSchema>;

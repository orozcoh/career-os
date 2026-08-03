import { z } from "zod";

/**
 * Zod schemas for the analytics boundary. `.strict()` everywhere is
 * deliberate: it is the mechanical enforcement of the privacy contract —
 * an event carrying an `ip`, coordinates, or any other extra field
 * fails validation and can never reach a sink.
 */

const isoTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "Expected ISO 8601 UTC");

const baseShape = {
  timestamp: isoTimestampSchema,
  session_id: z.string().min(8),
  language: z.enum(["en", "es"]),
  country: z.string().min(1).nullable(),
  city: z.string().min(1).nullable(),
  region: z.string().min(1).nullable(),
  continent: z.string().min(1).nullable(),
  referrer: z.string().min(1).nullable(),
  user_agent: z.string().min(1).nullable(),
  version: z.string().min(1),
};

const signalBase = {
  language: z.enum(["en", "es"]),
  session_id: z.string().min(8),
};

export const trackedEventSchema = z.discriminatedUnion("type", [
  z.object({ ...baseShape, type: z.literal("page_view"), path: z.string().min(1), resume: z.null() }).strict(),
  z.object({ ...baseShape, type: z.literal("resume_open"), resume: z.string().min(1) }).strict(),
  z.object({ ...baseShape, type: z.literal("resume_view"), resume: z.string().min(1) }).strict(),
  z.object({
    ...baseShape,
    type: z.literal("resume_download"),
    resume: z.string().min(1),
    format: z.enum(["pdf", "docx"]),
  }).strict(),
  z.object({
    ...baseShape,
    type: z.literal("outbound_click"),
    target: z.string().min(1),
    resume: z.string().min(1).nullable(),
  }).strict(),
]);

export const clientSignalSchema = z.discriminatedUnion("type", [
  z.object({ ...signalBase, type: z.literal("page_view"), path: z.string().min(1) }).strict(),
  z.object({ ...signalBase, type: z.literal("resume_open"), resume: z.string().min(1) }).strict(),
  z.object({ ...signalBase, type: z.literal("resume_view"), resume: z.string().min(1) }).strict(),
  z.object({
    ...signalBase,
    type: z.literal("resume_download"),
    resume: z.string().min(1),
    format: z.enum(["pdf", "docx"]),
  }).strict(),
  z.object({
    ...signalBase,
    type: z.literal("outbound_click"),
    target: z.string().min(1),
    resume: z.string().min(1).nullable(),
  }).strict(),
]);

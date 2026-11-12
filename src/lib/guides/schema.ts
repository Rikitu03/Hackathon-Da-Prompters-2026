import { z } from "zod";

const text = z.string().trim().min(1).max(300);
const httpsUrl = z.string().trim().max(2000).refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a complete https:// URL");
const date = z.union([z.literal(""), z.string().date()]);
export const guideSchema = z.object({
  programId: z.string().uuid().optional(),
  cycleId: z.string().uuid().optional(),
  title: text,
  description: z.string().trim().max(6000),
  academicYear: text,
  applicationStart: date,
  applicationEnd: date,
  officialUrl: httpsUrl,
  requirements: z.array(z.object({
    id: z.string().uuid().optional(), title: text,
    description: z.string().trim().max(6000), required: z.boolean(),
    steps: z.array(z.string().trim().min(1).max(2000)).max(20),
    faqs: z.array(z.object({ question: text, answer: z.string().trim().min(1).max(3000) })).max(20),
  })).max(30),
  sources: z.array(z.object({
    id: z.string().uuid().optional(), title: text, url: httpsUrl, content: z.string().trim().max(30000), approved: z.boolean(),
  })).max(10),
}).strict().refine((guide) => !guide.applicationStart || !guide.applicationEnd || guide.applicationEnd >= guide.applicationStart,
  { message: "The closing date must be on or after the opening date", path: ["applicationEnd"] });

export type GuideDraft = z.infer<typeof guideSchema>;
export type GuideDocument = GuideDraft & { programId: string; cycleId: string; status: string };
export const emptyGuide: GuideDraft = {
  title: "", description: "", academicYear: "", applicationStart: "", applicationEnd: "", officialUrl: "",
  requirements: [], sources: [],
};

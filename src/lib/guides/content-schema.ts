import { z } from "zod";
import { guideSchema } from "./schema";

const shape = guideSchema.innerType().shape;
const cycle = z.object({
  action: z.literal("save_cycle"), programId: z.string().uuid(), cycleId: z.string().uuid().optional(),
  academicYear: shape.academicYear, applicationStart: shape.applicationStart,
  applicationEnd: shape.applicationEnd, officialUrl: shape.officialUrl,
}).strict().refine((value) => !value.applicationStart || !value.applicationEnd || value.applicationEnd >= value.applicationStart,
  { path: ["applicationEnd"], message: "The closing date must be on or after the opening date" });
const requirement = shape.requirements.element.omit({ id: true }).extend({
  action: z.literal("save_requirement"), cycleId: z.string().uuid(), requirementId: z.string().uuid().optional(),
}).strict();
const source = shape.sources.element.omit({ id: true }).extend({
  action: z.literal("save_source"), cycleId: z.string().uuid(), sourceId: z.string().uuid().optional(),
}).strict().refine((value) => !value.approved || Boolean(value.content && value.url), {
  message: "Approval requires an HTTPS source URL and reviewed reference text", path: ["approved"],
});
export const contentSchema = z.union([cycle, requirement, source]);

import { z } from "zod";

export const draftFieldsSchema = z.object({
  fullName: z.string().trim().max(200), email: z.union([z.literal(""), z.string().email().max(254)]),
  mobile: z.string().trim().max(40), school: z.string().trim().max(250),
  educationLevel: z.string().trim().max(150), barangay: z.string().trim().max(150), notes: z.string().trim().max(2000),
}).strict();
export const localDraftSchema = z.object({
  version: z.literal(1), cycleId: z.string().min(1).max(150), programId: z.string().min(1).max(150),
  updatedAt: z.string().datetime(), fields: draftFieldsSchema,
}).strict();
export type DraftFields = z.infer<typeof draftFieldsSchema>;
export type LocalDraft = z.infer<typeof localDraftSchema>;
export const blankDraftFields: DraftFields = { fullName: "", email: "", mobile: "", school: "", educationLevel: "", barangay: "", notes: "" };
const DATABASE = "gabayiskolar-private-drafts-v1";

async function storage<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (typeof indexedDB === "undefined") throw new Error("Local draft storage is unavailable in this browser");
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts", { keyPath: "cycleId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Could not open local draft storage"));
    request.onblocked = () => reject(new Error("Close other GabayIskolar tabs and try again"));
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction("drafts", mode);
      const request = operation(transaction.objectStore("drafts"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error("Local draft storage failed. Your changes have not been saved."));
    });
  } finally { database.close(); }
}
export async function loadLocalDraft(cycleId: string): Promise<LocalDraft | null> {
  const value: unknown = await storage("readonly", (store) => store.get(cycleId));
  return value === undefined ? null : localDraftSchema.parse(value);
}
export async function saveLocalDraft(value: LocalDraft) {
  const validated = localDraftSchema.parse(value);
  await storage("readwrite", (store) => store.put(validated));
}
export async function deleteLocalDraft(cycleId: string) { await storage("readwrite", (store) => store.delete(cycleId)); }

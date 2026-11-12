export type SniffedMediaType = "application/pdf" | "image/png" | "image/jpeg" | "image/tiff" | "image/webp";

/** Identify a file from its first bytes. Never trust the browser-supplied MIME type. */
export function detectMediaType(head: Uint8Array): SniffedMediaType | null {
  const at = (offset: number, sig: number[]) => sig.every((byte, i) => head[offset + i] === byte);
  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (at(0, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (at(0, [0x49, 0x49, 0x2a, 0x00]) || at(0, [0x4d, 0x4d, 0x00, 0x2a])) return "image/tiff";
  return null;
}

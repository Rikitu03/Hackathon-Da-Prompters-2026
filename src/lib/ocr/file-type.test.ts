import { describe, expect, it } from "vitest";
import { detectMediaType } from "./file-type";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("detectMediaType", () => {
  it.each([
    [bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg"],
    [bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png"],
    [bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "application/pdf"],
    [bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50), "image/webp"],
    [bytes(0x49, 0x49, 0x2a, 0x00), "image/tiff"],
    [bytes(0x4d, 0x4d, 0x00, 0x2a), "image/tiff"],
  ] as const)("detects %s", (head, type) => {
    expect(detectMediaType(head)).toBe(type);
  });

  it("rejects text renamed as an image", () => {
    expect(detectMediaType(new TextEncoder().encode("hello, not a png"))).toBeNull();
  });

  it("rejects RIFF files that are not WebP", () => {
    expect(detectMediaType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45))).toBeNull();
  });
});

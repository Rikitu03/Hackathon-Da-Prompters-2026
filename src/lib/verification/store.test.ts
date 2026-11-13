import { describe, expect, it } from "vitest";
import { recordFromSample } from "./analyze";
import { createRecordStore, storageKeyFor } from "./store";

const NOW = new Date(2026, 10, 13);
const memory = () => {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
};
const COR = recordFromSample("certificate_of_registration", "clean", NOW);
const ID = recordFromSample("school_id", "clean", NOW);

describe("record store", () => {
  it("saves per cycle under a versioned key", () => {
    const s = memory(), store = createRecordStore(() => s);
    expect(store.save("cycle-a", COR)).toBe(true);
    expect(store.read("cycle-a").certificate_of_registration).toEqual(COR);
    expect(store.read("cycle-b")).toEqual({});
    expect([...s.m.keys()]).toEqual(["gabayiskolar:verification:v1:cycle-a"]);
  });

  it("returns a stable snapshot until data changes", () => {
    const store = createRecordStore(() => memory());
    const a = store.read("c");
    expect(store.read("c")).toBe(a);
    store.save("c", COR);
    expect(store.read("c")).not.toBe(a);
  });

  it("notifies subscribers on save and clear", () => {
    const store = createRecordStore(() => memory()), calls: number[] = [];
    const off = store.subscribe(() => calls.push(1));
    store.save("c", COR);
    store.clear("c");
    off();
    store.save("c", COR);
    expect(calls).toHaveLength(2);
  });

  it("reads what an earlier visit to the same tab saved", () => {
    const s = memory();
    createRecordStore(() => s).save("c", COR);
    expect(createRecordStore(() => s).read("c").certificate_of_registration).toEqual(COR);
  });

  it("ignores corrupt or invalid stored data", () => {
    const s = memory();
    s.setItem(storageKeyFor("c"), "{not json");
    expect(createRecordStore(() => s).read("c")).toEqual({});
    s.setItem(storageKeyFor("d"), JSON.stringify({ certificate_of_registration: { nope: 1 }, school_id: ID, hacker: ID }));
    expect(Object.keys(createRecordStore(() => s).read("d"))).toEqual(["school_id"]);
    s.setItem(storageKeyFor("e"), JSON.stringify({ certificate_of_registration: ID }));
    expect(createRecordStore(() => s).read("e")).toEqual({});
    s.setItem(storageKeyFor("f"), "[1,2]");
    expect(createRecordStore(() => s).read("f")).toEqual({});
  });

  it("keeps working in memory when storage throws or is missing", () => {
    const throwing = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("quota"); },
      removeItem: () => { throw new Error("denied"); },
    };
    for (const store of [createRecordStore(() => throwing), createRecordStore(() => null)]) {
      expect(store.save("c", COR)).toBe(false);
      expect(store.read("c").certificate_of_registration).toEqual(COR);
      expect(() => store.clear("c")).not.toThrow();
      expect(store.read("c")).toEqual({});
    }
  });

  it("clear removes only that cycle", () => {
    const store = createRecordStore(() => memory());
    store.save("a", COR);
    store.save("b", COR);
    store.clear("a");
    expect([store.read("a"), Object.keys(store.read("b"))]).toEqual([{}, ["certificate_of_registration"]]);
  });
});

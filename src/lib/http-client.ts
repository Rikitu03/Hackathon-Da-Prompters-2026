export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const result = await response.json();
  if (!response.ok) throw new HttpError(response.status, result.error ?? `Request failed (${response.status})`);
  return result as T;
}

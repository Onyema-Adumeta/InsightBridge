// src/lib/api.ts

/**
 * Centralized API helpers.
 * - In the BROWSER: always hit the Next.js proxy route (/api/…)
 *   so the proxy can append Clerk user_id before forwarding.
 * - On the SERVER (Node): you may call the FastAPI origin directly.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const isBrowser = typeof window !== "undefined";

// Use proxy in browser; origin only when running on the server.
const UPLOAD_URL = isBrowser
  ? "/api/v1/main/upload_and_analyze"
  : `${API_BASE}/api/v1/main/upload_and_analyze`;

/**
 * Upload a single file for analysis.
 * NOTE: Do NOT append user_id here; the Next.js proxy handles that.
 */
export async function uploadAndAnalyzeFile(file: File): Promise<any> {
  if (!file) throw new Error("No file selected");

  const fd = new FormData();
  fd.append("file", file); // FastAPI expects field name "file"

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: fd, // Do NOT set Content-Type manually for FormData
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`upload_and_analyze failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Upload using a prebuilt FormData (e.g., multiple files in the future).
 * Still routes through the proxy in browser.
 */
export async function uploadAndAnalyzeFormData(fd: FormData): Promise<any> {
  if (!fd || !(fd instanceof FormData)) {
    throw new Error("FormData is required");
  }

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`upload_and_analyze failed (${res.status}): ${text}`);
  }
  return res.json();
}

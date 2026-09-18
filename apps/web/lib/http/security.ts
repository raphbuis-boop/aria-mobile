import { createHmac, timingSafeEqual } from "node:crypto";

export function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyBearerSecret(request: Request, secret?: string) {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return timingSafeStringEqual(token, secret);
}

export function verifyHmacSha256(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const provided = signature.replace(/^sha256=/, "");
  return timingSafeStringEqual(expected, provided);
}

export async function readJson<T>(request: Request): Promise<{ raw: string; json: T }> {
  const raw = await request.text();
  return { raw, json: raw ? (JSON.parse(raw) as T) : ({} as T) };
}

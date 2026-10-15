import { connection } from "next/server";
import type { ZodType } from "zod";
import { auth } from "@/lib/auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Signed-in user's id, or a 401. Works with web cookies and the mobile app's cookie header. */
export async function requireUserId(req: Request): Promise<string> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw new HttpError(401, "Please sign in");
  return session.user.id;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => {
    throw new HttpError(400, "Body must be JSON");
  });
  const result = schema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid body");
  }
  return result.data;
}

/** Wrap a handler so HttpErrors become JSON responses with the right status. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    // Every API response depends on who is asking, so never prerender it.
    await connection();
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error(err);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export const noContent = () => new Response(null, { status: 204 });

/** Postgres DATE columns come back as UTC-midnight Dates; turn them into "YYYY-MM-DD". */
export const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
export const fromIsoDate = (s: string) => new Date(`${s}T00:00:00Z`);

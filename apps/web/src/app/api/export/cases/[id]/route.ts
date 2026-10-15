import { caseDetail } from "@/server/cases";
import { caseCsv, caseHtml, download, htmlResponse } from "@/server/export";
import { handle, HttpError, requireUserId } from "@/server/http";

/** One purchase case as a CSV file or a printable report (format=csv|html). */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/export/cases/[id]">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "html") throw new HttpError(400, "format must be csv or html");
  const c = await caseDetail(userId, id);
  if (format === "html") return htmlResponse(caseHtml(c));
  const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "case";
  return download(caseCsv(c), `moneymania-${slug}.csv`, "text/csv");
});

import { categoryInput } from "@moneymania/core";
import { prisma } from "@moneymania/db";
import { handle, parseBody, requireUserId } from "@/server/http";
import { categoryDto } from "@/server/serialize";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(categories.map(categoryDto));
});

export const POST = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const input = await parseBody(req, categoryInput);
  const category = await prisma.category.create({ data: { ...input, userId } });
  return Response.json(categoryDto(category), { status: 201 });
});

import { consentInput } from "@moneymania/core";
import { consentsFor, setConsent } from "@/server/consents";
import { handle, parseBody, requireUserId } from "@/server/http";

export const GET = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  return Response.json(await consentsFor(userId));
});

export const PUT = handle(async (req: Request) => {
  const userId = await requireUserId(req);
  const { purpose, granted } = await parseBody(req, consentInput);
  await setConsent(userId, purpose, granted);
  return Response.json(await consentsFor(userId));
});

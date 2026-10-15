import type { transactionInput } from "@moneymania/core";
import type { z } from "zod";
import { fromIsoDate, HttpError } from "./http";
import { ownAccount, usableCategory } from "./ledger";

/** Check that every account and category in the entry belongs to the user, then build the row data. */
export async function transactionData(userId: string, input: z.output<typeof transactionInput>) {
  await ownAccount(userId, input.accountId);
  if (input.transferAccountId) await ownAccount(userId, input.transferAccountId);
  if (input.categoryId) {
    const category = await usableCategory(userId, input.categoryId);
    const wanted = input.kind === "income" ? "income" : "expense";
    if (input.kind !== "transfer" && category.kind !== wanted) {
      throw new HttpError(400, `categoryId: pick a ${wanted} category`);
    }
  }
  return {
    userId,
    accountId: input.accountId,
    kind: input.kind,
    amountPaise: BigInt(input.amountPaise),
    occurredOn: fromIsoDate(input.occurredOn),
    categoryId: input.kind === "transfer" ? null : (input.categoryId ?? null),
    transferAccountId: input.kind === "transfer" ? (input.transferAccountId ?? null) : null,
    incomeSource: input.incomeSource ?? null,
    note: input.note ?? null,
    tags: input.tags,
  };
}

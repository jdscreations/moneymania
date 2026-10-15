import type { BillDto, BudgetDto, CategoryDto, EmiDetailDto, EmiDto, MoneyAccountDto, PrepaymentDto, SummaryDto, TransactionDto, UpcomingDto } from "./api-types";
import type { IsoDate, Period } from "./dates";
import type { BillInput, BudgetInput, CategoryInput, EmiInput, MoneyAccountInput, PayBillInput, PayInstallmentInput, PrepaymentInput, TransactionInput } from "./schemas";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  /** "" for same-origin web requests, the API URL on mobile. */
  baseUrl: string;
  /** Extra headers per request, e.g. the session cookie on mobile. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
}

/** One typed client used by both the web and mobile apps. */
export function createApiClient({ baseUrl, headers }: ApiClientOptions) {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: "include",
      headers: { "content-type": "application/json", ...(await headers?.()) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(res.status, data?.error ?? res.statusText);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  return {
    accounts: {
      list: () => call<MoneyAccountDto[]>("GET", "/api/accounts"),
      create: (input: MoneyAccountInput) => call<MoneyAccountDto>("POST", "/api/accounts", input),
      update: (id: string, input: Partial<MoneyAccountInput>) => call<MoneyAccountDto>("PATCH", `/api/accounts/${id}`, input),
      archive: (id: string) => call<void>("DELETE", `/api/accounts/${id}`),
    },
    categories: {
      list: () => call<CategoryDto[]>("GET", "/api/categories"),
      create: (input: CategoryInput) => call<CategoryDto>("POST", "/api/categories", input),
    },
    transactions: {
      list: (from: IsoDate, to: IsoDate) => call<TransactionDto[]>("GET", `/api/transactions?from=${from}&to=${to}`),
      create: (input: TransactionInput) => call<TransactionDto>("POST", "/api/transactions", input),
      update: (id: string, input: TransactionInput) => call<TransactionDto>("PATCH", `/api/transactions/${id}`, input),
      remove: (id: string) => call<void>("DELETE", `/api/transactions/${id}`),
    },
    summary: (period: Period, date: IsoDate) => call<SummaryDto>("GET", `/api/summary?period=${period}&date=${date}`),
    budgets: {
      list: (month: string) => call<BudgetDto[]>("GET", `/api/budgets?month=${month}`),
      set: (input: BudgetInput) => call<BudgetDto>("PUT", "/api/budgets", input),
      remove: (id: string) => call<void>("DELETE", `/api/budgets/${id}`),
    },
    bills: {
      list: () => call<BillDto[]>("GET", "/api/bills"),
      create: (input: BillInput) => call<BillDto>("POST", "/api/bills", input),
      update: (id: string, input: BillInput) => call<BillDto>("PATCH", `/api/bills/${id}`, input),
      remove: (id: string) => call<void>("DELETE", `/api/bills/${id}`),
      pay: (id: string, input: PayBillInput) => call<BillDto>("POST", `/api/bills/${id}/pay`, input),
    },
    emis: {
      list: () => call<EmiDto[]>("GET", "/api/emis"),
      get: (id: string) => call<EmiDetailDto>("GET", `/api/emis/${id}`),
      create: (input: EmiInput) => call<EmiDetailDto>("POST", "/api/emis", input),
      remove: (id: string) => call<void>("DELETE", `/api/emis/${id}`),
      payInstallment: (id: string, number: number, input: PayInstallmentInput) =>
        call<EmiDetailDto>("POST", `/api/emis/${id}/installments/${number}/pay`, input),
      prepayment: (id: string, input: PrepaymentInput) => call<PrepaymentDto>("POST", `/api/emis/${id}/prepayment`, input),
    },
    upcoming: (days = 30) => call<UpcomingDto[]>("GET", `/api/upcoming?days=${days}`),
    pushTokens: {
      register: (token: string, platform: "ios" | "android" | "web") => call<void>("POST", "/api/push-tokens", { token, platform }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

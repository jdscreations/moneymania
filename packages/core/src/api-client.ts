import type { BillDto, CalculatorContextDto, CaseDetailDto, ConsentDto, CaseDto, BudgetDto, CategoryDto, EmiDetailDto, EmiDto, MoneyAccountDto, PrepaymentDto, SummaryDto, TransactionDto, UpcomingDto } from "./api-types";
import type { IsoDate, Period } from "./dates";
import type { BillInput, CaseEventInput, ConsentInput, CaseInput, CaseUpdate, CloseEmiInput, OrderInput, OrderUpdate, BudgetInput, CategoryInput, EmiInput, MoneyAccountInput, PayBillInput, PayInstallmentInput, PrepaymentInput, TransactionInput } from "./schemas";

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

/** Download paths, used directly as links on the web. */
export const exportPaths = {
  transactions: (from: IsoDate, to: IsoDate, format: "csv" | "html") => `/api/export/transactions?from=${from}&to=${to}&format=${format}`,
  purchaseCase: (id: string, format: "csv" | "html") => `/api/export/cases/${id}?format=${format}`,
  everything: "/api/export/me",
};

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

  /** Raw text of a download, such as a CSV or HTML report. */
  async function text(path: string): Promise<string> {
    const res = await fetch(`${baseUrl}${path}`, { credentials: "include", headers: { ...(await headers?.()) } });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    return res.text();
  }

  return {
    exports: {
      transactions: (from: IsoDate, to: IsoDate, format: "csv" | "html") => text(exportPaths.transactions(from, to, format)),
      purchaseCase: (id: string, format: "csv" | "html") => text(exportPaths.purchaseCase(id, format)),
      everything: () => text(exportPaths.everything),
    },
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
    cases: {
      list: () => call<CaseDto[]>("GET", "/api/cases"),
      get: (id: string) => call<CaseDetailDto>("GET", `/api/cases/${id}`),
      create: (input: CaseInput) => call<CaseDetailDto>("POST", "/api/cases", input),
      update: (id: string, input: CaseUpdate) => call<CaseDetailDto>("PATCH", `/api/cases/${id}`, input),
      remove: (id: string) => call<void>("DELETE", `/api/cases/${id}`),
      addOrder: (id: string, input: OrderInput) => call<CaseDetailDto>("POST", `/api/cases/${id}/orders`, input),
      updateOrder: (id: string, orderId: string, input: OrderUpdate) => call<CaseDetailDto>("PATCH", `/api/cases/${id}/orders/${orderId}`, input),
      removeOrder: (id: string, orderId: string) => call<CaseDetailDto>("DELETE", `/api/cases/${id}/orders/${orderId}`),
      addEvent: (id: string, input: CaseEventInput) => call<CaseDetailDto>("POST", `/api/cases/${id}/events`, input),
      closeEmi: (id: string, input: CloseEmiInput) => call<CaseDetailDto>("POST", `/api/cases/${id}/close-emi`, input),
    },
    calculatorContext: () => call<CalculatorContextDto>("GET", "/api/calculators/context"),
    consents: {
      list: () => call<ConsentDto[]>("GET", "/api/consents"),
      set: (input: ConsentInput) => call<ConsentDto[]>("PUT", "/api/consents", input),
    },
    upcoming: (days = 30) => call<UpcomingDto[]>("GET", `/api/upcoming?days=${days}`),
    pushTokens: {
      register: (token: string, platform: "ios" | "android" | "web") => call<void>("POST", "/api/push-tokens", { token, platform }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

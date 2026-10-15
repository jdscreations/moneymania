import type { CaseAnalysis, OrderStatus } from "./refund";
import type { IsoDate } from "./dates";
import type { Paise } from "./money";
import type { PeriodSummary } from "./summary";
import type { BillFrequency } from "./bills";
import type { PrepaymentResult } from "./emi";
import type { caseEventTypes, emiKinds, incomeSources, merchants, moneyAccountTypes, transactionKinds } from "./schemas";

/** JSON shapes returned by the MoneyMania API. Amounts are paise as plain numbers. */
export interface MoneyAccountDto {
  id: string;
  type: (typeof moneyAccountTypes)[number];
  name: string;
  bankCode: string | null;
  openingBalancePaise: Paise;
  balancePaise: Paise;
}

export interface CategoryDto {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  isDefault: boolean;
}

export interface TransactionDto {
  id: string;
  accountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  kind: (typeof transactionKinds)[number];
  amountPaise: Paise;
  occurredOn: IsoDate;
  incomeSource: (typeof incomeSources)[number] | null;
  note: string | null;
  tags: string[];
}

export interface BudgetDto {
  id: string;
  categoryId: string;
  month: string;
  limitPaise: Paise;
  spentPaise: Paise;
}

export type SummaryDto = PeriodSummary;

export interface BillDto {
  id: string;
  name: string;
  amountPaise: Paise;
  frequency: BillFrequency;
  nextDueOn: IsoDate | null;
  lastPaidOn: IsoDate | null;
  accountId: string | null;
  categoryId: string | null;
  autopay: boolean;
  remindDaysBefore: number;
}

export interface InstallmentDto {
  number: number;
  dueOn: IsoDate;
  emiPaise: Paise;
  principalPaise: Paise;
  interestPaise: Paise;
  gstPaise: Paise;
  paidOn: IsoDate | null;
}

export interface EmiDto {
  id: string;
  name: string;
  kind: (typeof emiKinds)[number];
  lender: string;
  principalPaise: Paise;
  annualRateBps: number;
  tenureMonths: number;
  firstDueOn: IsoDate;
  gstOnInterestBps: number;
  processingFeePaise: Paise;
  accountId: string | null;
  remindDaysBefore: number;
  status: "active" | "foreclosed" | "cancelled" | "closed";
  emiPaise: Paise;
  paidCount: number;
  /** Principal still owed after the paid installments. */
  outstandingPaise: Paise;
  /** Interest plus GST on the installments not yet paid. */
  remainingCostPaise: Paise;
  nextDue: InstallmentDto | null;
}

export interface EmiDetailDto extends EmiDto {
  installments: InstallmentDto[];
}

export type PrepaymentDto = PrepaymentResult;

/** One bill or EMI installment coming due. */
export interface UpcomingDto {
  /** "dispute" is the last day to raise a dispute on a purchase case. */
  type: "bill" | "emi" | "dispute";
  id: string;
  name: string;
  dueOn: IsoDate;
  amountPaise: Paise;
  daysLeft: number;
  autopay: boolean;
}

export interface CaseOrderDto {
  id: string;
  merchantOrderId: string | null;
  item: string;
  amountPaise: Paise;
  status: OrderStatus;
  refundPaise: Paise;
  refundPostedOn: IsoDate | null;
}

export interface CaseEventDto {
  id: string;
  on: IsoDate;
  type: (typeof caseEventTypes)[number];
  reference: string | null;
  note: string | null;
}

export interface EscalationStep {
  step: string;
  how: string;
}

export interface CaseDto {
  id: string;
  title: string;
  merchant: (typeof merchants)[number];
  bankCode: string | null;
  chargePaise: Paise;
  chargedOn: IsoDate;
  disputeDeadlineOn: IsoDate | null;
  /** Days left to raise a dispute; negative once the window has closed. */
  disputeDaysLeft: number | null;
  status: "open" | "resolved";
  emi: EmiDto | null;
  /** Null when the case has no EMI attached. */
  analysis: CaseAnalysis | null;
  orderCount: number;
}

export interface CaseDetailDto extends CaseDto {
  orders: CaseOrderDto[];
  events: CaseEventDto[];
  escalation: EscalationStep[];
}

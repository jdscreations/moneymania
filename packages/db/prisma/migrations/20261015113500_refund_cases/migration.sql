-- AlterTable
ALTER TABLE "emis" ADD COLUMN     "brokenPeriodDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "foreclosureFeeBps" INTEGER;

-- AlterTable
ALTER TABLE "purchase_cases" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';


-- SBI Card merchant EMI rules, as SBI confirmed on 14 Oct 2026: a merchant EMI is cancelled only on a
-- full refund; otherwise closing it costs 3% of the outstanding principal plus GST and interest accrued
-- since the last statement. Card disputes must be raised within 45 days of the transaction.
INSERT INTO "bank_emi_rules" ("id", "bankCode", "emiKind", "foreclosureFeeBps", "gstBps", "disputeWindowDays", "cancelOnFullRefundOnly", "escalationContacts", "lastCheckedOn")
VALUES (
  'rule_sbi_card_merchant', 'sbi', 'card_merchant', 300, 1800, 45, true,
  '[{"step":"Customer care","how":"Raise a service request in the SBI Card app or on sbicard.com and note the request number."},{"step":"Nodal officer","how":"Escalate on sbicard.com under Contact us, Grievance redressal, quoting the service request number."},{"step":"RBI Ombudsman","how":"File at cms.rbi.org.in if SBI rejects the complaint or does not reply within 30 days."}]'::jsonb,
  '2026-10-14'
);

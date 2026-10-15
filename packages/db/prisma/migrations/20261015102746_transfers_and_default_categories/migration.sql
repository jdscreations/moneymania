-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "transferAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "money_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Built-in categories shared by every user (user_id is null).
INSERT INTO "categories" ("id", "userId", "name", "kind", "icon") VALUES
  ('cat_salary',        NULL, 'Salary',             'income',  'briefcase'),
  ('cat_freelance',     NULL, 'Freelance',          'income',  'laptop'),
  ('cat_gig',           NULL, 'Gig payouts',        'income',  'bike'),
  ('cat_business',      NULL, 'Shop and business',  'income',  'store'),
  ('cat_interest',      NULL, 'Interest',           'income',  'percent'),
  ('cat_other_income',  NULL, 'Other income',       'income',  'plus'),
  ('cat_food',          NULL, 'Food and dining',    'expense', 'utensils'),
  ('cat_groceries',     NULL, 'Groceries',          'expense', 'basket'),
  ('cat_transport',     NULL, 'Transport',          'expense', 'bus'),
  ('cat_fuel',          NULL, 'Fuel',               'expense', 'fuel'),
  ('cat_rent',          NULL, 'Rent',               'expense', 'home'),
  ('cat_utilities',     NULL, 'Electricity and utilities', 'expense', 'bolt'),
  ('cat_mobile',        NULL, 'Mobile and internet', 'expense', 'phone'),
  ('cat_shopping',      NULL, 'Shopping',           'expense', 'bag'),
  ('cat_health',        NULL, 'Health',             'expense', 'heart'),
  ('cat_education',     NULL, 'Education',          'expense', 'book'),
  ('cat_entertainment', NULL, 'Entertainment',      'expense', 'film'),
  ('cat_emi',           NULL, 'EMIs and loans',     'expense', 'receipt'),
  ('cat_family',        NULL, 'Family and gifts',   'expense', 'gift'),
  ('cat_other_expense', NULL, 'Other spending',     'expense', 'dots');

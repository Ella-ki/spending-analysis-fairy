export type HouseholdRole = "husband" | "wife";

export type SpecialFlag = "travel" | "wedding" | "hospital" | "moving" | "furniture";

export type Household = {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
};

export type HouseholdMembership = {
  household: Household;
  relationship_role: HouseholdRole;
  is_admin: boolean;
};

export type Category = {
  id: string;
  household_id: string | null;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
};

export type Statement = {
  id: string;
  household_id: string;
  period_month: string;
  original_file_name: string;
  row_count: number;
  total_amount: number;
  imported_at: string;
};

export type Transaction = {
  id: string;
  household_id: string;
  statement_id: string | null;
  transaction_date: string;
  merchant_raw: string;
  merchant_normalized: string;
  amount: number;
  payment_type: string | null;
  installment_months: number;
  approval_number: string | null;
  category_id: string | null;
  special_flag: SpecialFlag | null;
  is_fixed: boolean;
  categories?: Pick<Category, "id" | "name" | "color" | "icon"> | null;
};

export type MerchantRule = {
  id: string;
  household_id: string;
  merchant_pattern: string;
  merchant_normalized: string;
  category_id: string | null;
  special_flag: SpecialFlag | null;
  is_fixed: boolean;
  confidence: number;
};

export type Goal = {
  id: string;
  household_id: string;
  goal_key: string;
  target_amount: number;
  starts_on: string;
  ends_on: string | null;
};

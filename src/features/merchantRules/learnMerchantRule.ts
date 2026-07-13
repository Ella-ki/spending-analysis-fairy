import { supabase } from "../../lib/supabase";
import type { SpecialFlag } from "../../shared/types";

type LearnMerchantRuleInput = {
  householdId: string;
  transactionId: string;
  merchantNormalized: string;
  categoryId: string | null;
  specialFlag?: SpecialFlag | null;
  isFixed?: boolean;
};

export async function learnMerchantRule(input: LearnMerchantRuleInput) {
  const { householdId, transactionId, merchantNormalized, categoryId, specialFlag = null, isFixed = false } = input;

  const { error: ruleError } = await supabase.from("merchant_rules").upsert(
    {
      household_id: householdId,
      merchant_pattern: merchantNormalized,
      merchant_normalized: merchantNormalized,
      category_id: categoryId,
      special_flag: specialFlag,
      is_fixed: isFixed,
      confidence: 1,
      learned_from_transaction_id: transactionId,
    },
    {
      onConflict: "household_id,merchant_normalized",
    },
  );

  if (ruleError) {
    throw ruleError;
  }

  const { error: transactionError } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      special_flag: specialFlag,
      is_fixed: isFixed,
    })
    .eq("household_id", householdId)
    .eq("merchant_normalized", merchantNormalized);

  if (transactionError) {
    throw transactionError;
  }
}

import { supabase } from "../../lib/supabase";
import type { Category, MerchantRule, SpecialFlag } from "../../shared/types";
import { inferStatementMonth, parseHyundaiStatementFile, type ParsedStatementTransaction } from "./csv";

type ImportInput = {
  file: File;
  householdId: string;
  userId: string;
};

export type ImportResult = {
  status: "imported" | "duplicate";
  statementId: string | null;
  periodMonth: string;
  parsedRows: number;
  insertedRows: number;
  totalAmount: number;
};

type TransactionInsert = {
  household_id: string;
  statement_id: string;
  imported_by: string;
  transaction_date: string;
  merchant_raw: string;
  merchant_normalized: string;
  amount: number;
  payment_type: string;
  installment_months: number;
  approval_number: string | null;
  category_id: string | null;
  special_flag: SpecialFlag | null;
  is_fixed: boolean;
  source_hash: string;
};

export async function importHyundaiStatement({ file, householdId, userId }: ImportInput): Promise<ImportResult> {
  const parsedFile = await parseHyundaiStatementFile(file);
  const parsedRows = parsedFile.transactions;
  const periodMonth = parsedFile.statementMonth ?? inferStatementMonth(parsedRows);
  const checksum = parsedFile.checksum;
  const totalAmount = parsedRows.reduce((sum, row) => sum + row.amount, 0);

  const { data: existingStatement, error: existingError } = await supabase
    .from("statements")
    .select("id,period_month,row_count,total_amount")
    .eq("household_id", householdId)
    .eq("checksum", checksum)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingStatement) {
    return {
      status: "duplicate",
      statementId: String(existingStatement.id),
      periodMonth,
      parsedRows: parsedRows.length,
      insertedRows: 0,
      totalAmount,
    };
  }

  const storagePath = `${householdId}/${periodMonth}/${Date.now()}-${safeFileName(file.name)}`;
  const upload = await supabase.storage.from("statements").upload(storagePath, file, {
    cacheControl: "31536000",
    contentType: file.type || inferContentType(file.name),
    upsert: false,
  });

  if (upload.error) {
    throw upload.error;
  }

  const { data: statement, error: statementError } = await supabase
    .from("statements")
    .insert({
      household_id: householdId,
      uploaded_by: userId,
      period_month: `${periodMonth}-01`,
      original_file_name: file.name,
      storage_path: storagePath,
      checksum,
      row_count: parsedRows.length,
      total_amount: totalAmount,
    })
    .select("id")
    .single();

  if (statementError) {
    throw statementError;
  }

  const statementId = String(statement.id);
  const categories = await fetchCategories(householdId);
  const rules = await fetchMerchantRules(householdId);
  const inserts = await buildTransactionInserts({
    rows: parsedRows,
    householdId,
    statementId,
    userId,
    categories,
    rules,
    checksum,
  });

  let insertedRows = 0;
  for (const batch of chunk(inserts, 500)) {
    const { data, error } = await supabase
      .from("transactions")
      .upsert(batch, {
        onConflict: "household_id,source_hash",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      throw error;
    }

    insertedRows += data?.length ?? 0;
  }

  return {
    status: "imported",
    statementId,
    periodMonth,
    parsedRows: parsedRows.length,
    insertedRows,
    totalAmount,
  };
}

export const importHyundaiCsv = importHyundaiStatement;

async function fetchCategories(householdId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("id,household_id,name,color,icon,is_default,sort_order")
    .or(`household_id.is.null,household_id.eq.${householdId}`)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Category[];
}

async function fetchMerchantRules(householdId: string) {
  const { data, error } = await supabase
    .from("merchant_rules")
    .select("id,household_id,merchant_pattern,merchant_normalized,category_id,special_flag,is_fixed,confidence")
    .eq("household_id", householdId);

  if (error) {
    throw error;
  }

  return (data ?? []) as MerchantRule[];
}

async function buildTransactionInserts(input: {
  rows: ParsedStatementTransaction[];
  householdId: string;
  statementId: string;
  userId: string;
  categories: Category[];
  rules: MerchantRule[];
  checksum: string;
}) {
  const { rows, householdId, statementId, userId, categories, rules, checksum } = input;

  return Promise.all(
    rows.map(async (row, index): Promise<TransactionInsert> => {
      const classification = classifyTransaction(row, categories, rules);
      const source = row.approvalNumber
        ? `${row.approvalNumber}|${row.transactionDate}|${row.amount}|${row.merchantNormalized}`
        : `${checksum}|${index}|${row.transactionDate}|${row.amount}|${row.merchantNormalized}`;

      return {
        household_id: householdId,
        statement_id: statementId,
        imported_by: userId,
        transaction_date: row.transactionDate,
        merchant_raw: row.merchantRaw,
        merchant_normalized: row.merchantNormalized,
        amount: row.amount,
        payment_type: row.paymentType,
        installment_months: row.installmentMonths,
        approval_number: row.approvalNumber,
        category_id: classification.categoryId,
        special_flag: classification.specialFlag,
        is_fixed: classification.isFixed,
        source_hash: await sha256(source),
      };
    }),
  );
}

function classifyTransaction(
  row: ParsedStatementTransaction,
  categories: Category[],
  rules: MerchantRule[],
): { categoryId: string | null; specialFlag: SpecialFlag | null; isFixed: boolean } {
  const exactRule = rules.find((rule) => rule.merchant_normalized === row.merchantNormalized);

  if (exactRule) {
    return {
      categoryId: exactRule.category_id,
      specialFlag: exactRule.special_flag,
      isFixed: exactRule.is_fixed,
    };
  }

  const lowerMerchant = row.merchantNormalized.toLowerCase();
  const categoryName = inferCategoryName(lowerMerchant);
  const categoryId = findCategoryId(categories, categoryName) ?? findCategoryId(categories, "Other");

  return {
    categoryId,
    specialFlag: null,
    isFixed: inferFixedExpense(lowerMerchant),
  };
}

function inferCategoryName(merchant: string) {
  if (matchesAny(merchant, ["starbucks", "스타벅스", "coffee", "커피", "compose", "컴포즈", "mega", "메가커피", "ediya", "이디야"])) {
    return "Cafe";
  }
  if (matchesAny(merchant, ["마트", "emart", "이마트", "homeplus", "홈플러스", "market", "쿠팡프레시", "농협", "하나로마트"])) {
    return "Groceries";
  }
  if (matchesAny(merchant, ["coupang", "쿠팡", "naver", "네이버", "11번가", "gmarket", "지마켓", "옥션", "ssg"])) {
    return "Shopping";
  }
  if (matchesAny(merchant, ["배달", "배민", "baemin", "yogiyo", "요기요", "식당", "restaurant", "푸드", "치킨", "피자"])) {
    return "Food";
  }
  if (matchesAny(merchant, ["택시", "버스", "지하철", "kakao t", "카카오t", "철도", "korail", "주유", "하이패스"])) {
    return "Transportation";
  }
  if (matchesAny(merchant, ["병원", "약국", "clinic", "hospital", "의원", "치과"])) {
    return "Hospital";
  }
  if (matchesAny(merchant, ["nike", "나이키", "running", "러닝", "마라톤"])) {
    return "Running";
  }
  if (matchesAny(merchant, ["netflix", "spotify", "youtube", "유튜브", "google", "apple.com/bill", "구독"])) {
    return "Subscriptions";
  }
  if (matchesAny(merchant, ["항공", "air", "hotel", "호텔", "숙박", "여행", "렌터카"])) {
    return "Travel";
  }
  if (matchesAny(merchant, ["전기", "가스", "수도", "통신", "sk텔레콤", "kt", "lg u", "u+"])) {
    return "Utilities";
  }
  if (matchesAny(merchant, ["보험", "insurance"])) {
    return "Insurance";
  }
  return "Other";
}

function inferFixedExpense(merchant: string) {
  return matchesAny(merchant, [
    "netflix",
    "spotify",
    "youtube",
    "유튜브",
    "insurance",
    "보험",
    "통신",
    "sk텔레콤",
    "kt",
    "lg u",
  ]);
}

function findCategoryId(categories: Category[], name: string) {
  return categories.find((category) => category.name.toLowerCase() === name.toLowerCase())?.id ?? null;
}

function matchesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeFileName(name: string) {
  return name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-");
}

function inferContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }
  return "text/csv";
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
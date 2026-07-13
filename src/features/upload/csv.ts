import { toMonthKey } from "../../lib/dates";

export type ParsedCsvTransaction = {
  transactionDate: string;
  merchantRaw: string;
  merchantNormalized: string;
  amount: number;
  paymentType: string;
  installmentMonths: number;
  approvalNumber: string | null;
};

type ColumnMap = {
  date: number;
  merchant: number;
  amount: number;
  paymentType: number | null;
  installment: number | null;
  approvalNumber: number | null;
};

const aliases = {
  date: ["date", "transactiondate", "이용일자", "거래일자", "사용일자", "승인일자", "매출일자"],
  merchant: ["merchant", "store", "가맹점명", "이용가맹점", "사용처", "업체명", "상호"],
  amount: ["amount", "이용금액", "사용금액", "승인금액", "결제금액", "원화금액"],
  paymentType: ["paymenttype", "결제구분", "이용구분", "일시불할부", "매입구분"],
  installment: ["installment", "할부", "할부개월", "할부기간"],
  approvalNumber: ["approvalnumber", "승인번호", "승인no", "승인번호승인no"],
};

export async function decodeCsvFile(file: File) {
  const buffer = await file.arrayBuffer();
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  const replacementCount = utf8Text.match(/\uFFFD/g)?.length ?? 0;

  if (replacementCount > 3) {
    try {
      return new TextDecoder("euc-kr", { fatal: false }).decode(buffer);
    } catch {
      return utf8Text;
    }
  }

  return utf8Text;
}

export function parseHyundaiCsv(text: string) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim().length > 0));
  const header = findHeader(rows);

  if (!header) {
    throw new Error("CSV에서 이용일자, 가맹점명, 이용금액 컬럼을 찾지 못했습니다.");
  }

  const parsed: ParsedCsvTransaction[] = [];
  const dataRows = rows.slice(header.rowIndex + 1);

  dataRows.forEach((row) => {
    const dateRaw = getCell(row, header.columns.date);
    const merchantRaw = getCell(row, header.columns.merchant);
    const amountRaw = getCell(row, header.columns.amount);

    if (!dateRaw || !merchantRaw || !amountRaw) {
      return;
    }

    const transactionDate = parseDate(dateRaw);
    const amount = parseAmount(amountRaw);

    if (!transactionDate || Number.isNaN(amount)) {
      return;
    }

    const installmentSource =
      header.columns.installment === null
        ? getCell(row, header.columns.paymentType)
        : getCell(row, header.columns.installment);
    const installmentMonths = parseInstallment(installmentSource);
    const paymentTypeRaw = getCell(row, header.columns.paymentType);

    parsed.push({
      transactionDate,
      merchantRaw: merchantRaw.trim(),
      merchantNormalized: normalizeMerchantName(merchantRaw),
      amount,
      paymentType: normalizePaymentType(paymentTypeRaw, installmentMonths),
      installmentMonths,
      approvalNumber: cleanOptional(getCell(row, header.columns.approvalNumber)),
    });
  });

  if (parsed.length === 0) {
    throw new Error("가져올 수 있는 거래 내역이 없습니다.");
  }

  return parsed;
}

export function inferStatementMonth(rows: ParsedCsvTransaction[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const monthKey = toMonthKey(row.transactionDate);
    counts.set(monthKey, (counts.get(monthKey) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? toMonthKey(new Date());
}

export function normalizeMerchantName(raw: string) {
  let merchant = raw
    .normalize("NFKC")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const splitParts = merchant
    .split(/\s[-–—]\s|[|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (splitParts.length > 1) {
    merchant = splitParts[splitParts.length - 1] ?? merchant;
  }

  merchant = merchant
    .replace(/\((주|유|재)\)/gi, "")
    .replace(/㈜/g, "")
    .replace(/주식회사/g, "")
    .replace(/[()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .trim();

  return merchant || raw.trim();
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function findHeader(rows: string[][]): { rowIndex: number; columns: ColumnMap } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) {
      continue;
    }

    const columns = {
      date: findColumn(row, aliases.date),
      merchant: findColumn(row, aliases.merchant),
      amount: findColumn(row, aliases.amount),
      paymentType: findColumn(row, aliases.paymentType),
      installment: findColumn(row, aliases.installment),
      approvalNumber: findColumn(row, aliases.approvalNumber),
    };

    if (columns.date !== null && columns.merchant !== null && columns.amount !== null) {
      return {
        rowIndex,
        columns: {
          date: columns.date,
          merchant: columns.merchant,
          amount: columns.amount,
          paymentType: columns.paymentType,
          installment: columns.installment,
          approvalNumber: columns.approvalNumber,
        },
      };
    }
  }

  return null;
}

function findColumn(row: string[], aliasList: string[]) {
  const normalizedAliases = aliasList.map(normalizeHeader);
  const index = row.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
  return index === -1 ? null : index;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_\-./()[\]:]/g, "");
}

function getCell(row: string[], index: number | null) {
  if (index === null) {
    return "";
  }

  return row[index]?.trim() ?? "";
}

function parseDate(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  if (digits.length === 6) {
    return `20${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseAmount(value: string) {
  const negative = value.includes("-") || /^\s*\(/.test(value);
  const numeric = value.replace(/[^\d.]/g, "");

  if (!numeric) {
    return Number.NaN;
  }

  const amount = Number(numeric);
  return negative ? -amount : amount;
}

function parseInstallment(value: string) {
  const clean = value.trim().toLowerCase();

  if (!clean || clean.includes("일시") || clean.includes("lump")) {
    return 1;
  }

  const match = clean.match(/\d+/);
  if (!match) {
    return 1;
  }

  return Math.max(Number(match[0]), 1);
}

function normalizePaymentType(value: string, installmentMonths: number) {
  const clean = value.trim();

  if (clean) {
    return clean;
  }

  return installmentMonths > 1 ? "installment" : "lump_sum";
}

function cleanOptional(value: string) {
  const clean = value.trim();
  return clean.length > 0 ? clean : null;
}

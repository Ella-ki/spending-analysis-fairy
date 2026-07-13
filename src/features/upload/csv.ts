import { toMonthKey } from "../../lib/dates";

export type ParsedStatementTransaction = {
  transactionDate: string;
  merchantRaw: string;
  merchantNormalized: string;
  amount: number;
  paymentType: string;
  installmentMonths: number;
  approvalNumber: string | null;
};

export type ParsedCsvTransaction = ParsedStatementTransaction;

export type ParsedStatementFile = {
  transactions: ParsedStatementTransaction[];
  checksum: string;
  sourceKind: "csv" | "xls-html" | "xls-xml" | "tabular-text";
  statementMonth: string | null;
};

type ColumnMap = {
  date: number;
  merchant: number;
  amount: number;
  fee: number | null;
  paymentType: number | null;
  installment: number | null;
  approvalNumber: number | null;
};

const aliases = {
  date: ["date", "transactiondate", "이용일", "이용일자", "거래일자", "사용일자", "승인일자", "매출일자", "이용일시"],
  merchant: ["merchant", "store", "가맹점명", "이용가맹점", "이용처", "사용처", "업체명", "상호", "가맹점"],
  amount: ["amount", "이용금액", "사용금액", "승인금액", "매출금액", "원화금액", "금액"],
  billingAmount: ["billingamount", "결제원금", "청구원금", "청구금액", "이번달청구금액", "이번달결제금액", "결제금액"],
  fee: ["fee", "수수료", "수수료이자", "이자", "할부수수료"],
  paymentType: ["paymenttype", "결제구분", "이용구분", "일시불할부", "일시불/할부", "매입구분", "결제방법"],
  installment: ["installment", "할부", "할부회차", "할부/회차", "할부개월", "할부기간", "할부개월수"],
  approvalNumber: ["approvalnumber", "승인번호", "승인no", "승인번호승인no", "승인번호no", "승인 no"],
};

export async function parseHyundaiStatementFile(file: File): Promise<ParsedStatementFile> {
  const buffer = await file.arrayBuffer();
  const checksum = await sha256ArrayBuffer(buffer);
  const { rows, sourceKind, statementMonth } = parseStatementRows(file.name, buffer);

  return {
    transactions: parseHyundaiRows(rows),
    checksum,
    sourceKind,
    statementMonth,
  };
}

export async function decodeCsvFile(file: File) {
  const buffer = await file.arrayBuffer();
  return decodeStatementText(buffer);
}

export function parseHyundaiCsv(text: string) {
  return parseHyundaiRows(parseDelimitedRows(text, ","));
}

function inferStatementMonthFromStatementText(text: string) {
  const patterns = [
    /(20\d{2})\s*년\s*(\d{1,2})\s*월\s*이용대금명세서/i,
    /이용대금명세서[^0-9]{0,30}(20\d{2})[^0-9]{0,5}(\d{1,2})\s*월?/i,
    /결제(?:예정)?일[^0-9]{0,30}(20\d{2})[^0-9]{0,5}(\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const month = match ? toValidMonthKey(match[1], match[2]) : null;
    if (month) {
      return month;
    }
  }

  return null;
}

function inferStatementMonthFromFileName(fileName: string) {
  const match = fileName.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])(?:[-_.]?(0[1-9]|[12]\d|3[01]))?/);
  return match ? toValidMonthKey(match[1], match[2]) : null;
}

function toValidMonthKey(yearValue: string | undefined, monthValue: string | undefined) {
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 2000 || year > 2100 || month < 1 || month > 12) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

export function inferStatementMonth(rows: ParsedStatementTransaction[]) {
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

function parseStatementRows(fileName: string, buffer: ArrayBuffer): {
  rows: string[][];
  sourceKind: ParsedStatementFile["sourceKind"];
  statementMonth: string | null;
} {
  const bytes = new Uint8Array(buffer);
  const lowerName = fileName.toLowerCase();

  if (isBinaryXls(bytes)) {
    throw new Error(
      "이 파일은 오래된 바이너리 XLS 형식입니다. 현대카드 사이트에서 받은 파일이 그대로 실패한다면, Excel에서 열어 CSV 또는 웹 페이지 형식으로 다시 저장한 뒤 올려 주세요.",
    );
  }

  if (isZipXlsx(bytes)) {
    throw new Error("XLSX는 아직 지원하지 않습니다. 현대카드에서 받은 XLS 또는 CSV 파일을 올려 주세요.");
  }

  const text = decodeStatementText(buffer);
  const statementMonth = inferStatementMonthFromStatementText(text) ?? inferStatementMonthFromFileName(fileName);
  const trimmed = text.trimStart();

  if (/<table[\s>]/i.test(trimmed)) {
    return { rows: parseHtmlTableRows(trimmed), sourceKind: "xls-html", statementMonth };
  }

  if (/^<\?xml|<Workbook[\s>]/i.test(trimmed)) {
    return { rows: parseXmlSpreadsheetRows(trimmed), sourceKind: "xls-xml", statementMonth };
  }

  const separator = chooseSeparator(text, lowerName);
  return {
    rows: parseDelimitedRows(text, separator),
    sourceKind: separator === "," ? "csv" : "tabular-text",
    statementMonth,
  };
}

function parseHyundaiRows(rows: string[][]) {
  const meaningfulRows = rows
    .map((row) => row.map(cleanCell))
    .filter((row) => row.some((cell) => cell.length > 0));
  const header = findHeader(meaningfulRows);

  if (!header) {
    throw new Error("명세서에서 이용일자, 가맹점명, 이용금액 컬럼을 찾지 못했습니다.");
  }

  const parsed: ParsedStatementTransaction[] = [];
  const dataRows = meaningfulRows.slice(header.rowIndex + 1);

  dataRows.forEach((row) => {
    const alignedRow = alignDataRow(row, header.headerRow);
    const dateRaw = getCell(alignedRow, header.columns.date);
    const merchantRaw = getCell(alignedRow, header.columns.merchant);
    const amountRaw = getCell(alignedRow, header.columns.amount);

    if (!dateRaw || !merchantRaw || !amountRaw) {
      return;
    }

    const transactionDate = parseDate(dateRaw);
    const parsedAmount = parseAmount(amountRaw);
    const parsedFee = parseAmount(getCell(alignedRow, header.columns.fee));
    const amount = parsedAmount + (Number.isNaN(parsedFee) ? 0 : parsedFee);

    if (!transactionDate || Number.isNaN(parsedAmount)) {
      return;
    }

    const installmentSource =
      header.columns.installment === null
        ? getCell(alignedRow, header.columns.paymentType)
        : getCell(alignedRow, header.columns.installment);
    const installmentMonths = parseInstallment(installmentSource);
    const paymentTypeRaw = getCell(alignedRow, header.columns.paymentType);

    parsed.push({
      transactionDate,
      merchantRaw: merchantRaw.trim(),
      merchantNormalized: normalizeMerchantName(merchantRaw),
      amount,
      paymentType: normalizePaymentType(paymentTypeRaw, installmentMonths),
      installmentMonths,
      approvalNumber: cleanOptional(getCell(alignedRow, header.columns.approvalNumber)),
    });
  });

  if (parsed.length === 0) {
    throw new Error("가져올 수 있는 거래 내역이 없습니다.");
  }

  return parsed;
}

function parseHtmlTableRows(text: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "text/html");
  const table = document.querySelector("table");

  if (!table) {
    throw new Error("XLS 파일에서 표 데이터를 찾지 못했습니다.");
  }

  return [...table.querySelectorAll("tr")].map((row) =>
    [...row.querySelectorAll("th,td")].map((cell) => cleanCell(cell.textContent ?? "")),
  );
}

function parseXmlSpreadsheetRows(text: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "text/xml");
  const parseError = document.querySelector("parsererror");

  if (parseError) {
    throw new Error("XLS XML 데이터를 읽지 못했습니다.");
  }

  const rows = [...document.getElementsByTagName("Row")].map((row) =>
    [...row.getElementsByTagName("Cell")].map((cell) => {
      const data = cell.getElementsByTagName("Data")[0];
      return cleanCell(data?.textContent ?? cell.textContent ?? "");
    }),
  );

  if (rows.length === 0) {
    throw new Error("XLS XML 파일에서 행 데이터를 찾지 못했습니다.");
  }

  return rows;
}

function parseDelimitedRows(text: string, separator: "," | "\t") {
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

    if (char === separator && !inQuotes) {
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

function findHeader(rows: string[][]): { rowIndex: number; headerRow: string[]; columns: ColumnMap } | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 50); rowIndex += 1) {
    const row = rows[rowIndex];
    if (!row) {
      continue;
    }

    const columns = {
      date: findColumn(row, aliases.date),
      merchant: findColumn(row, aliases.merchant),
      amount: findColumn(row, aliases.billingAmount) ?? findColumn(row, aliases.amount),
      fee: findColumn(row, aliases.fee),
      paymentType: findColumn(row, aliases.paymentType),
      installment: findColumn(row, aliases.installment),
      approvalNumber: findColumn(row, aliases.approvalNumber),
    };

    if (columns.date !== null && columns.merchant !== null && columns.amount !== null) {
      return {
        rowIndex,
        headerRow: row,
        columns: {
          date: columns.date,
          merchant: columns.merchant,
          amount: columns.amount,
          fee: columns.fee,
          paymentType: columns.paymentType,
          installment: columns.installment,
          approvalNumber: columns.approvalNumber,
        },
      };
    }
  }

  return null;
}

function alignDataRow(row: string[], headerRow: string[]) {
  if (row.length !== headerRow.length - 1) {
    return row;
  }

  const fullAmountIndex = findColumn(headerRow, aliases.amount);
  const billingAmountIndex = findColumn(headerRow, aliases.billingAmount);

  if (fullAmountIndex === null || billingAmountIndex === null || fullAmountIndex >= billingAmountIndex) {
    return row;
  }

  return [...row.slice(0, fullAmountIndex), "", ...row.slice(fullAmountIndex)];
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
  const clean = cleanCell(value);
  const serial = Number(clean);

  if (/^\d{5}(\.\d+)?$/.test(clean) && serial > 20_000 && serial < 80_000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(serial));
    return epoch.toISOString().slice(0, 10);
  }

  const digits = clean.replace(/\D/g, "");

  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  if (digits.length === 6) {
    return `20${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
  }

  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseAmount(value: string) {
  const clean = cleanCell(value);
  const negative = clean.includes("-") || /^\s*\(/.test(clean);
  const numeric = clean.replace(/[^\d.]/g, "");

  if (!numeric) {
    return Number.NaN;
  }

  const amount = Number(numeric);
  return negative ? -amount : amount;
}

function parseInstallment(value: string) {
  const clean = cleanCell(value).toLowerCase();

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
  const clean = cleanCell(value);

  if (clean) {
    return clean;
  }

  return installmentMonths > 1 ? "installment" : "lump_sum";
}

function cleanOptional(value: string) {
  const clean = cleanCell(value);
  return clean.length > 0 ? clean : null;
}

function cleanCell(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chooseSeparator(text: string, fileName: string): "," | "\t" {
  if (fileName.endsWith(".csv")) {
    return ",";
  }

  const sample = text.split(/\r?\n/).slice(0, 10).join("\n");
  const tabCount = (sample.match(/\t/g) ?? []).length;
  const commaCount = (sample.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "\t" : ",";
}

function decodeStatementText(buffer: ArrayBuffer) {
  const candidates = ["utf-8", "euc-kr"];
  const decoded = candidates.map((encoding) => {
    const text = new TextDecoder(encoding, { fatal: false }).decode(buffer);
    const replacementCount = text.match(/\uFFFD/g)?.length ?? 0;
    return { text, replacementCount };
  });

  return decoded.sort((a, b) => a.replacementCount - b.replacementCount)[0]?.text ?? "";
}

function isBinaryXls(bytes: Uint8Array) {
  return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function isZipXlsx(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

async function sha256ArrayBuffer(buffer: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
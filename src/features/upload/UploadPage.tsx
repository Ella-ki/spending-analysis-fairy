import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useHousehold } from "../household/useHousehold";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { formatKrw } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import type { Statement } from "../../shared/types";
import { importHyundaiStatement, type ImportResult } from "./importTransactions";

export function UploadPage() {
  const { session } = useAuth();
  const { membership } = useHousehold();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const householdId = membership?.household.id;
  const userId = session?.user.id;

  const statementsQuery = useQuery({
    queryKey: ["statements", householdId],
    enabled: Boolean(householdId),
    queryFn: async (): Promise<Statement[]> => {
      const { data, error } = await supabase
        .from("statements")
        .select("id,household_id,period_month,original_file_name,row_count,total_amount,imported_at")
        .eq("household_id", householdId)
        .order("imported_at", { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      return (data ?? []).map((statement) => ({
        ...statement,
        total_amount: Number(statement.total_amount),
      })) as Statement[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !householdId || !userId) {
        throw new Error("파일과 household 정보가 필요합니다.");
      }

      return importHyundaiStatement({ file, householdId, userId });
    },
    onSuccess: async (nextResult) => {
      setResult(nextResult);
      setFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", householdId] }),
        queryClient.invalidateQueries({ queryKey: ["statements", householdId] }),
        queryClient.invalidateQueries({ queryKey: ["transactions", householdId] }),
      ]);
    },
  });

  const fileLabel = useMemo(() => {
    if (!file) {
      return "현대카드 이용명세서 XLS 선택";
    }
    return `${file.name} · ${Math.ceil(file.size / 1024)} KB`;
  }, [file]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setResult(null);
    setFile(event.target.files?.[0] ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-sm font-semibold text-mint">Statement Upload</p>
        <h2 className="mt-1 text-3xl font-bold tracking-normal">현대카드 이용명세서 XLS를 올리면 끝.</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          현대카드에서 내려받은 XLS 명세서를 읽어 거래일, 가맹점, 금액, 결제 방식, 할부, 승인번호를 정규화하고 기존 merchant rule로 자동 분류합니다.
        </p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center dark:border-neutral-700 dark:bg-neutral-950">
          <FileUp className="h-8 w-8 text-mint" aria-hidden />
          <span className="text-sm font-semibold">{fileLabel}</span>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            현대카드 XLS를 우선 지원하고, CSV도 보조로 지원합니다.
          </span>
          <input
            type="file"
            accept=".xls,.csv,application/vnd.ms-excel,text/csv"
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        <Button
          className="mt-4 w-full"
          type="button"
          icon={<UploadCloud className="h-5 w-5" aria-hidden />}
          disabled={!file || importMutation.isPending}
          onClick={() => importMutation.mutate()}
        >
          {importMutation.isPending ? "가져오는 중" : "거래 내역 가져오기"}
        </Button>

        {importMutation.error ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-200">
            {importMutation.error.message}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            <h3 className="font-semibold">{result.status === "duplicate" ? "이미 가져온 명세서예요" : "가져오기가 완료됐어요"}</h3>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-emerald-700 dark:text-emerald-200">월</dt>
              <dd className="font-semibold">{result.periodMonth}</dd>
            </div>
            <div>
              <dt className="text-emerald-700 dark:text-emerald-200">총액</dt>
              <dd className="font-semibold">{formatKrw(result.totalAmount)}</dd>
            </div>
            <div>
              <dt className="text-emerald-700 dark:text-emerald-200">읽은 거래</dt>
              <dd className="font-semibold">{result.parsedRows}건</dd>
            </div>
            <div>
              <dt className="text-emerald-700 dark:text-emerald-200">신규 저장</dt>
              <dd className="font-semibold">{result.insertedRows}건</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-normal">최근 가져오기</h3>
        </div>

        {statementsQuery.data && statementsQuery.data.length > 0 ? (
          <div className="flex flex-col gap-2">
            {statementsQuery.data.map((statement) => (
              <article key={statement.id} className="rounded-lg border border-stone-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{statement.original_file_name}</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {statement.period_month.slice(0, 7)} · {statement.row_count}건
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatKrw(statement.total_amount, true)}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="아직 업로드가 없습니다" description="현대카드 XLS 명세서를 올리면 이번 달 카드 소비가 대시보드에 반영됩니다." />
        )}
      </section>
    </div>
  );
}
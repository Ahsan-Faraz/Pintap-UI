"use client";

import { useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { UploadIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";
import { useT } from "@/context/I18nProvider";
import {
  ordersService,
  type SalesImportResponse,
  type SalesImportRowResult,
} from "@/services";

const SAMPLE = `External Order ID,Ordered at,currency,order amount,discount code,order status
bz28281850,2026-06-11T22:00,EUR,51.00,AFFHKSS8,pending
bz28281851,2026-06-11T22:11,EUR,82.00,AURSPR-04,paid`;

const STATUS_TONE: Record<
  SalesImportRowResult["status"],
  "success" | "warning" | "danger" | "neutral"
> = {
  attributed: "success",
  recorded_unattributed: "warning",
  unmatched: "neutral",
  error: "danger",
};

export default function SalesImportClient() {
  const t = useT();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [csv, setCsv] = useState("");
  const [storeId, setStoreId] = useState("");
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [result, setResult] = useState<SalesImportResponse | null>(null);

  const issueRows = useMemo(
    () =>
      (result?.results ?? []).filter(
        (r) => r.status === "unmatched" || r.status === "error",
      ),
    [result],
  );

  async function run(mode: "preview" | "import") {
    setBusy(mode);
    try {
      const next =
        mode === "preview"
          ? await ordersService.previewSalesCsv(csv, storeId.trim() || undefined)
          : await ordersService.commitSalesCsv(csv, storeId.trim() || undefined);
      setResult(next);
      toast({
        title:
          mode === "preview"
            ? t("adminPages.salesImport.previewReady")
            : t("adminPages.salesImport.importComplete"),
        description: t("adminPages.salesImport.importSummary", {
          attributed: next.summary.attributed,
          unmatched: next.summary.unmatched,
          errors: next.summary.errors,
        }),
        variant: next.summary.errors ? "error" : "success",
      });
    } catch (err) {
      toast({
        title:
          err instanceof Error
            ? err.message
            : t("adminPages.salesImport.importFailed"),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setCsv(await file.text());
    setResult(null);
  }

  const canSubmit = csv.trim().length > 0 && !busy;

  return (
    <div className="space-y-5">
      <Section
        title={t("adminPages.salesImport.pasteCsv")}
        description={t("adminPages.salesImport.columns")}
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon className="h-4 w-4" />
            {t("adminPages.salesImport.upload")}
          </Button>
        }
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void loadFile(e.target.files?.[0])}
        />
        <Field label={t("adminPages.salesImport.salesCsv")} htmlFor="sales-csv">
          <Textarea
            id="sales-csv"
            name="sales-csv"
            autoComplete="off"
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setResult(null);
            }}
            placeholder={SAMPLE}
            className="min-h-56 font-mono text-xs"
          />
        </Field>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <Field
            label={t("adminPages.salesImport.storeScope")}
            hint={t("adminPages.salesImport.storeScopeHint")}
            htmlFor="store-id"
          >
            <Input
              id="store-id"
              name="store-id"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!canSubmit}
              loading={busy === "preview"}
              onClick={() => void run("preview")}
            >
              {t("adminPages.salesImport.preview")}
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              loading={busy === "import"}
              onClick={() => void run("import")}
            >
              {t("adminPages.salesImport.import")}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCsv(SAMPLE);
              setResult(null);
            }}
          >
            {t("adminPages.salesImport.loadSample")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!csv && !result}
            onClick={() => {
              setCsv("");
              setResult(null);
            }}
          >
            {t("adminPages.salesImport.clear")}
          </Button>
        </div>
      </Section>

      {result && (
        <Section
          title={
            result.dryRun
              ? t("adminPages.salesImport.previewResults")
              : t("adminPages.salesImport.importResults")
          }
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SummaryItem
              label={t("adminPages.salesImport.received")}
              value={result.summary.received}
            />
            <SummaryItem
              label={t("adminPages.salesImport.attributed")}
              value={result.summary.attributed}
            />
            <SummaryItem
              label={t("adminPages.salesImport.recordedUnattributed")}
              value={result.summary.recordedUnattributed}
            />
            <SummaryItem
              label={t("adminPages.salesImport.unmatched")}
              value={result.summary.unmatched}
            />
            <SummaryItem
              label={t("adminPages.salesImport.errors")}
              value={result.summary.errors}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-card border border-navy/10">
            <table className="min-w-full divide-y divide-navy/10 text-sm">
              <thead className="bg-beige/45 text-left text-xs font-bold uppercase tracking-wide text-navy/55">
                <tr>
                  <th className="px-3 py-2">{t("adminPages.salesImport.line")}</th>
                  <th className="px-3 py-2">{t("orders.status")}</th>
                  <th className="px-3 py-2">{t("orders.order")}</th>
                  <th className="px-3 py-2">{t("orders.code")}</th>
                  <th className="px-3 py-2">{t("adminPages.salesImport.reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/8 bg-surface">
                {(issueRows.length ? issueRows : result.results.slice(0, 8)).map((row) => (
                  <tr key={`${row.line}-${row.status}-${row.code ?? ""}`}>
                    <td className="px-3 py-2 font-mono text-xs text-navy/60">
                      {row.line}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[row.status]}>
                        {t(`adminPages.salesImport.status.${row.status}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium text-navy">
                      {row.orderNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-navy/70">
                      {row.code ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-navy/60">
                      {row.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-input bg-beige/45 p-3">
      <p className="text-xs font-semibold text-navy/55">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy">
        {formatNumber(value)}
      </p>
    </div>
  );
}

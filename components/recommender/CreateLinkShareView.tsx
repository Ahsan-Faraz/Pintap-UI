"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  CopyIcon,
  ShareIcon,
} from "@/components/ui/icons";
import CreateLinkStepper from "@/components/recommender/CreateLinkStepper";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import type { LinkDetail } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEP_GREEN = "#086838";

function MessageBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-6 w-6", className)}
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function CreateLinkShareView({
  link,
  onBack,
}: {
  link: LinkDetail;
  onBack?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [urlCopied, setUrlCopied] = useState(false);

  const commissionPercent = link.campaign?.commissionPercent;
  const discountPercent = link.campaign?.discountPercent;
  const shortUrl = link.shortUrl.replace(/^https?:\/\//, "");

  async function copyText(value: string, kind: "url" | "code") {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard unavailable */
    }
    if (kind === "url") {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 1600);
    }
    toast({ title: t("appPages.createLink.copiedToast"), variant: "success" });
  }

  async function shareMore() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: link.name, url: link.shortUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    void copyText(link.shortUrl, "url");
  }

  function shareMessage() {
    const body = encodeURIComponent(`${link.name}\n${link.shortUrl}`);
    window.location.href = `sms:?body=${body}`;
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="relative mb-6 flex items-center justify-center">
        <button
          type="button"
          onClick={onBack ?? (() => router.push("/app"))}
          aria-label={t("common.back")}
          className="absolute left-0 grid h-10 w-10 place-items-center rounded-full border border-navy/12 bg-white text-navy shadow-sm focus-ring"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-navy">
          {t("appPages.createLink.sharePageTitle")}
        </h1>
      </div>

      {/* Stepper */}
      <CreateLinkStepper step={3} />

      {/* Success */}
      <div className="mb-6 text-center">
        <div
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full"
          style={{ backgroundColor: `${STEP_GREEN}20` }}
        >
          <CheckCircleIcon className="h-8 w-8" style={{ color: STEP_GREEN }} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-navy">
          {t("appPages.createLink.readyTitle")}
        </h2>
        <p className="mt-2 text-sm text-navy/55">
          {commissionPercent != null
            ? t("appPages.createLink.readySubtitleCommission", {
                percent: formatPercent(commissionPercent),
              })
            : t("appPages.createLink.readySubtitle")}
        </p>
      </div>

      {/* Link card */}
      <div className="app-flat-card overflow-hidden p-4">
        {/* QR placeholder */}
        <div
          className="mx-auto mb-4 flex aspect-square max-h-[220px] w-full max-w-[220px] items-center justify-center rounded-card border border-navy/8"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #f4f4f5 0, #f4f4f5 12px, #ececef 12px, #ececef 24px)",
          }}
        >
          <span className="text-sm font-medium text-navy/35">
            {t("appPages.createLink.qrPlaceholder")}
          </span>
        </div>

        {/* URL + Copy */}
        <div className="flex items-center gap-2 rounded-input border border-navy/12 bg-white p-1.5 pl-3">
          <input
            readOnly
            value={shortUrl}
            aria-label={t("linkPreview.shortUrl")}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-navy"
          />
          <button
            type="button"
            onClick={() => void copyText(link.shortUrl, "url")}
            className="shrink-0 rounded-input bg-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange/90 focus-ring"
          >
            {urlCopied ? t("common.copied") : t("appPages.linkDetail.copy")}
          </button>
        </div>

        {/* Buyer code */}
        {link.discountCode && (
          <div className="mt-3 flex items-center gap-3 rounded-input border border-dashed border-green/50 bg-green/10 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#0c7a45]">
                {discountPercent != null
                  ? t("appPages.createLink.buyerCodeLabelDiscount", {
                      percent: formatPercent(discountPercent),
                    })
                  : t("appPages.createLink.buyerCodeLabel")}
              </p>
              <p className="mt-0.5 text-lg font-bold tracking-wide text-[#0c7a45]">
                {link.discountCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyText(link.discountCode!, "code")}
              aria-label={t("common.copyLink")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-input text-[#0c7a45] transition hover:bg-green/15 focus-ring"
            >
              <CopyIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Share actions */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <ShareAction
          label={t("appPages.createLink.shareMessage")}
          onClick={shareMessage}
          icon={<MessageBubbleIcon />}
        />
        <ShareAction
          label={t("appPages.createLink.shareStory")}
          onClick={shareMore}
          icon={<CameraIcon className="h-6 w-6" />}
        />
        <ShareAction
          label={t("appPages.createLink.shareMore")}
          onClick={() => void shareMore()}
          icon={<ShareIcon className="h-6 w-6" />}
        />
      </div>

      {/* Footer — pill Done + secondary link */}
      <div className="mt-8 space-y-4 pb-4">
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="w-full rounded-full bg-orange py-4 text-base font-bold text-white shadow-[0_14px_32px_rgba(250,80,4,0.38)] transition hover:bg-orange-hover active:scale-[0.98] focus-ring"
        >
          {t("appPages.createLink.done")}
        </button>
        <Link
          href="/app/links"
          className="block text-center text-sm text-navy/45 transition hover:text-navy/65 focus-ring"
        >
          {t("appPages.createLink.viewInMyLinks")}
        </Link>
      </div>
    </div>
  );
}

function ShareAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-card border border-navy/12 bg-white px-2 py-4 transition hover:border-navy/20 focus-ring"
    >
      <span className="text-navy">{icon}</span>
      <span className="text-xs font-semibold text-navy">{label}</span>
    </button>
  );
}

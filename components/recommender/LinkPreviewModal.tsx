"use client";

import Link from "next/link";
import Modal from "@/components/ui/Modal";
import Thumb from "@/components/ui/Thumb";
import Button, { buttonClasses } from "@/components/ui/Button";
import CopyField from "@/components/ui/CopyField";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { ExternalLinkIcon, ShareIcon } from "@/components/ui/icons";
import type { LinkDetail, LinkSummary } from "@/lib/types";

/**
 * Reusable link preview popup (R-03). Opened after creating a link (R-02) and by
 * clicking a link card on the homepage (R-05) or the My Links list (R-10).
 */
export default function LinkPreviewModal({
  link,
  open,
  onClose,
}: {
  link: LinkSummary | LinkDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const { toast } = useToast();

  async function share() {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: link.name, url: link.shortUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard?.writeText(link.shortUrl);
      toast({ title: t("appPages.createLink.copiedToast"), variant: "success" });
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!link) return null;
  const terms =
    "terms" in link && typeof link.terms === "string" ? link.terms : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={t("linkPreview.eyebrow")}
      title={link.name}
    >
      <div className="space-y-4">
        <div className="flex gap-4">
          <Thumb
            src={link.imageUrl}
            alt={link.name}
            fit="contain"
            className="h-20 w-20 shrink-0 rounded-input bg-white p-1"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-navy/45">
              {link.store?.name ?? link.brand ?? link.sourceHost}
            </p>
            <p className="mt-1 break-all text-xs text-navy/50">
              {link.destinationUrl}
            </p>
            {link.discountCode && (
              <Badge tone="success" className="mt-2">
                {link.discountCode}
              </Badge>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-navy/55">
            {t("linkPreview.shortUrl")}
          </p>
          <CopyField value={link.shortUrl} label={t("appPages.linkDetail.copy")} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={share}>
            <ShareIcon className="h-4 w-4" />
            {t("linkPreview.share")}
          </Button>
          <a
            href={`/l/${link.shortCode}`}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses({ variant: "secondary" })}
          >
            <ExternalLinkIcon className="h-4 w-4" />
            {t("linkPreview.open")}
          </a>
        </div>

        {terms && (
          <div className="rounded-card border border-stroke bg-beige/40 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-navy/45">
              {t("appPages.linkDetail.campaignTerms")}
            </p>
            <p className="mt-1 text-sm text-navy/65">{terms}</p>
          </div>
        )}

        <Link
          href={`/app/links/${link.id}`}
          onClick={onClose}
          className="block rounded-input text-center text-sm font-semibold text-orange hover:underline focus-ring"
        >
          {t("linkPreview.details")}
        </Link>
      </div>
    </Modal>
  );
}

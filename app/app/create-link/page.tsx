"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import PasteButton from "@/components/ui/PasteButton";
import Spinner from "@/components/ui/Spinner";
import CreateLinkShareView from "@/components/recommender/CreateLinkShareView";
import CreateLinkStepper from "@/components/recommender/CreateLinkStepper";
import CreateLinkCampaignStep from "@/components/recommender/CreateLinkCampaignStep";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { translateError, translateMessage } from "@/lib/i18n/errors";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { linksService } from "@/services";
import type { LinkDetail, LinkVerificationResult } from "@/lib/types";
import { normalizeLinkUrl } from "@/lib/url-utils";

export default function CreateLinkPage() {
  const { toast } = useToast();
  const t = useT();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<LinkVerificationResult | null>(
    null,
  );
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<LinkDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(target?: string) {
    const value = (target ?? url).trim();
    const normalized = normalizeLinkUrl(value);
    if (!normalized) {
      setError(t("appPages.createLink.invalidUrl"));
      return;
    }
    setError(null);
    setVerifying(true);
    setVerification(null);
    try {
      const result = await linksService.verifyUrl(normalized);
      setVerification(result);
      if (!result.ok) {
        setError(
          translateMessage(t, result.message, "appPages.createLink.verifyFailed"),
        );
        return;
      }
      setName(result.name ?? "");
      const best =
        result.campaignOptions
          .filter((c) => c.codesAvailable > 0)
          .sort((a, b) => (b.commissionPercent ?? 0) - (a.commissionPercent ?? 0))[0] ?? null;
      setCampaignId(best?.id ?? null);
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get("url");
    if (prefill) {
      setUrl(prefill);
      void verify(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    if (!verification) return;
    setCreating(true);
    setError(null);
    try {
      const link = await linksService.createLink({
        url: verification.normalizedUrl,
        name,
        type: verification.type,
        campaignId,
      });
      setCreated(link);
      toast({ title: t("appPages.createLink.createdToast"), variant: "success" });
    } catch (e) {
      setError(translateError(t, e, "appPages.createLink.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setUrl("");
    setVerification(null);
    setCreated(null);
    setName("");
    setCampaignId(null);
    setError(null);
  }

  function backFromCampaign() {
    setVerification(null);
    setError(null);
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <CreateLinkShareView link={created} onBack={reset} />
      </div>
    );
  }

  const step: 1 | 2 = verification?.ok ? 2 : 1;

  return (
    <div className="mx-auto max-w-lg">
      <div className="relative mb-2 flex items-center justify-center">
        {step === 2 ? (
          <button
            type="button"
            onClick={backFromCampaign}
            aria-label={t("common.back")}
            className="absolute left-0 grid h-10 w-10 place-items-center rounded-full border border-navy/12 bg-white text-navy shadow-sm focus-ring"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("common.back")}
            className="absolute left-0 grid h-10 w-10 place-items-center rounded-full border border-navy/12 bg-white text-navy shadow-sm focus-ring"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-bold text-navy">
          {t("nav.createLink")}
        </h1>
      </div>

      <CreateLinkStepper step={step} />

      {step === 1 ? (
        <>
          <Card className="p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
            >
              <Field
                label={t("appPages.createLink.urlLabel")}
                htmlFor="url"
                error={error}
              >
                <div className="flex gap-2">
                  <Input
                    id="url"
                    name="destination-url"
                    autoComplete="off"
                    type="text"
                    inputMode="url"
                    placeholder={t("appPages.createLink.urlPlaceholder")}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <PasteButton onPaste={setUrl} />
                </div>
              </Field>
              <Button
                type="submit"
                fullWidth
                className="mt-3"
                loading={verifying}
                disabled={!url.trim()}
              >
                {t("appPages.createLink.verify")}
              </Button>
            </form>
          </Card>

          {verifying ? (
            <Card className="mt-4 flex items-center gap-3 p-5 text-navy/60">
              <Spinner /> {t("appPages.createLink.verifying")}
            </Card>
          ) : null}
        </>
      ) : verification?.ok ? (
        <CreateLinkCampaignStep
          verification={verification}
          name={name}
          onNameChange={setName}
          campaignId={campaignId}
          onCampaignChange={setCampaignId}
          creating={creating}
          error={error}
          onConfirm={confirm}
        />
      ) : null}
    </div>
  );
}

import type { Translator } from "./translate";

const MESSAGE_TO_KEY: Record<string, string> = {
  "Invalid email or password.": "errors.invalidEmailPassword",
  "Account is not available.": "errors.accountUnavailable",
  "An account with this email already exists.": "errors.emailExists",
  "Signed in, but your profile isn't ready yet.": "errors.profileNotReady",
  "Not signed in.": "errors.notSignedIn",
  "Current password is incorrect.": "errors.currentPasswordWrong",
  "Select a store.": "errors.selectStore",
  "Campaign name is required.": "errors.campaignNameRequired",
  "Campaign terms are required.": "errors.campaignTermsRequired",
  "Discount percent must be 0–100.": "errors.discountRange",
  "Commission percent must be 0–100.": "errors.commissionRange",
  "Code count must be 1–500.": "errors.codeCountRange",
  "Upload at least one discount code.": "errors.uploadCodeRequired",
  "Campaign not found": "errors.campaignNotFound",
  "Link not found": "errors.linkNotFound",
  "You already have a link for this exact URL.": "errors.duplicateLink",
  "Only active campaigns can be connected.": "errors.activeCampaignRequired",
  "Campaign must belong to the same store as the link.": "errors.campaignStoreMismatch",
  "No discount codes available for this campaign.": "errors.noCodesAvailable",
  "Could not connect store.": "errors.connectStoreFailed",
  "No available balance to pay out.": "errors.noPayoutBalance",
  "Payout batch not found": "errors.payoutBatchNotFound"
};

export function translateMessage(
  t: Translator,
  message: string | undefined | null,
  fallbackKey: string,
): string {
  if (!message) return t(fallbackKey);
  const key = MESSAGE_TO_KEY[message];
  return key ? t(key) : message;
}

export function translateError(
  t: Translator,
  error: unknown,
  fallbackKey: string,
): string {
  return translateMessage(
    t,
    error instanceof Error ? error.message : undefined,
    fallbackKey,
  );
}

import type { StoreSummary } from "@/lib/types";

export interface MerchantOnboardingSteps {
  connectStore: boolean;
  confirmProfile: boolean;
  firstCampaign: boolean;
}

export function merchantOnboardingSteps(
  store: StoreSummary | null | undefined,
): MerchantOnboardingSteps {
  return {
    connectStore: Boolean(store?.connected),
    confirmProfile: Boolean(store),
    firstCampaign: (store?.activeCampaignCount ?? 0) > 0,
  };
}

/** Merchant onboarding is done once the store is connected and has an active campaign. */
export function isMerchantOnboardingComplete(
  store: StoreSummary | null | undefined,
): boolean {
  const steps = merchantOnboardingSteps(store);
  return steps.connectStore && steps.confirmProfile && steps.firstCampaign;
}

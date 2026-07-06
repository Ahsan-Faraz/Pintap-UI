"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import PortalShell from "@/components/portal/PortalShell";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import { isMerchantOnboardingComplete } from "@/lib/merchant/onboarding";
import {
  EuroIcon,
  GaugeIcon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
  TagIcon,
  BoltIcon,
} from "@/components/ui/icons";

export default function MerchantShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { store, loading, reload } = useMerchantStore();
  const complete = isMerchantOnboardingComplete(store);

  useEffect(() => {
    void reload();
  }, [pathname, reload]);

  useEffect(() => {
    if (loading) return;
    if (!complete && pathname === "/merchant") {
      router.replace("/merchant/onboarding");
    }
    if (complete && pathname === "/merchant/onboarding") {
      router.replace("/merchant");
    }
  }, [complete, loading, pathname, router]);

  const overviewItem = complete
    ? { href: "/merchant", labelKey: "nav.dashboard", icon: <GaugeIcon /> }
    : {
        href: "/merchant/onboarding",
        labelKey: "nav.onboarding",
        icon: <BoltIcon />,
      };

  const groups = [
    {
      labelKey: "group.overview",
      items: [overviewItem],
    },
    {
      labelKey: "group.manage",
      items: [
        { href: "/merchant/store", labelKey: "nav.store", icon: <StoreIcon /> },
        { href: "/merchant/campaigns", labelKey: "nav.campaigns", icon: <TagIcon /> },
        { href: "/merchant/orders", labelKey: "nav.orders", icon: <ReceiptIcon /> },
      ],
    },
    {
      labelKey: "group.account",
      items: [
        { href: "/merchant/billing", labelKey: "nav.billing", icon: <EuroIcon /> },
        { href: "/merchant/settings", labelKey: "nav.settings", icon: <SettingsIcon /> },
      ],
    },
  ];

  return (
    <PortalShell sectionKey="section.merchant" groups={groups} profileHref="/app/profile">
      {children}
    </PortalShell>
  );
}

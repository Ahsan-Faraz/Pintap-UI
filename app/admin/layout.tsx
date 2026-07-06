import PortalShell from "@/components/portal/PortalShell";
import {
  ActivityIcon,
  GaugeIcon,
  LinkIcon,
  ReceiptIcon,
  SettingsIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  EuroIcon,
  UploadIcon,
} from "@/components/ui/icons";

export const metadata = {
  title: "Admin",
};

const groups = [
  {
    labelKey: "group.overview",
    items: [
      { href: "/admin", labelKey: "nav.dashboard", icon: <GaugeIcon /> },
      { href: "/admin/activity", labelKey: "nav.activity", icon: <ActivityIcon /> },
    ],
  },
  {
    labelKey: "group.catalog",
    items: [
      { href: "/admin/users", labelKey: "nav.users", icon: <UsersIcon /> },
      { href: "/admin/stores", labelKey: "nav.stores", icon: <StoreIcon /> },
      { href: "/admin/campaigns", labelKey: "nav.campaigns", icon: <TagIcon /> },
      { href: "/admin/links", labelKey: "nav.links", icon: <LinkIcon /> },
    ],
  },
  {
    labelKey: "group.finance",
    items: [
      { href: "/admin/orders", labelKey: "nav.orders", icon: <ReceiptIcon /> },
      { href: "/admin/sales-import", labelKey: "nav.salesImport", icon: <UploadIcon /> },
      { href: "/admin/payouts", labelKey: "nav.payouts", icon: <EuroIcon /> },
    ],
  },
  {
    labelKey: "group.system",
    items: [
      { href: "/admin/settings", labelKey: "nav.settings", icon: <SettingsIcon /> },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell sectionKey="section.admin" groups={groups} profileHref="/app/profile">
      {children}
    </PortalShell>
  );
}

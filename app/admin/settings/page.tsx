import PageHeader from "@/components/ui/PageHeader";
import ChangePasswordCard from "@/components/account/ChangePasswordCard";
import { getServerT } from "@/lib/i18n/server";

export default async function AdminSettingsPage() {
  const t = await getServerT();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("adminPages.settings.title")}
        description={t("adminPages.settings.description")}
      />

      <ChangePasswordCard />
    </div>
  );
}

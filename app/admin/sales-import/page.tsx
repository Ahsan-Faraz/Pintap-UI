import PageHeader from "@/components/ui/PageHeader";
import { getServerT } from "@/lib/i18n/server";
import SalesImportClient from "./SalesImportClient";

export default async function SalesImportPage() {
  const t = await getServerT();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("adminPages.salesImport.title")}
        description={t("adminPages.salesImport.description")}
      />
      <SalesImportClient />
    </div>
  );
}

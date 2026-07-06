import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const t = await getServerT();
  const faqs = [1, 2, 3, 4, 5].map((n) => ({
    q: t(`appPages.help.faq${n}q`),
    a: t(`appPages.help.faq${n}a`),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("appPages.help.title")}
        description={t("appPages.help.description")}
      />

      <Card className="divide-y divide-stroke">
        {faqs.map((f) => (
          // name="faq" = native exclusive accordion: opening one closes the rest.
          <details key={f.q} name="faq" className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-navy">
              {f.q}
              <span className="text-navy/40 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-navy/65">{f.a}</p>
          </details>
        ))}
      </Card>

      <Card className="mt-4 p-5">
        <p className="font-semibold text-navy">
          {t("appPages.help.stillNeedHelp")}
        </p>
        <p className="mt-1 text-sm text-navy/60">
          {t("appPages.help.contactPrefix")}{" "}
          <a
            href="mailto:hello@pintap.com"
            className="font-semibold text-orange hover:underline"
          >
            hello@pintap.com
          </a>{" "}
          {t("appPages.help.contactSuffix")}
        </p>
      </Card>
    </div>
  );
}

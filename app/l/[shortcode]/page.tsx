import type { Metadata } from "next";
import { APP_NAME, APP_URL } from "@/lib/config";
import { faviconUrl } from "@/lib/url-utils";
import { getResolverViewServer } from "@/lib/server/resolver";
import ResolverPageClient from "./ResolverPageClient";

type PageProps = {
  params: Promise<{ shortcode: string }>;
};

function absoluteImageUrl(
  imageUrl: string | null | undefined,
  sourceHost: string | null | undefined,
): string | undefined {
  const raw =
    imageUrl ?? (sourceHost ? faviconUrl(sourceHost) : null);
  if (!raw) return undefined;
  try {
    return new URL(raw, APP_URL).toString();
  } catch {
    return undefined;
  }
}

/** Link-specific Open Graph tags so DMs (WhatsApp, iMessage, etc.) show the product image. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shortcode } = await params;
  const data = await getResolverViewServer(shortcode);

  if (!data.found || !data.link) {
    return {
      title: "Link unavailable",
      description: "This recommendation link is no longer available.",
    };
  }

  const title = data.link.name;
  const description = data.recommenderFirstName
    ? `${data.recommenderFirstName} recommends ${data.link.name}`
    : `A recommendation for ${data.link.name}`;
  const image = absoluteImageUrl(data.link.imageUrl, data.link.sourceHost);
  const pageUrl = `${APP_URL}/l/${shortcode}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: APP_NAME,
      type: "website",
      ...(image ? { images: [{ url: image, alt: data.link.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default function ResolverPage() {
  return <ResolverPageClient />;
}

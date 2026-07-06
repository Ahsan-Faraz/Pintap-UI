import { after, NextResponse } from "next/server";
import {
  getResolverViewServer,
  recordLinkClickServer,
} from "@/lib/server/resolver";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await params;
  const view = await getResolverViewServer(shortcode);
  return NextResponse.json(view, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await params;
  let body: {
    visitorHash?: string;
    source?: string;
    userAgent?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }
  after(() => recordLinkClickServer(shortcode, body));
  return NextResponse.json({ ok: true });
}

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SHORTCODE = __ENV.SHORTCODE || "demo";
const INGEST_URL = __ENV.INGEST_URL || "http://localhost:8080/orders";
const INGEST_API_KEY = __ENV.INGEST_API_KEY || "";

export const options = {
  scenarios: {
    resolver_burst: {
      executor: "constant-vus",
      vus: Number(__ENV.RESOLVER_VUS || 50),
      duration: __ENV.RESOLVER_DURATION || "1m",
      exec: "resolverBurst",
    },
    ingest_smoke: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      exec: "ingestSmoke",
      startTime: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

export function resolverBurst() {
  const page = http.get(`${BASE_URL}/l/${SHORTCODE}`);
  check(page, {
    "resolver page ok": (res) => res.status < 500,
  });

  const click = http.post(
    `${BASE_URL}/api/resolver/${SHORTCODE}`,
    JSON.stringify({ visitorHash: `k6-${__VU}-${Date.now()}`, source: "k6" }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(click, {
    "click accepted": (res) => res.status === 200 || res.status === 404,
  });
  sleep(1);
}

export function ingestSmoke() {
  if (!INGEST_API_KEY) return;

  const csv = [
    "External Order ID,Ordered at,currency,order amount,discount code,order status",
    `k6-${Date.now()},2026-07-02T12:00:00Z,EUR,12.34,${__ENV.INGEST_CODE || "TESTCODE"},paid`,
  ].join("\n");

  const res = http.post(INGEST_URL, csv, {
    headers: {
      "Content-Type": "text/csv",
      "x-api-key": INGEST_API_KEY,
      ...(__ENV.INGEST_STORE_ID ? { "x-store-id": __ENV.INGEST_STORE_ID } : {}),
    },
  });
  check(res, {
    "ingest accepted": (r) => r.status === 200 || r.status === 400,
  });
}

/**
 * Domain types for Pintap.
 *
 * These mirror the Supabase schema in
 * NEXT_WEB_APP_SCOPE_ARCHITECTURE_REQUIREMENTS.md §5 (camelCased) so the Phase 1
 * mock service layer and the Phase 2+ real adapters expose one shared contract.
 */

// ---------------------------------------------------------------------------
// Core records (§5.1)
// ---------------------------------------------------------------------------

export type Role = "user" | "merchant" | "admin";

/** A recommender's linked social presence (Instagram, TikTok, …). */
export interface SocialProfile {
  platform: string;
  accountName: string;
}

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  phone: string | null;
  country: string | null;
  /** Optional self-described gender (recommender profile). */
  gender?: string | null;
  /** Optional list of social profiles shown on resolver pages. */
  socialProfiles?: SocialProfile[];
  acceptedTerms: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
  /** Soft-delete timestamp — deleted accounts stay visible to admin for payment reasons. */
  deletedAt?: string | null;
}

export type StoreStatus = "pending" | "active" | "paused" | "disconnected";

export interface Store {
  id: string;
  name: string;
  slug: string;
  merchantDomain: string | null;
  primaryDomain: string | null;
  externalId: string | null;
  logoUrl: string | null;
  countryCode: string | null;
  currency: string | null;
  category: string | null;
  connected: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoreMember {
  id: string;
  storeId: string;
  userId: string;
  role: "owner" | "staff";
  createdAt: string;
}

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "ended";

export interface Campaign {
  id: string;
  storeId: string;
  name: string;
  destinationUrl: string | null;
  productHandle: string | null;
  productId: string | null;
  terms: string;
  discountPercent: number | null;
  commissionPercent: number | null;
  startAt: string;
  endAt: string | null;
  isActive: boolean;
  status: CampaignStatus;
  maxBudgetMinor: number | null;
  maxClaims: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DiscountCodeStatus =
  | "available"
  | "claimed"
  | "released"
  | "disabled";

export interface CampaignDiscountCode {
  id: string;
  campaignId: string;
  code: string;
  status: DiscountCodeStatus;
  claimedByLinkId: string | null;
  createdAt: string;
}

/** A discount code enriched with who claimed it, for the merchant codes table. */
export interface CampaignCodeRow extends CampaignDiscountCode {
  /** Display name of the recommender who claimed the code, if any. */
  claimedByName: string | null;
  /** Name of the link that claimed the code (secondary detail). */
  claimedLinkName: string | null;
}

export type LinkType = "product" | "shop" | "other";
export type LinkStatus = "active" | "inactive" | "deleted";

export interface Link {
  id: string;
  userId: string;
  storeId: string | null;
  campaignId: string | null;
  discountCodeId: string | null;
  type: LinkType;
  destinationUrl: string;
  sourceHost: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  shortCode: string;
  shortUrl: string;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LinkClick {
  id: string;
  linkId: string;
  visitorHash: string | null;
  userAgent: string | null;
  countryCode: string | null;
  source: string | null;
  clickedAt: string;
}

export interface StoreOrder {
  id: string;
  storeId: string;
  externalOrderId: string;
  externalOrderNumber: string;
  currency: string;
  totalAmountMinor: number;
  processedAt: string;
  rawPayload?: unknown;
  createdAt: string;
}

export type AttributionStatus =
  | "pending"
  | "confirmed"
  | "canceled"
  | "returned";

export interface LinkOrderAttribution {
  id: string;
  linkId: string;
  campaignId: string;
  discountCodeId: string;
  externalOrderId: string;
  status: AttributionStatus;
  orderAmountMinor: number;
  commissionAmountMinor: number;
  currency: string;
  source: string;
  createdAt: string;
}

export type LedgerType =
  | "earned"
  | "reversed"
  | "payout_pending"
  | "paid"
  | "failed";

export type LedgerStatus =
  | "pending"
  | "available"
  | "paid"
  | "reversed"
  | "failed";

export interface CommissionLedgerEntry {
  id: string;
  userId: string;
  storeId: string | null;
  linkId: string | null;
  attributionId: string | null;
  type: LedgerType;
  amountMinor: number;
  currency: string;
  status: LedgerStatus;
  availableAt: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PayoutAccount {
  id: string;
  userId: string;
  /** Legacy processor account reference; unused for manual bank payouts. */
  externalAccountId: string | null;
  /** Payout method; manual mode uses "bank_transfer". */
  method: string;
  accountHolder: string | null;
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDue: string[];
  createdAt: string;
  updatedAt: string;
}

/** Bank details a recommender submits for manual payouts. */
export interface PayoutAccountInput {
  accountHolder: string;
  iban: string;
  bic?: string | null;
  bankName?: string | null;
}

export type FundingStatus = "pending" | "paid" | "failed" | "refunded";

export interface MerchantFundingTransaction {
  id: string;
  storeId: string;
  paymentReference: string | null;
  checkoutReference: string | null;
  amountMinor: number;
  currency: string;
  status: FundingStatus;
  createdAt: string;
}

export type PayoutBatchStatus =
  | "draft"
  /** User asked for their available balance to be paid out (self-service). */
  | "requested"
  | "queued"
  | "paid"
  | "failed"
  | "canceled";

export interface PayoutBatch {
  id: string;
  userId: string;
  transferId: string | null;
  amountMinor: number;
  currency: string;
  status: PayoutBatchStatus;
  createdAt: string;
  paidAt: string | null;
}

/** A payout batch enriched with the recipient, for the admin payouts table. */
export interface PayoutBatchRow extends PayoutBatch {
  user: Pick<Profile, "id" | "firstName" | "lastName" | "email"> | null;
}

export interface ActivityEvent {
  id: string;
  scopeType: string;
  scopeId: string | null;
  actorType: "user" | "system";
  actorId: string | null;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Service view models & I/O shapes
// ---------------------------------------------------------------------------

export interface LinkMetrics {
  clicks: number;
  orders: number;
  commissionMinor: number;
  currency: string;
}

export interface LinkSummary extends Link {
  store: Pick<Store, "id" | "name" | "logoUrl"> | null;
  campaign:
    | Pick<Campaign, "id" | "name" | "discountPercent" | "commissionPercent">
    | null;
  discountCode: string | null;
  metrics: LinkMetrics;
}

export interface LinkDetail extends LinkSummary {
  terms: string | null;
  resolverUrl: string;
}

export interface CreateLinkInput {
  url: string;
  name?: string;
  type?: LinkType;
  campaignId?: string | null;
}

export interface LinkVerificationResult {
  ok: boolean;
  url: string;
  normalizedUrl: string;
  host: string;
  type: LinkType;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  store: StoreSummary | null;
  isStoreConnected: boolean;
  campaignOptions: CampaignSummary[];
  message?: string;
}

export interface StoreSummary extends Store {
  activeCampaignCount: number;
  bestDiscountPercent: number | null;
  bestCommissionPercent: number | null;
}

export interface CampaignSummary extends Campaign {
  store: Pick<Store, "id" | "name" | "logoUrl"> | null;
  codesTotal: number;
  codesAvailable: number;
  codesClaimed: number;
  fundingState: FundingState;
}

export type FundingState =
  | "not_funded"
  | "partially_funded"
  | "funded"
  | "manual_review";

export type DiscountCodeSourceInput =
  | { kind: "generate"; prefix: string; count: number }
  | { kind: "upload"; codes: string[] };

export interface CreateCampaignInput {
  storeId: string;
  name: string;
  destinationUrl?: string | null;
  productHandle?: string | null;
  terms: string;
  discountPercent: number;
  commissionPercent: number;
  startAt: string;
  endAt?: string | null;
  isActive?: boolean;
  codeSource: DiscountCodeSourceInput;
  maxBudgetMinor?: number | null;
  maxClaims?: number | null;
}

export interface OrderSummary extends LinkOrderAttribution {
  link: Pick<Link, "id" | "name" | "shortCode"> | null;
  store: Pick<Store, "id" | "name"> | null;
  recommender: Pick<Profile, "id" | "firstName" | "lastName"> | null;
  orderNumber: string | null;
  code: string | null;
}

export interface RecommenderKpis {
  clicks: number;
  orders: number;
  conversionRate: number;
  commissionMinor: number;
  currency: string;
}

export interface MerchantKpis {
  activeCampaigns: number;
  issuedLinks: number;
  clicks: number;
  orders: number;
  commissionOwedMinor: number;
  fundedBalanceMinor: number;
  currency: string;
}

/** Per-campaign performance for the merchant campaigns listing. */
export interface CampaignMetrics {
  campaignId: string;
  recommenders: number;
  clicks: number;
  orders: number;
  revenueMinor: number;
}

export interface AdminKpis {
  users: number;
  connectedStores: number;
  activeCampaigns: number;
  links: number;
  clicks: number;
  orders: number;
  commissionOwedMinor: number;
  payoutPendingMinor: number;
  currency: string;
}

export interface PayoutOverview {
  availableMinor: number;
  pendingMinor: number;
  paidMinor: number;
  currency: string;
  account: PayoutAccount | null;
  ledger: CommissionLedgerEntry[];
}

export interface PayableUser {
  user: Pick<Profile, "id" | "firstName" | "lastName" | "email">;
  availableMinor: number;
  pendingMinor: number;
  currency: string;
  onboarded: boolean;
  /** Bank details on file (admin-visible) for manual payouts. */
  account: PayoutAccount | null;
}

export interface ResolverView {
  shortCode: string;
  found: boolean;
  status: "ok" | "not_found" | "error";
  link?: {
    name: string;
    brand: string | null;
    imageUrl: string | null;
    type: LinkType;
    destinationUrl: string;
    sourceHost: string;
    redirectUrl: string;
  };
  store?: {
    name: string;
    logoUrl: string | null;
    connected: boolean;
    primaryDomain: string | null;
  } | null;
  recommenderFirstName?: string | null;
  recommenderAvatarUrl?: string | null;
  discountPercent?: number | null;
  discountCode?: string | null;
  terms?: string | null;
}

export type SortOrder = "newest" | "oldest" | "name";

export interface LinkListFilters {
  status?: LinkStatus | "all";
  campaign?: "connected" | "unconnected" | "all";
  sort?: SortOrder;
  search?: string;
}

/**
 * Typed service adapters (§10.1). UI imports services from here — never the mock
 * arrays directly. Each service exposes a single interface with a mock impl
 * (Phase 1) and a real impl selected by MOCK_DATA_ENABLED (Phase 2+).
 */
export { authService, type AuthService } from "./auth";
export { linksService, type LinksService } from "./links";
export { campaignsService, type CampaignsService, type CampaignCodeRow } from "./campaigns";
export { storesService, type StoresService } from "./stores";
export {
  ordersService,
  type OrdersService,
  type SalesImportResponse,
  type SalesImportRowResult,
  type SalesImportRow,
  type UnmatchedOrder,
} from "./orders";
export { payoutsService, type PayoutsService } from "./payouts";
export { analyticsService, type AnalyticsService } from "./analytics";
export { activityService, type ActivityService } from "./activity";

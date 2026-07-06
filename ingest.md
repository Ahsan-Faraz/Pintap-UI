# Pintap Order Ingest Service

The deployed merchant CSV ingestion service lives in the sibling project:

`C:\Users\HP\Documents\Ongoing\pintap-order-ingest`

Source of truth:

- `server.js` implements the `POST /orders` API.
- `README.md` documents the CSV format, auth header, deployment, and volume behavior.

The service now batches `store_orders` and `link_order_attributions` upserts in
500-row chunks, while falling back to single-row writes inside a failed chunk so
line-level import errors are still returned to callers.

# Dormant Shopify integration

`shopify.mjs` provides product lookup, cart creation/retrieval and a Shopify-hosted checkout URL.
It has no DOM code, imports on the site, background polling or persistent cart/customer storage.
All 14 public pages remain free of shop navigation, product cards, carts and Shopify script requests.
Importing the module alone does not contact Shopify. Requests happen only when a client method is called
after explicit activation. No real store or payment has been tested.

The default settings in `config/commerce.json` keep commerce and checkout disabled. Do not load this
configuration or module from `site.js` until an actual commerce release is approved.

## Activate later through the existing website owner

1. Identify the merchant, store, one priced offer, fulfillment, refund/support owner and approved products/variants.
2. Resolve hosting appropriate for commerce. The current GitHub Pages target is blocked by the configuration validator.
3. Confirm public Storefront access/channel/product availability and country/language. Never use Admin or private tokens in browser code.
4. Configure the actual HTTPS `*.myshopify.com` store, allowed product handles and variant IDs, merchant/hosting readiness and a public Storefront token.
   These readiness flags are owner attestations, not automatic verification of contracts or hosting eligibility.
5. Test product availability, variants, price/currency, cart errors and checkout handoff in the approved preview.
   Return a test receipt before checkout release. Actual checkout testing uses the merchant's authorized no-charge test mode;
   no real charge-and-refund is part of this infrastructure.
6. Only then add a visible commerce surface, disclose any commerce privacy behavior and enable checkout. No UI is implemented here.

Example for future application code, after the checks above:

```javascript
import { createShopifyClient } from '/integrations/shopify.mjs';
const client = createShopifyClient(approvedRuntimeConfiguration);
const product = await client.getProduct(approvedProductHandle);
// Display real price, currency and available variants; let the buyer choose.
const cart = await client.createCart([{ merchandiseId: selectedVariantId, quantity: 1 }]);
// Offer cart.checkoutUrl only after the buyer explicitly asks to continue to Shopify checkout.
```

The adapter returns data; it does not display UI, redirect, place an order, store customer information or retry cart mutations.
The caller must handle unavailable products and failed requests. A created cart is not a completed purchase.
Server-side webhooks, fulfillment automation and Admin API operations are outside this browser-safe adapter.

## Maintenance and verification

Storefront API version `2026-10` is pinned from Shopify's official version table checked November 2, 2026.
Review it quarterly. A changed response API version fails visibly rather than silently accepting fall-forward behavior.
The module uses fixed GraphQL operations, an HTTPS Shopify endpoint, public Storefront authorization only,
bounded requests and no automatic retries. Automated tests mock the network and do not require a store or token.

Storefront Web Components remain an option for a future presentation layer; using this data adapter does not commit the project to a shop layout.

Primary references checked November 2, 2026:

- https://shopify.dev/docs/api/storefront/latest
- https://shopify.dev/docs/api/storefront/latest/queries/product
- https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
- https://shopify.dev/docs/api/usage/versioning
- https://shopify.dev/docs/api/storefront-web-components
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

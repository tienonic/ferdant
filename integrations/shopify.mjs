/** Dormant Storefront adapter. No imports, requests, UI or storage occur on page load. */
const DEFAULTS = Object.freeze({
  enabled: false, provider: 'shopify', storeDomain: '', apiVersion: '2026-10',
  publicAccessToken: '', country: 'US', language: 'EN', checkoutEnabled: false,
  hostingProvider: 'github-pages', hostingApproved: false, merchantReady: false,
  allowedProductHandles: [], allowedVariantIds: [],
});
const PRODUCT = `query FerdantProduct($handle: String!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
  product(handle: $handle) { id handle title description
    variants(first: 50) { nodes { id title availableForSale price { amount currencyCode } } }
  }
}`;
const CART_FIELDS = `id checkoutUrl totalQuantity cost { totalAmount { amount currencyCode } }
  lines(first: 100) { nodes { id quantity merchandise { ... on ProductVariant { id title availableForSale } } } }`;
const CREATE_CART = `mutation FerdantCart($input: CartInput!) {
  cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { field message code } }
}`;
const GET_CART = `query FerdantCart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;

export class CommerceError extends Error {
  constructor(code, message) { super(message); this.name = 'CommerceError'; this.code = code; }
}
function fail(code, message) { throw new CommerceError(code, message); }

export function validateCommerceConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('CONFIG_INVALID', 'Commerce configuration must be an object.');
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(DEFAULTS, key)) fail('CONFIG_INVALID', `Unsupported commerce setting: ${key}. Administrative credentials do not belong here.`);
  }
  const config = { ...DEFAULTS, ...input };
  for (const key of ['enabled', 'checkoutEnabled', 'hostingApproved', 'merchantReady']) {
    if (typeof config[key] !== 'boolean') fail('CONFIG_INVALID', `${key} must be a boolean.`);
  }
  if (config.provider !== 'shopify') fail('CONFIG_INVALID', 'Only the Shopify Storefront provider is supported.');
  if (!/^\d{4}-(01|04|07|10)$/.test(config.apiVersion)) fail('CONFIG_INVALID', 'Use an explicitly reviewed stable Shopify API version.');
  if (!/^[A-Z]{2}$/.test(config.country) || !/^[A-Z]{2}(?:_[A-Z]{2})?$/.test(config.language)) fail('CONFIG_INVALID', 'Use Shopify country and language codes.');
  if (typeof config.publicAccessToken !== 'string' || /^(?:shpat_|shpua_|shpss_|shppa_)/.test(config.publicAccessToken)) fail('CONFIG_INVALID', 'Use only a public Storefront access token; never an Admin or private token.');
  if (!Array.isArray(config.allowedProductHandles) || !config.allowedProductHandles.every(h => typeof h === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(h))) fail('CONFIG_INVALID', 'Product handles must be an explicit list of reviewed products.');
  if (!Array.isArray(config.allowedVariantIds) || !config.allowedVariantIds.every(id => typeof id === 'string' && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(id))) fail('CONFIG_INVALID', 'Use an explicit list of approved Shopify variant IDs.');
  if (config.storeDomain) {
    let url;
    try { url = new URL(config.storeDomain); } catch { fail('CONFIG_INVALID', 'Use an HTTPS myshopify.com store URL.'); }
    if (url.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname) || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') fail('CONFIG_INVALID', 'Use only the store HTTPS myshopify.com origin, without credentials or a path.');
    config.storeDomain = url.origin;
  }
  if (config.enabled) {
    if (!config.storeDomain || !config.allowedProductHandles.length) fail('CONFIG_INCOMPLETE', 'Select a store and at least one reviewed product before activation.');
    if (!config.hostingApproved || config.hostingProvider === 'github-pages') fail('HOSTING_NOT_APPROVED', 'Commerce requires approved hosting appropriate for an e-commerce release.');
    if (!config.merchantReady) fail('MERCHANT_NOT_READY', 'Confirm the merchant, offer, fulfillment and refund/support ownership before activation.');
    if (config.checkoutEnabled && !config.publicAccessToken) fail('CONFIG_INCOMPLETE', 'Configure a public Storefront access token before enabling cart operations.');
    if (config.checkoutEnabled && !config.allowedVariantIds.length) fail('CONFIG_INCOMPLETE', 'Select the approved offer variants before enabling cart operations.');
  } else if (config.checkoutEnabled) fail('CONFIG_INVALID', 'Checkout cannot be enabled while commerce is disabled.');
  return Object.freeze({ ...config, allowedProductHandles: Object.freeze([...config.allowedProductHandles]), allowedVariantIds: Object.freeze([...config.allowedVariantIds]) });
}

export function createShopifyClient(input = {}, { fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
  const config = validateCommerceConfig(input);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) fail('CONFIG_INVALID', 'Request timeout must be between 1 and 30000 milliseconds.');
  async function request(query, variables, checkout = false) {
    if (!config.enabled) fail('COMMERCE_DISABLED', 'Shopify is prepared but disabled.');
    if (checkout && !config.checkoutEnabled) fail('CHECKOUT_DISABLED', 'Cart and checkout operations are not enabled.');
    if (typeof fetchImpl !== 'function') fail('NETWORK_UNAVAILABLE', 'A fetch implementation is required.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (config.publicAccessToken) headers['X-Shopify-Storefront-Access-Token'] = config.publicAccessToken;
      const response = await fetchImpl(`${config.storeDomain}/api/${config.apiVersion}/graphql.json`, {
        method: 'POST', headers, body: JSON.stringify({ query, variables }),
        credentials: 'omit', redirect: 'error', signal: controller.signal,
      });
      if (!response.ok) fail(response.status === 429 ? 'RATE_LIMITED' : 'SHOPIFY_HTTP_ERROR', 'Shopify could not complete the request. No automatic retry was made.');
      const actualVersion = response.headers?.get('X-Shopify-API-Version');
      if (actualVersion && actualVersion !== config.apiVersion) fail('API_VERSION_CHANGED', 'Shopify changed the API version. Review the integration before continuing.');
      const body = await response.json();
      if (body.errors?.length || !body.data) fail('SHOPIFY_QUERY_ERROR', 'Shopify rejected the request. Check Storefront access and the selected offer.');
      return body.data;
    } catch (error) {
      if (error instanceof CommerceError) throw error;
      fail(controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR', 'The Shopify request did not complete. No automatic retry was made.');
    } finally { clearTimeout(timer); }
  }
  function cartResult(cart) {
    if (!cart) fail('CART_UNAVAILABLE', 'This cart is unavailable or has expired.');
    let checkout;
    try { checkout = new URL(cart.checkoutUrl); } catch { fail('INVALID_CHECKOUT', 'Shopify did not return a valid checkout URL.'); }
    if (checkout.protocol !== 'https:' || checkout.username || checkout.password) fail('INVALID_CHECKOUT', 'Checkout must use a secure Shopify-provided URL.');
    return cart;
  }
  return Object.freeze({
    enabled: config.enabled,
    async getProduct(handle) {
      if (config.enabled && !config.allowedProductHandles.includes(handle)) fail('PRODUCT_NOT_APPROVED', 'This product is not in the reviewed offer list.');
      const data = await request(PRODUCT, { handle, country: config.country, language: config.language });
      return data.product ?? null;
    },
    async createCart(lines) {
      if (!Array.isArray(lines) || lines.length < 1 || lines.length > 100 || !lines.every(l => l && Object.keys(l).every(k => ['merchandiseId', 'quantity'].includes(k)) && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(l.merchandiseId) && Number.isInteger(l.quantity) && l.quantity > 0 && l.quantity <= 99)) fail('INVALID_LINES', 'Use 1–100 variant lines with quantities from 1 to 99.');
      if (config.enabled && !lines.every(line => config.allowedVariantIds.includes(line.merchandiseId))) fail('VARIANT_NOT_APPROVED', 'The cart contains a variant outside the approved offer.');
      const data = await request(CREATE_CART, { input: { lines, buyerIdentity: { countryCode: config.country } } }, true);
      if (data.cartCreate?.userErrors?.length) fail('CART_REJECTED', 'Shopify rejected the cart. Review availability and quantities before trying again.');
      return cartResult(data.cartCreate?.cart);
    },
    async getCart(id) {
      if (typeof id !== 'string' || !id.startsWith('gid://shopify/Cart/')) fail('INVALID_CART', 'Use the cart ID returned by Shopify.');
      return cartResult((await request(GET_CART, { id }, true)).cart);
    },
  });
}

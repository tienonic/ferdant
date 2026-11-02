import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createShopifyClient, validateCommerceConfig } from '../integrations/shopify.mjs';
const ready = { enabled:true, storeDomain:'https://example.myshopify.com', allowedProductHandles:['reviewed-item'], allowedVariantIds:['gid://shopify/ProductVariant/123'], hostingProvider:'approved-test-host', hostingApproved:true, merchantReady:true, publicAccessToken:'public-storefront-test-token', checkoutEnabled:true };
const response = (data, status=200, version='2026-10') => new Response(JSON.stringify({data}), {status, headers:{'X-Shopify-API-Version':version}});
const line = {merchandiseId:'gid://shopify/ProductVariant/123',quantity:1};
const cart = {id:'gid://shopify/Cart/test',checkoutUrl:'https://example.myshopify.com/checkouts/test',totalQuantity:1};

test('shipped configuration is disabled and performs no requests', async()=>{
 const config=JSON.parse(readFileSync(new URL('../config/commerce.json',import.meta.url)));
 let calls=0;const client=createShopifyClient(config,{fetchImpl:()=>{calls++;throw new Error('Unexpected request');}});
 assert.equal(client.enabled,false);await assert.rejects(client.getProduct('anything'),{code:'COMMERCE_DISABLED'});await assert.rejects(client.createCart([line]),{code:'COMMERCE_DISABLED'});assert.equal(calls,0);
});
test('activation requires a reviewed store, merchant and commerce-appropriate host',()=>{
 assert.throws(()=>validateCommerceConfig({enabled:true}),{code:'CONFIG_INCOMPLETE'});
 assert.throws(()=>validateCommerceConfig({...ready,hostingProvider:'github-pages'}),{code:'HOSTING_NOT_APPROVED'});
 assert.throws(()=>validateCommerceConfig({...ready,merchantReady:false}),{code:'MERCHANT_NOT_READY'});
 assert.throws(()=>validateCommerceConfig({...ready,publicAccessToken:''}),{code:'CONFIG_INCOMPLETE'});
});
test('rejects credential-bearing or untrusted endpoints and administrative settings',()=>{
 for(const storeDomain of ['https://evil.example','http://example.myshopify.com','https://example.myshopify.com/path','https://user:secret@example.myshopify.com','https://example.myshopify.com.evil.example']) assert.throws(()=>validateCommerceConfig({...ready,storeDomain}),{code:'CONFIG_INVALID'});
 assert.throws(()=>validateCommerceConfig({...ready,adminAccessToken:'secret'}),{code:'CONFIG_INVALID'});
 assert.throws(()=>validateCommerceConfig({...ready,publicAccessToken:'shpat_secret'}),{code:'CONFIG_INVALID'});
});
test('product request uses the pinned Storefront endpoint, market and public token',async()=>{
 let request;const client=createShopifyClient(ready,{fetchImpl:async(url,options)=>{request={url,...options};return response({product:{title:'Approved item'}});}});
 assert.equal((await client.getProduct('reviewed-item')).title,'Approved item');assert.equal(request.url,'https://example.myshopify.com/api/2026-10/graphql.json');assert.equal(request.headers['X-Shopify-Storefront-Access-Token'],ready.publicAccessToken);assert.equal(request.credentials,'omit');assert.equal(request.redirect,'error');assert.equal(JSON.parse(request.body).variables.country,'US');
 await assert.rejects(client.getProduct('unapproved'),{code:'PRODUCT_NOT_APPROVED'});
});
test('missing or unavailable products are returned without inventing availability',async()=>{
 const client=createShopifyClient(ready,{fetchImpl:async()=>response({product:null})});assert.equal(await client.getProduct('reviewed-item'),null);
});
test('checkout is separately disabled and makes no cart request',async()=>{
 let calls=0;const client=createShopifyClient({...ready,checkoutEnabled:false},{fetchImpl:()=>{calls++;}});await assert.rejects(client.createCart([line]),{code:'CHECKOUT_DISABLED'});assert.equal(calls,0);
});
test('creates and retrieves a cart, returning checkout without redirecting or storing data',async()=>{
 const requests=[];const client=createShopifyClient(ready,{fetchImpl:async(url,options)=>{const q=JSON.parse(options.body);requests.push(q);return response(q.query.startsWith('mutation')?{cartCreate:{cart,userErrors:[]}}:{cart});}});
 assert.deepEqual(await client.createCart([line]),cart);assert.deepEqual(await client.getCart(cart.id),cart);assert.deepEqual(requests[0].variables.input.lines,[line]);assert.equal(requests.length,2);
});
test('invalid quantities, extra buyer fields and invalid checkout URLs fail',async()=>{
 const client=createShopifyClient(ready,{fetchImpl:async()=>response({cartCreate:{cart:{...cart,checkoutUrl:'javascript:alert(1)'},userErrors:[]}})});
 await assert.rejects(client.createCart([{...line,quantity:0}]),{code:'INVALID_LINES'});await assert.rejects(client.createCart([{...line,email:'private@example.invalid'}]),{code:'INVALID_LINES'});await assert.rejects(client.createCart([line]),{code:'INVALID_CHECKOUT'});
 await assert.rejects(client.createCart([{...line,merchandiseId:'gid://shopify/ProductVariant/999'}]),{code:'VARIANT_NOT_APPROVED'});
});
test('reports Shopify cart validation failures and expired carts',async()=>{
 let client=createShopifyClient(ready,{fetchImpl:async()=>response({cartCreate:{cart:null,userErrors:[{message:'Not available'}]}})});await assert.rejects(client.createCart([line]),{code:'CART_REJECTED'});
 client=createShopifyClient(ready,{fetchImpl:async()=>response({cart:null})});await assert.rejects(client.getCart(cart.id),{code:'CART_UNAVAILABLE'});
});
test('rate limits and API-version changes do not cause silent retries',async()=>{
 let calls=0;let client=createShopifyClient(ready,{fetchImpl:async()=>{calls++;return response({},429);}});await assert.rejects(client.getProduct('reviewed-item'),{code:'RATE_LIMITED'});assert.equal(calls,1);
 client=createShopifyClient(ready,{fetchImpl:async()=>response({product:{}},200,'2027-01')});await assert.rejects(client.getProduct('reviewed-item'),{code:'API_VERSION_CHANGED'});
});
test('a slow request is aborted without a retry',async()=>{
 let calls=0;
 const client=createShopifyClient(ready,{timeoutMs:5,fetchImpl:async(_url,{signal})=>{
  calls++;
  return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}));
 }});
 await assert.rejects(client.getProduct('reviewed-item'),{code:'REQUEST_TIMEOUT'});assert.equal(calls,1);
});

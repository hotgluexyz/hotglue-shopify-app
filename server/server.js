import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion } from "@shopify/shopify-api";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import axios from "axios";
import { createClient } from "./handlers";
import crypto from "crypto";

let cl = console.log;

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\/|\/$/g, ""),
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  // This should be replaced with your preferred storage strategy
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Storing the currently active shops in memory will force them to re-login when your server restarts. You should
// persist this object in your app.
const ACTIVE_SHOPIFY_SHOPS = {};

const WEBHOOK_TRIGGER_TIMESTAMPS = {};

const SUPPORTED_FLOWS = {};

const shopIdFromShop = (shop) => shop.split(".")[0];

async function getAllSupportedFlows() {
  const resp = await axios.get(
    `${process.env["HG_API_URL"]}/${process.env["HG_ENV_ID"]}/flows/supported`,
    {
      headers: {
        "x-api-key": process.env["HG_API_KEY"],
      },
    }
  );

  return resp.data;
}

async function getFlowVersion() {
  const flowId = process.env["HG_FLOW_ID"];

  if (!SUPPORTED_FLOWS[flowId]) {
    // Get all supported flows
    const allSupportedFlows = await getAllSupportedFlows();

    // If the response is "truthy" and it's an array, populate the "SUPPORTED_FLOWS" object
    if (allSupportedFlows && Array.isArray(allSupportedFlows)) {
      allSupportedFlows.forEach((flow) => {
        SUPPORTED_FLOWS[flow.id] = flow;
      });
    }
  }

  // Return the linked flow version. If it doesn't exist, return 1 by default
  return SUPPORTED_FLOWS[flowId]?.version ?? 1;
}

async function linkTenant(tenantId, config) {
  const payload = {
    source: {
      tap: "shopify",
      config,
    },
  };

  const url =
    (await getFlowVersion()) === 2
      ? `${process.env["HG_API_URL"]}/v2/${process.env["HG_ENV_ID"]}/${process.env["HG_FLOW_ID"]}/${tenantId}/linkedConnectors`
      : `${process.env["HG_API_URL"]}/${process.env["HG_ENV_ID"]}/${process.env["HG_FLOW_ID"]}/${tenantId}/linkedSources`;

  const resp = await axios.post(url, payload, {
    headers: {
      "x-api-key": process.env["HG_API_KEY"],
    },
  });
}

async function getTenant(tenantId) {
  const url =
    (await getFlowVersion()) === 2
      ? `${process.env["HG_API_URL"]}/v2/${process.env["HG_ENV_ID"]}/${process.env["HG_FLOW_ID"]}/${tenantId}/linkedConnectors?config`
      : `${process.env["HG_API_URL"]}/${process.env["HG_ENV_ID"]}/${process.env["HG_FLOW_ID"]}/${tenantId}/linkedSources?config`;

  const resp = await axios.get(url, {
    headers: {
      "x-api-key": process.env["HG_API_KEY"],
    },
  });

  return resp.data;
}

async function getTenantsByPrefix(tenantPrefix) {
  const url = new URL(
    `${process.env["HG_API_URL"]}/tenants/${process.env["HG_ENV_ID"]}`
  );

  if (tenantPrefix) {
    url.searchParams.set("tenant", tenantPrefix);
  }

  const resp = await axios.get(url.toString(), {
    headers: {
      "x-api-key": process.env["HG_API_KEY"],
    },
  });

  let shopId = tenantPrefix.slice(0, tenantPrefix.length - 1);

  const tenants = resp.data; // all tenants found using prefix
  let filteredTenants = [];

  for (let i = 0; i < tenants.length; i++) {
    const singleTenant = tenants[i];

    const url =
      (await getFlowVersion()) === 2
        ? `${process.env["HG_API_URL"]}/v2/${process.env["HG_ENV_ID"]}/${process.env["HG_FLOW_ID"]}/${tenantId}/linkedConnectors?config=true`
        : `${process.env["HG_API_URL"]}/${process.env["HG_ENV_ID"]}/${process.env["HG_FLOW_ID"]}/${tenantId}/linkedSources?config=true`;

    const singleTenantConfigRequest = await axios.get(url, {
      headers: {
        "x-api-key": process.env["HG_API_KEY"],
      },
    });

    let singleTenantConfig = null;

    if (singleTenantConfigRequest.data) {
      singleTenantConfig = singleTenantConfigRequest.data[0]?.config;

      if (singleTenantConfig && singleTenantConfig.shop === shopId) {
        filteredTenants.push(singleTenant);
      }
    }
  }

  return filteredTenants;
}

const makeDeleteRequest = async (tenant) => {
  const url = new URL(
    `${process.env["HG_API_URL"]}/tenant/${process.env["HG_ENV_ID"]}/${tenant}`
  );

  await axios.delete(url.toString(), {
    headers: {
      "x-api-key": process.env["HG_API_KEY"],
    },
  });
};

async function deleteShopTenants(shop) {
  const shopId = shopIdFromShop(shop);

  const tenants = await getTenantsByPrefix(`${shopId}_`);

  await Promise.all(tenants.map(makeDeleteRequest));
}

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.keys = [Shopify.Context.API_SECRET_KEY];

  // insert first here
  server.use(async (ctx, nxt) => {
    // cl("::m", ctx.req.method, "\n::r", ctx.req.url, "\n::h", ctx.req.headers);
    cl(ctx.req.method, ctx.req.url);
    await nxt();
  });

  server.use(
    createShopifyAuth({
      accessMode: "offline",
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;
        ACTIVE_SHOPIFY_SHOPS[shop] = new Date();

        const response = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "/webhooks",
          topic: "APP_UNINSTALLED",
          webhookHandler: async (topic, shop, body) => {
            cl("Uninstalling for shop", shop);
            const appInstalledAt = ACTIVE_SHOPIFY_SHOPS[shop];
            const webhookTriggeredAt = WEBHOOK_TRIGGER_TIMESTAMPS[shop];
            if (
              appInstalledAt === undefined ||
              webhookTriggeredAt === undefined ||
              webhookTriggeredAt < appInstalledAt
            ) {
              cl(
                "Webhook was triggered before the installation. Skipping app uninstall..."
              );
            }
            delete ACTIVE_SHOPIFY_SHOPS[shop];
            await deleteShopTenants(shop);
          },
        });

        if (!response.success) {
          console.log(
            `Failed to register APP_UNINSTALLED webhook: ${response.result}`
          );
        }

        // Get the Shopify shop id
        const shopId = shopIdFromShop(shop);
        // Check if the tenant already exists
        const tenantsWithPrefix = await getTenantsByPrefix(`${shopId}_`);
        let tenantId;

        if (tenantsWithPrefix.length === 0) {
          // Generate tenant id
          const randId = crypto.randomBytes(20).toString("hex").substring(0, 5);
          tenantId = `${shopId}_${randId}`;
        } else {
          // Get the existing tenantId
          tenantId = tenantsWithPrefix[0];
        }

        console.log("Linking tenant...");

        // Init config
        const config = {
          api_key: accessToken,
          access_token: accessToken,
          shop: shopId,
        };

        // Debug
        cl(
          `Writing config: [${JSON.stringify(config)}] for tenant [${tenantId}]`
        );

        // Update the linked source
        try {
          await linkTenant(tenantId, config);
        } catch (err) {
          cl(`Failed to link tenant`, err);
        }

        // Redirect to app with shop parameter upon auth
        if (tenantsWithPrefix.length === 0) {
          ctx.redirect(
            `${process.env["APP_URL"]}?flowId=${process.env["HG_FLOW_ID"]}&tenantId=${tenantId}&sourceId=shopify&store=${shopId}`
          );
        } else {
          ctx.redirect(process.env["APP_URL"]);
        }
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  router.post("/webhooks", async (ctx) => {
    try {
      WEBHOOK_TRIGGER_TIMESTAMPS[
        ctx.req.headers["x-shopify-shop-domain"]
      ] = new Date(ctx.req.headers["x-shopify-triggered-at"]);
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true }),
    async (ctx, next) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear

  router.get("(.*)", async (ctx) => {
    const shop = ctx.query.shop;

    // This shop hasn't been seen yet, go through OAuth to create a session
    if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
      ctx.redirect(`/auth?shop=${shop}`);
    } else {
      await handleRequest(ctx);
    }
  });

  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});

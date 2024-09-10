const { parsed: localEnv } = require("dotenv").config();

const webpack = require("webpack");
const apiKey = JSON.stringify(process.env.SHOPIFY_API_KEY);
const appUrl = process.env.APP_URL;
const hgApiUrl = process.env.HG_API_URL;
const hgEnvId = process.env.HG_ENV_ID;
const hgFlowId = process.env.HG_FLOW_ID;
const hgFlowVersion = process.env.HG_FLOW_VERSION ?? "1";

module.exports = {
  env: {
    APP_URL: appUrl,
    HG_API_URL: hgApiUrl,
    HG_ENV_ID: hgEnvId,
    HG_FLOW_ID: hgFlowId,
    HG_FLOW_VERSION: hgFlowVersion,
  },
  webpack: (config) => {
    const env = {
      API_KEY: apiKey,
      NEXT_PUBLIC_API_KEY: apiKey,
      SHOPIFY_API_KEY: apiKey,
      NEXT_PUBLIC_SHOPIFY_API_KEY: apiKey,
      APP_URL: appUrl,
      NEXT_PUBLIC_APP_URL: appUrl,
    };
    config.plugins.push(new webpack.DefinePlugin(env));

    // Add ESM support for .mjs files in webpack 4
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });

    return config;
  },
};

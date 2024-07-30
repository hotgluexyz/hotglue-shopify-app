const fs = require("fs");

fs.copyFileSync(
  "./server/hotglueOauth.js",
  "./node_modules/@shopify/shopify-api/dist/auth/oauth/oauth.js"
);

console.log("shopify-api oauth.js updated");

require("@babel/register")({
  presets: ["@babel/preset-env"],
  ignore: ["node_modules"],
});

// Import the rest of our application.
module.exports = require("./server.js");

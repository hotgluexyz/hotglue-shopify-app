import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = (shop) =>
  createHttpLink({
    uri: `https://${shop}/admin/api/2019-10/graphql.json`,
  });

const authLink = (accessToken) =>
  setContext((_, { headers }) => {
    // return the headers to the context so httpLink can read them
    return {
      headers: {
        ...headers,
        "X-Shopify-Access-Token": accessToken,
      },
    };
  });

export const createClient = (shop, accessToken) => {
  return new ApolloClient({
    link: authLink(accessToken).concat(httpLink(shop)),
    cache: new InMemoryCache(),
    request: (operation) => {
      operation.setContext({
        headers: {
          "User-Agent": `shopify-app-node ${process.env.npm_package_version} | Shopify App CLI`,
        },
      });
    },
  });
};

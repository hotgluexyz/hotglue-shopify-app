import { useEffect, useState } from "react";
import {
  Heading,
  Page,
  Layout,
  Button,
  Card,
  FormLayout,
  TextStyle,
} from "@shopify/polaris";
import { ExternalMinor } from "@shopify/polaris-icons";

const makeGetRequest = async (url, apiKey) => {
  const response = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    return { data: undefined };
  }

  return { data: await response.json() };
};

async function getTenantsByPrefix(hgApiUrl, hgEnvId, hgApiKey, shopId) {
  const url = new URL(`${hgApiUrl}/tenants/${hgEnvId}`);

  if (shopId) {
    url.searchParams.set("tenant", shopId);
  }

  const resp = await makeGetRequest(url.toString(), hgApiKey);

  return resp.data;
}

export async function getServerSideProps(ctx) {
  const {
    HG_API_URL: hgApiUrl,
    HG_API_KEY: hgApiKey,
    HG_ENV_ID: hgEnvId,
  } = process.env;
  const { shop } = ctx.query;
  let store = undefined;
  let tenantId = undefined;

  if (shop) {
    store = shop.split(".")[0];
    const tenants = await getTenantsByPrefix(
      hgApiUrl,
      hgEnvId,
      hgApiKey,
      store
    );
    tenantId = tenants?.[0];
  }

  return { props: { store, tenantId } };
}

const Index = (props) => {
  const { store, tenantId } = props;

  useEffect(() => {
    const url = new URL(process.env["APP_URL"]);

    if (store) {
      url.searchParams.set("store", store);
    }

    if (tenantId) {
      url.searchParams.set("tenantId", tenantId);
    }

    window.location = url.toString();
  }, []);

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Heading>{process.env["APP_NAME"]}</Heading>
          <p>
            <TextStyle>{process.env["APP_DESCRIPTION"]}</TextStyle>
          </p>
          <Card sectioned>
            <FormLayout>
              <TextStyle>Login to {process.env["APP_NAME"]}</TextStyle>
              <Button
                accessibilityLabel={`Login to ${process.env["APP_NAME"]} (opens a new window)`}
                icon={ExternalMinor}
                url={process.env["APP_URL"]}
                external
              >
                Login
              </Button>
            </FormLayout>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Index;

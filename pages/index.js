import { useEffect } from "react";
import {
  Heading,
  Page,
  Layout,
  Button,
  Banner,
  Card,
  FormLayout,
  TextField,
  TextStyle,
} from "@shopify/polaris";
import { ExternalMinor } from "@shopify/polaris-icons";

const Index = () => {
  useEffect(() => {
    const currentUrl = new URL(window.location);
    const url = new URL(process.env["APP_URL"]);

    if (currentUrl.searchParams.has("shop")) {
      const shopId = currentUrl.searchParams.get("shop").split(".")[0];
      url.searchParams.set("store", shopId);
    }

    // Automatically redirect to the app
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

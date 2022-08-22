# hotglue shopify app

This is a genericized Shopify app built to run on Heroku that allows you to the use [hotglue](https://hotglue.com) to import data from your users' Shopify store(s).

## Setup

### Install the Heroku CLI

To get started, you will need to install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#install-the-heroku-cli). There are multiple ways to do this depending on your operating system.

### Create a Heroku project

We recommend using the Heroku CLI and [deploying via Git](https://devcenter.heroku.com/articles/git#for-a-new-app) to keep things simple.

Create the Heroku app:

```
heroku create -a acme-shopify-app
```

### Deploy to Heroku

You can now deploy the Shopify app [directly to Heroku using Git](https://devcenter.heroku.com/articles/git#deploy-your-code):

```
git push heroku master
```

### Create your Shopify app

In your [Shopify Partner](https://www.shopify.com/partners) account, you can now add a new app.

Make sure you set the App URL here to your Heroku App URL. Also keep your Shopify api key/secret from the app settings, you will need them in the next step.

Add the Redirect URL: `<heroku app url>/auth/callback`
For example, `https://hg-demo-shopify-app.herokuapp.com/auth/callback`

### Setup your environment variables

There are several required environment variables to make the Shopify app work as desired:

```
# shopify details
SHOPIFY_API_KEY="YOUR_SHOPIFY_API_KEY"
SHOPIFY_API_SECRET="YOUR_SHOPIFY_SECRET"
HOST="YOUR_HEROKU_APP_URL"
SCOPES=read_discounts,read_inventory,read_locations,read_orders,read_price_rules,read_products,read_shipping
# app details
APP_NAME=hotglue
APP_URL=https://hotglue.com
APP_DESCRIPTION=Sample description
# hotglue env details
HG_API_URL=https://client-api.hotglue.xyz
HG_ENV_ID=dev.hotglue.acme.com
HG_FLOW_ID=RYiRJ3OQM
HG_API_KEY=123
```

## Testing

To confirm your Shopify app is working, head to the following url: `<heroku app url>/auth?shop=<shopify app url>`

for example: `https://thawing-inlet-61413.herokuapp.com/auth?shop=hotglue-testing-1.myshopify.com`

If all worked as expected, this should redirect you to authorize and install your Shopify app.

## License

This repository is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).

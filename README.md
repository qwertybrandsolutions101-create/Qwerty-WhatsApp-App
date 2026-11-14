# Qwerty WhatsApp mobile app

Separate Android/iOS shell for the live Qwerty Indian WhatsApp CRM.

## Data flow

The app does not create a second chat database. It opens the authenticated live workspace at:

`https://qwertybrandsolutions.com/dashboard/messenger/?account=india`

That workspace uses the existing same-origin `whatsapp-api.php` adapter, Omni WhatsApp number/configuration, and n8n-ingested call and lead events. Consequently, a chat or status update visible on the website is read from the same source by this app.

## Authentication

The app uses a dedicated mobile-app access credential and opens the Indian WhatsApp workspace directly. It does not show the Qwerty Dashboard sign-in screen. The website dashboard keeps its existing authenticated session flow.

## Build

1. Install dependencies: `npm install`
2. Validate: `npm run check`
3. Create an internal Android APK: `npm run build:android`

Android package: `com.qwertybrandsolutions.whatsapp`

This is separate from `com.qwertybrandsolutions.console`, so both apps can be installed together.

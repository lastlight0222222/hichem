# Netlify setup

This site uses Netlify Functions for suggestions, admin login, and PDF uploads. Netlify Blobs stores suggestions and uploaded PDFs; uploaded PDF data is not placed in the public site folder. Published files are served through a Netlify Function on the site's hostname.

## Deploy from GitHub

1. In Netlify, choose **Add new site** → **Import an existing project** and connect the GitHub repository.
2. Choose the `main` branch.
3. Set the base directory to the repository root. Netlify reads the build command, publish directory, and function directory from `netlify.toml`.
4. Deploy the site.

## Configure environment variables

In the Netlify site, go to **Site configuration** → **Environment variables** and add:

- `ADMIN_PASSWORD`: a long, unique administrator password.
- `ADMIN_SESSION_SECRET`: a randomly generated secret of at least 32 characters.
- `DISCORD_WEBHOOK_URL`: an optional Discord webhook URL, stored as a secret. Rotate the webhook previously shared in chat before using it.

For a secure PowerShell-generated session secret, run `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` locally and copy the output directly into Netlify's environment-variable settings. Do not commit credentials or put them in frontend files.

Redeploy after changing environment variables.

## Admin panel

Open `https://<your-site>.netlify.app/admin/` and enter `ADMIN_PASSWORD`. The server sets an HTTP-only, secure, same-site session cookie. The panel lets you upload PDFs, review suggestions, update suggestion status, and delete records.

Configure `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` before publishing. The function endpoints independently verify the signed session; an unlisted admin URL is not an access control.

## PDF uploads and data

Netlify Blobs is provisioned automatically for deployed Netlify functions. PDF blobs are stored in the site's private `bac-si-content` store, not in a public folder or a direct public bucket. The public resource page lists published PDFs, which are streamed through the site-hosted function endpoint. Uploads are limited to 4 MB to stay below Netlify's synchronous function request limits.

Netlify Blobs also stores suggestions and uploaded-PDF metadata. Data persists between site deploys. Deleting an uploaded PDF from the admin panel removes its metadata and file blob.

PDFs already included in the repository remain public static files. Only PDFs uploaded through the admin panel are stored privately.

## Local development

Install dependencies with `npm install`, add `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` to a local `.env` file (optionally add `DISCORD_WEBHOOK_URL`), then run `npx --yes netlify-cli dev --offline`. The `.env` file is ignored by Git. The offline Netlify CLI provides the local site, functions, and Blobs emulator.

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
- `TEACHER_PASSWORD`: a separate password for the upload-only teacher page.
- `ADMIN_SESSION_SECRET`: a randomly generated secret of at least 32 characters.
- `DISCORD_WEBHOOK_URL`: an optional Discord webhook URL, stored as a secret. Rotate the webhook previously shared in chat before using it.

For a secure PowerShell-generated session secret, run `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` locally and copy the output directly into Netlify's environment-variable settings. Do not commit credentials or put them in frontend files.

Redeploy after changing environment variables.

## Admin panel

Open `https://<your-site>.netlify.app/admin/` and enter `ADMIN_PASSWORD`. The server sets an HTTP-only, secure, same-site session cookie. Administrators can add, edit, and remove lessons; manage PDF listings and metadata; and review, update, or delete suggestions.

Teachers use `https://<your-site>.netlify.app/teachers/` and `TEACHER_PASSWORD`. Teacher sessions can upload PDFs only; they cannot edit lessons, delete PDFs, or access suggestions. The teacher page is not linked from the public site, but its API is protected by the separate teacher credential.

Configure `ADMIN_PASSWORD`, `TEACHER_PASSWORD`, and `ADMIN_SESSION_SECRET` before publishing. The function endpoints independently verify role-specific signed sessions; an unlisted URL is not an access control.

## PDF uploads and data

Netlify Blobs is provisioned automatically for deployed Netlify functions. Uploaded PDF blobs, lesson content, and publication settings are stored in the site's private `bac-si-content` store. Uploaded PDFs are streamed through the site-hosted function endpoint. Uploads are limited to 4 MB to stay below Netlify's synchronous function request limits.

Netlify Blobs also stores suggestions and uploaded-PDF metadata. Data persists between site deploys. The admin panel can hide any PDF, edit uploaded-PDF details, and permanently delete uploaded PDFs. A PDF assigned to a lesson must first be removed or replaced in that lesson.

Repository PDFs are kept in the `pdfs/` folder and can be published or hidden from the admin panel. Lessons shown on the public page are stored in Netlify Blobs and can be edited or removed by the administrator. Teachers can upload new documents, and the administrator can assign them to lessons.

## Local development

Install dependencies with `npm install`, add `ADMIN_PASSWORD`, `TEACHER_PASSWORD`, and `ADMIN_SESSION_SECRET` to a local `.env` file (optionally add `DISCORD_WEBHOOK_URL`), then run `npx --yes netlify-cli dev --offline`. The `.env` file is ignored by Git. The offline Netlify CLI provides the local site, functions, and Blobs emulator.

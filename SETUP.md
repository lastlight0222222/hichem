# Cloudflare Pages setup

The admin page is at `/admin/` and is not linked from the public navigation. Its URL is not a security boundary: protect the page and admin API with Cloudflare Access, and set the Access environment values below so the API verifies the signed identity token too.

## 1. Create D1 storage

Create a D1 database named `bac-si-suggestions` in the Cloudflare dashboard. Apply `migrations/0001_initial.sql` to that database using the D1 console or Wrangler:

```powershell
npx wrangler d1 execute bac-si-suggestions --remote --file=migrations\0001_initial.sql
```

In the Pages project settings, add a D1 database binding named `DB` and select `bac-si-suggestions`. Add the binding to both production and preview environments if previews should be usable.

Apply the second migration to create the PDF metadata table:

```powershell
npx wrangler d1 execute bac-si-suggestions --remote --file=migrations\0002_pdf_resources.sql
```

## 2. Configure PDF storage

Create a private R2 bucket named `bac-si-pdfs`. In the Pages project settings, add an R2 bucket binding named exactly `PDF_BUCKET` and select that bucket. Do not enable public bucket access or connect a public custom domain to the bucket. Uploaded objects are stored under the bucket's `private-pdfs/` key prefix; this is an R2 folder-like prefix, not a public folder in the website repository. The Pages Function reads and serves published files through the Cloudflare Pages hostname.

The Access-protected admin page at `/admin/` accepts PDF files up to 25 MB. It checks the declared file type and PDF header before storing the file. Uploaded PDFs are published immediately in the public Resources section and are readable through the site's Cloudflare hostname. Deleting a PDF in admin removes it from the list and deletes its R2 object. Existing bundled PDF files in the repository remain normal public static assets.

## 3. Configure the Discord webhook secret

Delete or regenerate the webhook URL that was shared in chat. Add the replacement to the Pages project as a secret environment variable named `DISCORD_WEBHOOK_URL`. Never put the URL in website files or commit it.

## 4. Configure Cloudflare Access

Create a self-hosted Access application for the deployed hostname. Add path policies covering both `/admin*` and `/api/admin/*`, and allow only your own Cloudflare Access identity. Protecting only the page is not sufficient; the admin API must be behind the same policy.

In the Pages project environment variables, set:

- `ACCESS_TEAM_DOMAIN`: your team domain, for example `my-team.cloudflareaccess.com` without `https://`
- `ACCESS_AUD`: the audience tag shown in the Access application settings

The admin API independently validates the Access JWT signature, issuer, audience, and expiry. Do not use a public bypass policy for the admin API.

## 5. Deploy and test

Deploy the directory as a Cloudflare Pages project with Functions enabled, using Git integration or Wrangler. Cloudflare dashboard drag-and-drop Direct Upload does not deploy Pages Functions. With Wrangler, use:

```powershell
npx wrangler pages deploy . --project-name=<PAGES_PROJECT_NAME>
```

For local development, bind a local D1 database and provide local secrets through Wrangler's `.dev.vars` file, which must not be committed:

```text
DISCORD_WEBHOOK_URL=your-rotated-webhook-url
ACCESS_TEAM_DOMAIN=your-team.cloudflareaccess.com
ACCESS_AUD=your-access-application-audience
```

Bind a local D1 database and R2 bucket when starting Pages dev. Apply both migrations to the local D1 database. For example, with a local database ID:

```powershell
npx wrangler pages dev . --d1 DB=<D1_DATABASE_ID> --r2 PDF_BUCKET=bac-si-pdfs --port 8788
```

Open `http://localhost:8788`, not the `index.html` or `admin/index.html` file directly. Opening the page through `file://` or a static-only server cannot run the Pages Functions and causes API requests to fail. Local admin API requests also require a valid Cloudflare Access JWT, so test admin login and management on a deployed preview protected by the Access application.

Suggestions and PDF metadata are stored in D1. Uploaded PDF files are stored privately in R2. Suggestions and PDFs remain available until deleted from the admin page. Discord notification delivery is tracked separately so a temporary webhook failure does not discard a suggestion.

For local Pages development, replace the binding value with the D1 database ID:

```powershell
npx wrangler pages dev . --d1 DB=<D1_DATABASE_ID>
```

Add a Cloudflare rate-limiting rule for `POST /api/suggestions` on the production hostname, for example 5 requests per minute per IP, to reduce automated spam.

Consider adding a rate limit for `POST /api/admin/pdfs` as an additional safeguard against accidental repeated uploads and unexpected R2 usage.

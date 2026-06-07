# LINF Product Studio V4

## Local Collector API

Run the collector on the user's local computer:

```bash
pip install -r linf_collector_requirements.txt
python -m playwright install chromium
python linf_collector_api.py
```

The API starts at:

```text
http://127.0.0.1:8765
```

Endpoint:

```text
POST /collect
Content-Type: application/json

{"url":"1688 product URL"}
```

The collector opens 1688 in a visible Playwright browser. If 1688 asks for
login, captcha, or risk verification, the user must complete it manually in the
browser window. The collector does not bypass login, captcha, or risk controls.

## Admin Flow

1. Open `admin.html`.
2. Enter `Product Studio V4`.
3. Paste a 1688 product link.
4. Click `Collect From 1688`.
5. Review generated title, category, description, SEO, MOQ and services.
6. Click `Save as Draft` or `Publish Product`.

Manual `product.json` and local image upload remain available as a fallback.

## Vercel Gmail SMTP

Set these Environment Variables in Vercel before deploying:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_TO=amyfeng0713@gmail.com
```

Use a Gmail App Password for `SMTP_PASS`. Do not commit SMTP passwords into code.

## Supabase

Run `backend/supabase-schema.sql` or `../product-import-v4-migration.sql` in the
Supabase SQL editor before publishing products.

Images are uploaded to the public storage bucket:

```text
product-images
```

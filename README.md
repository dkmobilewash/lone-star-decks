# Lone Star Decks & Outdoor Living — Website

A fast static website for **Lone Star Decks & Outdoor Living**, a deck and outdoor living builder serving Hill Country San Antonio.
📞 (830) 431-1093 · info@lonestardeckstx.com

## What's included

- **Home, About, Contact, Thank-you and 404 pages**
- **15 service pages** (`/services/<slug>/`): custom decks, composite decks, wood decks, elevated and multi-level decks, covered patios, pergolas, pavilions, outdoor kitchens, paver patios, fire pits, screened porches, railings, deck repair, staining and outdoor lighting
- **17 neighborhood pages** (`/service-areas/<slug>/`): Stone Oak, The Dominion, Shavano Park, Hollywood Park, Helotes, Leon Springs, Fair Oaks Ranch, Boerne, Cordillera Ranch, Cibolo Canyons, Timberwood Park, Bulverde, Spring Branch, Canyon Lake, Garden Ridge, Encino Park and Sonterra
- Local SEO built in: unique titles and descriptions, canonical URLs, Open Graph tags, `LocalBusiness`, `Service`, `FAQPage` and breadcrumb structured data, plus `sitemap.xml` and `robots.txt`
- A mobile-first layout with a sticky "Call for a Free Quote" bar on phones

## Editing content

All copy lives in plain data files, so you don't need to touch any HTML:

| File | What it controls |
| --- | --- |
| `src/data/site.mjs` | Business name, phone, email, tagline and domain |
| `src/data/services.mjs` | Every service page (text, options, FAQs, related services) |
| `src/data/areas.mjs` | Every neighborhood page (intro, local notes, popular services, nearby areas, FAQs) |
| `src/assets/` | Logo, images, CSS and JavaScript |

To add a neighborhood or service, copy an existing entry, change the `slug` and text, and rebuild. Navigation, the footer, the sitemap and cross-links update automatically.

## Build and preview

Requires Node 18 or newer. There are no dependencies to install.

```bash
npm run dev      # build and preview at http://localhost:8080
npm run build    # build only; outputs to ./dist
```

## Deploying (Vercel)

Connect the repo to Vercel. `vercel.json` sets the build command and output folder, and the `api/` folder deploys automatically as a serverless function.

### Quote form emails (Resend)

Every quote form on the site posts to `/api/quote` (`api/quote.js`). That function emails the lead to Scott through [Resend](https://resend.com). The lead's email address is set as the reply-to, so hitting reply answers the customer directly. Spam bots are filtered out with a hidden honeypot field.

Add these in **Vercel → Project → Settings → Environment Variables**, then redeploy:

| Variable | Required | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes | Your Resend API key (starts with `re_`) |
| `LEAD_TO_EMAIL` | No | Where leads go. Defaults to `scott@lonestardeckstx.com`. Separate several addresses with commas. |
| `RESEND_FROM_EMAIL` | No | Sender address on your verified domain. Defaults to `Lone Star Decks Website <leads@lonestardeckstx.com>`. |

The form posts only work on Vercel; `npm run dev` previews the pages but doesn't run `/api/quote`. To test locally, use `vercel dev`.

If you deploy to a domain other than `https://lonestardeckstx.com`, set the `SITE_URL` environment variable so canonical URLs and the sitemap are correct.

## Next steps that boost rankings

- Replace the illustrated hero with **real project photos** (put them in `src/assets/img/`)
- Add **real customer reviews** and link your Google Business Profile
- Add a street address or service-area city to `site.mjs` if you want it shown in your structured data

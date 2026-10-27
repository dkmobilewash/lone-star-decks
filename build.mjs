// Static site generator for Lone Star Decks & Outdoor Living.
// Usage: node build.mjs   → writes the full site to ./dist
import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from './src/data/site.mjs';
import { services, serviceBySlug } from './src/data/services.mjs';
import { areas, areaBySlug, regions } from './src/data/areas.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');
const pages = []; // { path, html }

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const abs = (path) => site.url.replace(/\/$/, '') + path;
const serviceUrl = (s) => `/services/${s.slug}/`;
const areaUrl = (a) => `/service-areas/${a.slug}/`;

// ---------- Icons ----------
const iconPaths = {
  deck: '<path d="M3 14h18M5 14v6M19 14v6M12 14v6M3 10l9-6 9 6"/><path d="M6 10v4M18 10v4"/>',
  boards: '<rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/>',
  tree: '<path d="M12 22v-6"/><path d="M12 2 5 12h4l-3 4h12l-3-4h4z"/>',
  levels: '<path d="M2 20h6v-4h6v-4h6V8"/><path d="M2 20v-2M8 16v4M14 12v8M20 8v12"/>',
  roof: '<path d="M2 11 12 4l10 7"/><path d="M5 9.5V20M19 9.5V20M3 20h18"/>',
  pergola: '<path d="M2 6h20M2 9h20M5 6v15M19 6v15M8 4v5M12 4v5M16 4v5"/>',
  pavilion: '<path d="M3 9 12 3l9 6z"/><path d="M5 9v12M19 9v12M9 9v12M15 9v12"/>',
  grill: '<path d="M4 10h16a8 8 0 0 1-16 0z"/><path d="M8 18l-2 4M16 18l2 4M9 6c0-1 1-1 1-2M13 6c0-1 1-1 1-2"/>',
  pavers: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="5"/><rect x="13" y="10" width="8" height="11"/><rect x="3" y="13" width="8" height="8"/>',
  fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2-1-4 0-6z"/><path d="M4 21h16"/>',
  screen: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>',
  railing: '<path d="M2 6h20M2 20h20M4 6v14M20 6v14M12 6v14M4 10h16M4 14h16"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  brush: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-5 2-5 5 0 2-1 3-2 4 4 0 8-1 9-4z"/>',
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  star: '<path d="m12 2 3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z"/>',
};
const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;

// Dusk Hill Country scene used behind every page hero.
const heroScene = `
<svg class="hero-scene" viewBox="0 0 1440 420" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
  <circle cx="1130" cy="250" r="90" fill="#e8a25a" opacity=".22"/>
  <circle cx="1130" cy="250" r="55" fill="#f0b46e" opacity=".35"/>
  <path d="M0 300 C180 230 300 260 450 220 S760 170 900 230 1200 200 1440 240 V420 H0Z" fill="#1d3d68"/>
  <path d="M0 340 C220 290 380 320 560 280 S900 260 1080 300 1300 280 1440 300 V420 H0Z" fill="#163257"/>
  <path d="M0 375 C260 345 520 370 760 345 S1200 350 1440 340 V420 H0Z" fill="#0f2645"/>
  <g fill="#0b1d36">
    <circle cx="90" cy="345" r="26"/><circle cx="125" cy="335" r="32"/><circle cx="165" cy="350" r="22"/>
    <circle cx="1320" cy="330" r="30"/><circle cx="1360" cy="320" r="36"/><circle cx="1400" cy="335" r="26"/>
  </g>
  <g class="scene-deck">
    <rect x="760" y="356" width="560" height="10" fill="#b0622b"/>
    <rect x="760" y="366" width="560" height="6" fill="#7d4219"/>
    <g fill="#9a5424">
      <rect x="800" y="372" width="10" height="48"/><rect x="1000" y="372" width="10" height="48"/><rect x="1200" y="372" width="10" height="48"/>
    </g>
    <g stroke="#c27a3d" stroke-width="2">
      <line x1="760" y1="320" x2="1320" y2="320"/><line x1="760" y1="332" x2="1100" y2="332"/><line x1="760" y1="344" x2="1100" y2="344"/>
    </g>
    <g fill="#b0622b">
      <rect x="758" y="314" width="9" height="42"/><rect x="890" y="314" width="9" height="42"/><rect x="1020" y="314" width="9" height="42"/>
      <rect x="1100" y="236" width="12" height="120"/><rect x="1300" y="236" width="12" height="120"/>
      <rect x="1080" y="228" width="250" height="10"/><rect x="1080" y="242" width="250" height="6"/>
    </g>
    <g fill="#c27a3d"><rect x="1095" y="220" width="8" height="8"/><rect x="1135" y="220" width="8" height="8"/><rect x="1175" y="220" width="8" height="8"/><rect x="1215" y="220" width="8" height="8"/><rect x="1255" y="220" width="8" height="8"/><rect x="1295" y="220" width="8" height="8"/></g>
    <path d="M1112 254 Q1160 272 1206 256 Q1252 272 1300 254" stroke="#5b3a1e" stroke-width="1.5" fill="none"/>
    <g fill="#ffd27a"><circle cx="1136" cy="264" r="4"/><circle cx="1180" cy="266" r="4"/><circle cx="1230" cy="264" r="4"/><circle cx="1276" cy="263" r="4"/></g>
  </g>
</svg>`;

// ---------- Shared fragments ----------
const navServices = services
  .map((s) => `<li><a href="${serviceUrl(s)}">${icon(s.icon)}<span>${esc(s.name)}</span></a></li>`)
  .join('');
const navAreas = regions
  .map(
    (r) => `<div class="mega-col"><p class="mega-head">${esc(r.name)}</p><ul>${areas
      .filter((a) => a.region === r.key)
      .map((a) => `<li><a href="${areaUrl(a)}">${esc(a.name)}</a></li>`)
      .join('')}</ul></div>`
  )
  .join('');

const header = (path) => `
<a class="skip" href="#main">Skip to content</a>
<div class="topbar">
  <div class="wrap topbar-inner">
    <p>☀️ ${esc(site.tagline)}</p>
    <p class="topbar-contact"><a href="mailto:${site.email}">${icon('mail')}${site.email}</a><a href="${site.phoneHref}">${icon('phone')}${site.phone}</a></p>
  </div>
</div>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="/" aria-label="${esc(site.name)} home">
      <img src="/assets/img/logo-sm.webp" alt="${esc(site.name)} logo" width="110" height="90">
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span><span class="sr">Menu</span></button>
    <nav id="site-nav" class="site-nav" aria-label="Main">
      <ul class="nav-list">
        <li class="has-menu${path.startsWith('/services') ? ' is-active' : ''}">
          <a href="/services/">Services</a>
          <button class="submenu-toggle" aria-label="Show services" aria-expanded="false">▾</button>
          <div class="menu menu-services"><ul>${navServices}</ul></div>
        </li>
        <li class="has-menu${path.startsWith('/service-areas') ? ' is-active' : ''}">
          <a href="/service-areas/">Service Areas</a>
          <button class="submenu-toggle" aria-label="Show service areas" aria-expanded="false">▾</button>
          <div class="menu menu-areas">${navAreas}</div>
        </li>
        <li${path === '/about/' ? ' class="is-active"' : ''}><a href="/about/">About</a></li>
        <li${path === '/contact/' ? ' class="is-active"' : ''}><a href="/contact/">Contact</a></li>
      </ul>
      <a class="btn btn-wood nav-cta" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a>
    </nav>
  </div>
</header>`;

const footer = () => `
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <img class="footer-logo" src="/assets/img/logo-sm.webp" alt="${esc(site.name)}" width="180" height="148" loading="lazy">
      <p>${esc(site.tagline)}.</p>
      <p class="footer-sub">🛠️ Decks • Patios • Outdoor Spaces</p>
    </div>
    <div>
      <h2>Services</h2>
      <ul>${services.map((s) => `<li><a href="${serviceUrl(s)}">${esc(s.name)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2>Service Areas</h2>
      <ul class="cols-2">${areas.map((a) => `<li><a href="${areaUrl(a)}">${esc(a.name)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h2>Get a Free Quote</h2>
      <ul class="footer-contact">
        <li><a href="${site.phoneHref}">${icon('phone')}${site.phone}</a></li>
        <li><a href="mailto:${site.email}">${icon('mail')}${site.email}</a></li>
        <li>${icon('pin')}Serving ${esc(site.region)}</li>
      </ul>
      <a class="btn btn-wood" href="/contact/">Request a Free Quote</a>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <p>© ${new Date().getFullYear()} ${esc(site.name)}. All rights reserved.</p>
    <p><a href="/sitemap.xml">Sitemap</a></p>
  </div>
</footer>
<a class="mobile-call" href="${site.phoneHref}">${icon('phone')} Call for a Free Quote</a>`;

const breadcrumbs = (trail) => `
<nav class="crumbs" aria-label="Breadcrumb"><ol>${trail
  .map((c, i) => (i === trail.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${c.path}">${esc(c.name)}</a></li>`))
  .join('')}</ol></nav>`;

const breadcrumbSchema = (trail) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
});

const faqSchema = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  '@id': abs('/#business'),
  name: site.name,
  alternateName: site.shortName,
  slogan: site.tagline,
  url: abs('/'),
  logo: abs('/assets/img/logo.png'),
  image: abs('/assets/img/og-image.jpg'),
  telephone: '+1-830-431-1093',
  email: site.email,
  priceRange: '$$',
  address: { '@type': 'PostalAddress', addressRegion: 'TX', addressCountry: 'US' },
  areaServed: areas.map((a) => ({ '@type': 'Place', name: `${a.name}, TX` })),
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Decks & Outdoor Living Services',
    itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name, url: abs(serviceUrl(s)) } })),
  },
};

const faqList = (faqs) => `
<div class="faq-list">${faqs
  .map((f) => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
  .join('')}</div>`;

const quoteForm = (opts = {}) => `
<form class="quote-form" name="quote" method="POST" action="/thank-you/" data-netlify="true" netlify-honeypot="company">
  <input type="hidden" name="form-name" value="quote">
  <input type="hidden" name="page" value="${esc(opts.page || '')}">
  <p class="hp"><label>Leave this empty <input name="company" tabindex="-1" autocomplete="off"></label></p>
  <div class="field-row">
    <label>Name<input name="name" required autocomplete="name"></label>
    <label>Phone<input name="phone" type="tel" required autocomplete="tel"></label>
  </div>
  <label>Email<input name="email" type="email" autocomplete="email"></label>
  <div class="field-row">
    <label>Neighborhood
      <select name="neighborhood">
        <option value="">Select…</option>
        ${areas.map((a) => `<option${opts.area === a.slug ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}
        <option>Other</option>
      </select>
    </label>
    <label>Project type
      <select name="service">
        <option value="">Select…</option>
        ${services.map((s) => `<option${opts.service === s.slug ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}
        <option>Not sure yet</option>
      </select>
    </label>
  </div>
  <label>Tell us about your project<textarea name="message" rows="4" placeholder="Size, materials, timeline, photos you can send later…"></textarea></label>
  <button class="btn btn-wood btn-block" type="submit">Get My Free Quote</button>
  <p class="form-note">Prefer to talk? Call <a href="${site.phoneHref}">${site.phone}</a> or email <a href="mailto:${site.email}">${site.email}</a>.</p>
</form>`;

const quoteSection = (opts = {}) => `
<section class="section quote-section" id="quote">
  <div class="wrap quote-grid">
    <div class="quote-copy">
      <p class="eyebrow">Free, no-pressure quotes</p>
      <h2>${esc(opts.heading || 'Let’s build your backyard')}</h2>
      <p>${esc(opts.text || 'Tell us a little about your project and we’ll set up a time to visit your property, talk through ideas and give you a clear, written quote.')}</p>
      <ul class="checks">
        <li>${icon('check')} On-site consultation and measurements</li>
        <li>${icon('check')} Design ideas and material options</li>
        <li>${icon('check')} HOA and permit paperwork handled</li>
        <li>${icon('check')} Clear written quote — no surprises</li>
      </ul>
      <a class="big-phone" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a>
    </div>
    <div class="quote-card">${quoteForm(opts)}</div>
  </div>
</section>`;

const ctaBand = (text = 'Ready to transform your backyard?') => `
<section class="cta-band">
  <div class="wrap cta-inner">
    <h2>${esc(text)}</h2>
    <div class="cta-actions">
      <a class="btn btn-wood" href="${site.phoneHref}">${icon('phone')} Call ${site.phone}</a>
      <a class="btn btn-ghost" href="#quote">Request a Free Quote</a>
    </div>
  </div>
</section>`;

const serviceCard = (s, area) => `
<a class="card service-card" href="${serviceUrl(s)}">
  <span class="card-icon">${icon(s.icon)}</span>
  <h3>${esc(s.name)}${area ? ` <span class="in-area">in ${esc(area.name)}</span>` : ''}</h3>
  <p>${esc(s.summary)}</p>
  <span class="card-link">Learn more ${icon('arrow')}</span>
</a>`;

const areaChips = (list) =>
  `<ul class="chips">${list.map((a) => `<li><a href="${areaUrl(a)}">${icon('pin')}${esc(a.name)}</a></li>`).join('')}</ul>`;

const pageHero = ({ eyebrow, title, lead, trail, actions = true }) => `
<section class="hero hero-sub">
  ${heroScene}
  <div class="wrap hero-inner">
    ${trail ? breadcrumbs(trail) : ''}
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1>${title}</h1>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
    ${actions ? `<div class="hero-actions"><a class="btn btn-wood" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a><a class="btn btn-ghost" href="#quote">Free Quote</a></div>` : ''}
  </div>
</section>`;

function layout({ path, title, description, body, schema = [] }) {
  const fullTitle = title.includes(site.shortName) ? title : `${title} | ${site.name}`;
  const ld = [businessSchema, ...schema].map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(path)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(path)}">
<meta property="og:image" content="${abs('/assets/img/og-image.jpg')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#10294a">
<link rel="icon" type="image/png" href="/assets/img/favicon.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css">
${ld}
</head>
<body>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/js/main.js" defer></script>
</body>
</html>`;
}

const add = (path, opts) => pages.push({ path, html: layout({ path, ...opts }) });

// ---------- Home ----------
add('/', {
  title: `Deck Builder San Antonio & Texas Hill Country | ${site.shortName}`,
  description: `${site.name} builds custom decks, covered patios, pergolas and outdoor kitchens across Stone Oak, Boerne, Helotes, Fair Oaks Ranch and the Hill Country. Call ${site.phone} for a free quote.`,
  body: `
<section class="hero hero-home">
  ${heroScene}
  <div class="wrap hero-inner">
    <p class="eyebrow">Decks • Patios • Outdoor Spaces</p>
    <h1>Backyards built for <span>Texas living</span></h1>
    <p class="lead">Custom decks, covered patios, pergolas and outdoor kitchens for homes across North San Antonio and the Texas Hill Country — designed for our slopes, our rock and our sun.</p>
    <div class="hero-actions">
      <a class="btn btn-wood" href="${site.phoneHref}">${icon('phone')} Call ${site.phone}</a>
      <a class="btn btn-ghost" href="#quote">Get a Free Quote</a>
    </div>
    <ul class="hero-points">
      <li>${icon('check')} Free on-site quotes</li>
      <li>${icon('check')} HOA &amp; permits handled</li>
      <li>${icon('check')} Built for Hill Country lots</li>
    </ul>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">What we build</p>
      <h2>Decks &amp; outdoor living services</h2>
      <p>Everything it takes to turn your backyard into the best room of the house — from the footings to the string lights.</p>
    </div>
    <div class="grid grid-3">${services.map((s) => serviceCard(s)).join('')}</div>
  </div>
</section>

<section class="section section-sand">
  <div class="wrap split">
    <div>
      <p class="eyebrow">Why Lone Star Decks</p>
      <h2>Built for the Hill Country — not a flat suburban lot</h2>
      <p>Hill Country backyards come with limestone just under the surface, steep grades, heritage live oaks, HOA review boards and a summer sun that punishes cheap materials. We design and build with all of that in mind.</p>
      <p>The result is an outdoor space that’s solid underfoot, comfortable in July and good-looking for years.</p>
      <a class="btn btn-navy" href="/about/">About Our Approach</a>
    </div>
    <ul class="feature-list">
      <li><span class="card-icon">${icon('levels')}</span><div><h3>Slopes &amp; rock, handled</h3><p>Drilled footings, multi-level layouts and engineered framing for real Hill Country terrain.</p></div></li>
      <li><span class="card-icon">${icon('tree')}</span><div><h3>Respect for your oaks</h3><p>We plan around mature trees and follow oak wilt prevention practices.</p></div></li>
      <li><span class="card-icon">${icon('roof')}</span><div><h3>Shade-first design</h3><p>Covers, pergolas and heat-smart materials so you can actually use your space in summer.</p></div></li>
      <li><span class="card-icon">${icon('check')}</span><div><h3>Paperwork included</h3><p>HOA submittals and permits where required, handled for you.</p></div></li>
    </ul>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">How it works</p>
      <h2>From first call to first cookout</h2>
    </div>
    <ol class="steps">
      <li><h3>Call or request a quote</h3><p>Tell us what you have in mind. We’ll schedule a visit at a time that works for you.</p></li>
      <li><h3>On-site design visit</h3><p>We walk your property, measure, talk through materials and listen to how you want to use the space.</p></li>
      <li><h3>Clear written quote</h3><p>You get a detailed proposal with materials, scope and timeline — then we handle HOA and permits.</p></li>
      <li><h3>Build &amp; enjoy</h3><p>Our crew builds it right, keeps the site clean and walks you through the finished project.</p></li>
    </ol>
  </div>
</section>

<section class="section section-navy">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">Where we work</p>
      <h2>Serving Hill Country San Antonio neighborhoods</h2>
      <p>We build throughout North San Antonio, the I-10 corridor, Boerne and Comal County.</p>
    </div>
    <div class="region-grid">${regions
      .map(
        (r) => `<div class="region"><h3>${esc(r.name)}</h3>${areaChips(areas.filter((a) => a.region === r.key))}</div>`
      )
      .join('')}</div>
    <p class="center"><a class="btn btn-ghost" href="/service-areas/">View All Service Areas</a></p>
  </div>
</section>

<section class="section">
  <div class="wrap narrow">
    <div class="section-head">
      <p class="eyebrow">Questions</p>
      <h2>Frequently asked questions</h2>
    </div>
    ${faqList(homeFaqs())}
  </div>
</section>

${quoteSection({ page: 'Home' })}
`,
  schema: [faqSchema(homeFaqs())],
});

function homeFaqs() {
  return [
    { q: 'What areas do you serve?', a: `We serve North San Antonio and the Texas Hill Country, including ${areas.map((a) => a.name).join(', ')}.` },
    { q: 'Do you offer free quotes?', a: `Yes. Call ${site.phone} or send us a message and we will schedule a free on-site consultation and written quote.` },
    { q: 'Do you handle HOA approval and permits?', a: 'Yes. We prepare drawings and material selections for HOA architectural review and pull permits wherever they are required.' },
    { q: 'Should I build a deck or a patio?', a: 'On sloped Hill Country lots, a deck usually creates usable flat space for less than the retaining walls a patio would need. On flat ground, a patio may be more economical. We are happy to price both options.' },
    { q: 'What decking material do you recommend?', a: 'It depends on budget and how much maintenance you want. Composite and PVC are nearly maintenance-free; cedar and hardwoods offer natural beauty; pressure-treated pine is the most affordable. We bring samples to your consultation.' },
  ];
}

// ---------- Services index ----------
add('/services/', {
  title: 'Deck & Outdoor Living Services in San Antonio & Hill Country',
  description: `Custom decks, composite decks, covered patios, pergolas, pavilions, outdoor kitchens, patios, fire pits, railings, repair and staining across the San Antonio Hill Country. Call ${site.phone}.`,
  body: `
${pageHero({ eyebrow: 'Our services', title: 'Decks &amp; outdoor living services', lead: 'From a new composite deck to a complete covered outdoor kitchen, we design and build every part of your backyard.', trail: [{ name: 'Home', path: '/' }, { name: 'Services', path: '/services/' }] })}
<section class="section">
  <div class="wrap"><div class="grid grid-3">${services.map((s) => serviceCard(s)).join('')}</div></div>
</section>
${ctaBand()}
${quoteSection({ page: 'Services' })}`,
  schema: [breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services/' }])],
});

// ---------- Service pages ----------
for (const s of services) {
  const path = serviceUrl(s);
  const trail = [{ name: 'Home', path: '/' }, { name: 'Services', path: '/services/' }, { name: s.name, path }];
  const faqs = [
    ...s.faqs,
    { q: `What areas do you serve for ${s.name.toLowerCase()}?`, a: `We provide ${s.name.toLowerCase()} throughout North San Antonio and the Texas Hill Country, including ${areas.map((a) => a.name).join(', ')}.` },
  ];
  const bestAreas = areas.filter((a) => a.popular.includes(s.slug));
  add(path, {
    title: s.title,
    description: `${s.summary} Serving Stone Oak, Boerne, Helotes, Fair Oaks Ranch and the Hill Country. Call ${site.phone} for a free quote.`,
    body: `
${pageHero({ eyebrow: 'Hill Country San Antonio', title: esc(s.title), lead: s.summary, trail })}
<section class="section">
  <div class="wrap split split-wide">
    <div class="prose">
      <h2>${esc(s.name)} built for Texas living</h2>
      ${s.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
      <h2>Options &amp; upgrades</h2>
      <ul class="checks checks-2">${s.options.map((o) => `<li>${icon('check')} ${esc(o)}</li>`).join('')}</ul>
    </div>
    <aside class="side-card">
      <span class="card-icon card-icon-lg">${icon(s.icon)}</span>
      <h2>Free ${esc(s.name)} Quote</h2>
      <p>Call today to schedule an on-site consultation.</p>
      <a class="btn btn-wood btn-block" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a>
      <a class="btn btn-navy btn-block" href="#quote">Request Online</a>
      <h3>Other services</h3>
      <ul class="side-links">${services
        .filter((o) => o.slug !== s.slug)
        .map((o) => `<li><a href="${serviceUrl(o)}">${esc(o.name)}</a></li>`)
        .join('')}</ul>
    </aside>
  </div>
</section>
<section class="section section-sand">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Why it matters</p><h2>Benefits of ${esc(s.name.toLowerCase())}</h2></div>
    <div class="grid grid-4">${s.benefits.map((b) => `<div class="card benefit"><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></div>`).join('')}</div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Service areas</p><h2>${esc(s.name)} across the Hill Country</h2>
    <p>We build ${esc(s.name.toLowerCase())} in neighborhoods throughout North San Antonio, Boerne and Comal County${bestAreas.length ? ` — it’s an especially popular project in ${bestAreas.slice(0, 4).map((a) => `<a href="${areaUrl(a)}">${esc(a.name)}</a>`).join(', ')}` : ''}.</p></div>
    ${areaChips(areas)}
  </div>
</section>
<section class="section section-sand">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Often paired with</p><h2>Related services</h2></div>
    <div class="grid grid-4">${s.related.map((r) => serviceCard(serviceBySlug[r])).join('')}</div>
  </div>
</section>
<section class="section">
  <div class="wrap narrow">
    <div class="section-head"><p class="eyebrow">FAQ</p><h2>${esc(s.name)} questions</h2></div>
    ${faqList(faqs)}
  </div>
</section>
${quoteSection({ page: s.name, service: s.slug, heading: `Get a free ${s.name.toLowerCase()} quote` })}`,
    schema: [
      breadcrumbSchema(trail),
      faqSchema(faqs),
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: s.name,
        serviceType: s.name,
        description: s.summary,
        url: abs(path),
        provider: { '@id': abs('/#business') },
        areaServed: areas.map((a) => ({ '@type': 'Place', name: `${a.name}, TX` })),
      },
    ],
  });
}

// ---------- Service areas index ----------
add('/service-areas/', {
  title: 'Service Areas | Deck Builder in Hill Country San Antonio',
  description: `${site.name} builds decks and outdoor living spaces in Stone Oak, The Dominion, Shavano Park, Helotes, Leon Springs, Fair Oaks Ranch, Boerne, Bulverde, Canyon Lake and more.`,
  body: `
${pageHero({ eyebrow: 'Where we work', title: 'Hill Country San Antonio service areas', lead: 'We design and build decks, patios and outdoor living spaces across North San Antonio, the I-10 corridor, Boerne and Comal County.', trail: [{ name: 'Home', path: '/' }, { name: 'Service Areas', path: '/service-areas/' }] })}
${regions
  .map(
    (r, i) => `
<section class="section${i % 2 ? ' section-sand' : ''}">
  <div class="wrap">
    <div class="section-head"><h2>${esc(r.name)}</h2></div>
    <div class="grid grid-3">${areas
      .filter((a) => a.region === r.key)
      .map(
        (a) => `<a class="card area-card" href="${areaUrl(a)}"><span class="card-icon">${icon('pin')}</span><h3>${esc(a.name)}</h3><p class="muted">${esc(a.location)} · ${a.zips.join(', ')}</p><p>${esc(a.intro[0].split('. ')[0])}.</p><span class="card-link">Decks in ${esc(a.name)} ${icon('arrow')}</span></a>`
      )
      .join('')}</div>
  </div>
</section>`
  )
  .join('')}
${ctaBand('Don’t see your neighborhood? We probably still build there.')}
${quoteSection({ page: 'Service Areas' })}`,
  schema: [breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Service Areas', path: '/service-areas/' }])],
});

// ---------- Area pages ----------
for (const a of areas) {
  const path = areaUrl(a);
  const trail = [{ name: 'Home', path: '/' }, { name: 'Service Areas', path: '/service-areas/' }, { name: a.name, path }];
  const popular = a.popular.map((slug) => serviceBySlug[slug]);
  const others = services.filter((s) => !a.popular.includes(s.slug));
  const faqs = [
    ...a.faqs,
    { q: `Do you offer free deck quotes in ${a.name}?`, a: `Yes. Call ${site.phone} or request a quote online and we’ll schedule a free on-site visit at your ${a.name} home.` },
    { q: `What outdoor living projects do you build in ${a.name}?`, a: `In ${a.name} we most often build ${popular.map((s) => s.name.toLowerCase()).join(', ')} — and we offer our full range of deck and outdoor living services.` },
  ];
  add(path, {
    title: `Deck Builder in ${a.name}, TX | Decks, Patios & Pergolas`,
    description: `Custom decks, covered patios, pergolas and outdoor kitchens in ${a.name}, TX (${a.zips.join(', ')}). ${site.name} builds for Hill Country lots. Call ${site.phone} for a free quote.`,
    body: `
${pageHero({ eyebrow: `${a.name}, Texas · ${a.zips.join(' · ')}`, title: `Deck Builder &amp; Outdoor Living in <span>${esc(a.name)}</span>`, lead: `Custom decks, patios, pergolas and outdoor spaces for ${a.name} homes — ${a.location.charAt(0).toLowerCase() + a.location.slice(1)}.`, trail })}
<section class="section">
  <div class="wrap split split-wide">
    <div class="prose">
      <h2>Outdoor living built for ${esc(a.name)}</h2>
      ${a.intro.map((p) => `<p>${esc(p)}</p>`).join('')}
      <h2>Building in ${esc(a.name)}: what we plan for</h2>
      <div class="notes">${a.lotNotes.map((n) => `<div class="note"><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div>`).join('')}</div>
    </div>
    <aside class="side-card">
      <span class="card-icon card-icon-lg">${icon('pin')}</span>
      <h2>Free Quote in ${esc(a.name)}</h2>
      <p>We’ll come to your ${esc(a.name)} home, measure and talk through ideas — no charge.</p>
      <a class="btn btn-wood btn-block" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a>
      <a class="btn btn-navy btn-block" href="#quote">Request Online</a>
      <h3>Nearby areas</h3>
      <ul class="side-links">${a.nearby.map((n) => `<li><a href="${areaUrl(areaBySlug[n])}">${esc(areaBySlug[n].name)}</a></li>`).join('')}</ul>
    </aside>
  </div>
</section>
<section class="section section-sand">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">Popular in ${esc(a.name)}</p><h2>Top outdoor living projects in ${esc(a.name)}</h2></div>
    <div class="grid grid-3">${popular.map((s) => serviceCard(s, a)).join('')}</div>
    <h3 class="sub-head">More services available in ${esc(a.name)}</h3>
    <ul class="chips">${others.map((s) => `<li><a href="${serviceUrl(s)}">${icon(s.icon)}${esc(s.name)}</a></li>`).join('')}</ul>
  </div>
</section>
<section class="section">
  <div class="wrap narrow">
    <div class="section-head"><p class="eyebrow">FAQ</p><h2>${esc(a.name)} deck &amp; patio questions</h2></div>
    ${faqList(faqs)}
  </div>
</section>
<section class="section section-navy">
  <div class="wrap">
    <div class="section-head"><h2>Also serving areas near ${esc(a.name)}</h2></div>
    ${areaChips(a.nearby.map((n) => areaBySlug[n]))}
    <p class="center"><a class="btn btn-ghost" href="/service-areas/">All Service Areas</a></p>
  </div>
</section>
${quoteSection({ page: a.name, area: a.slug, heading: `Get a free quote in ${a.name}` })}`,
    schema: [
      breadcrumbSchema(trail),
      faqSchema(faqs),
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `Deck Building & Outdoor Living in ${a.name}, TX`,
        serviceType: 'Deck Builder',
        url: abs(path),
        provider: { '@id': abs('/#business') },
        areaServed: { '@type': 'Place', name: `${a.name}, TX`, address: { '@type': 'PostalAddress', postalCode: a.zips[0], addressRegion: 'TX', addressCountry: 'US' } },
      },
    ],
  });
}

// ---------- About ----------
add('/about/', {
  title: 'About Us',
  description: `${site.name} designs and builds decks, patios and outdoor living spaces for homes across the San Antonio Hill Country. Call ${site.phone}.`,
  body: `
${pageHero({ eyebrow: 'About us', title: 'Transforming backyards into spaces built for <span>Texas living</span>', lead: 'We’re a Hill Country deck and outdoor living builder focused on doing the job right — from the footings up.', trail: [{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }] })}
<section class="section">
  <div class="wrap split">
    <div class="prose">
      <h2>Our approach</h2>
      <p>${esc(site.name)} exists for one reason: to help Hill Country families get more out of the land they live on. Our backyards are rocky, sloped, shaded by century-old oaks and baked by summer sun — and the outdoor spaces we build are designed for exactly those conditions.</p>
      <p>Every project starts with a visit to your property. We listen to how you want to use the space, look closely at the grade, drainage, trees and views, and recommend materials that fit your budget and how much upkeep you want. Then we put it all in a clear, written quote.</p>
      <p>Once the work starts, you get a crew that shows up, communicates and leaves the site clean every day — and a finished project we’re proud to put our name on.</p>
    </div>
    <ul class="feature-list">
      <li><span class="card-icon">${icon('check')}</span><div><h3>Honest recommendations</h3><p>If repair makes more sense than replacement, we’ll tell you.</p></div></li>
      <li><span class="card-icon">${icon('deck')}</span><div><h3>Craftsmanship</h3><p>Proper footings, flashing, fasteners and framing — the parts you don’t see matter most.</p></div></li>
      <li><span class="card-icon">${icon('phone')}</span><div><h3>Easy to reach</h3><p>Questions? Call ${site.phone} and talk to a real person.</p></div></li>
      <li><span class="card-icon">${icon('star')}</span><div><h3>Texas through and through</h3><p>Designs that fit Hill Country homes and the way Texans live outside.</p></div></li>
    </ul>
  </div>
</section>
<section class="section section-sand">
  <div class="wrap">
    <div class="section-head"><p class="eyebrow">What we build</p><h2>Our services</h2></div>
    <div class="grid grid-3">${services.slice(0, 6).map((s) => serviceCard(s)).join('')}</div>
    <p class="center"><a class="btn btn-navy" href="/services/">View All Services</a></p>
  </div>
</section>
${quoteSection({ page: 'About' })}`,
  schema: [breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'About', path: '/about/' }])],
});

// ---------- Contact ----------
add('/contact/', {
  title: 'Contact Us for a Free Quote',
  description: `Call ${site.phone} or email ${site.email} for a free deck or outdoor living quote anywhere in Hill Country San Antonio.`,
  body: `
${pageHero({ eyebrow: 'Contact', title: 'Call for a <span>free quote</span>', lead: `Call ${site.phone}, email ${site.email} or send the form below — we’ll get back to you quickly.`, trail: [{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact/' }] })}
<section class="section">
  <div class="wrap contact-cards">
    <a class="card contact-card" href="${site.phoneHref}"><span class="card-icon">${icon('phone')}</span><h2>Call</h2><p>${site.phone}</p></a>
    <a class="card contact-card" href="mailto:${site.email}"><span class="card-icon">${icon('mail')}</span><h2>Email</h2><p>${site.email}</p></a>
    <a class="card contact-card" href="/service-areas/"><span class="card-icon">${icon('pin')}</span><h2>Service Area</h2><p>${esc(site.region)}</p></a>
  </div>
</section>
${quoteSection({ page: 'Contact', heading: 'Tell us about your project' })}`,
  schema: [breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Contact', path: '/contact/' }])],
});

// ---------- Thank you & 404 ----------
add('/thank-you/', {
  title: 'Thank You',
  description: 'Thanks for contacting Lone Star Decks & Outdoor Living.',
  body: `
${pageHero({ eyebrow: 'Message received', title: 'Thanks — we’ll be in touch soon!', lead: `We received your request and will reach out shortly. Need us sooner? Call ${site.phone}.`, actions: false })}
<section class="section"><div class="wrap center"><a class="btn btn-wood" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a> <a class="btn btn-navy" href="/">Back to Home</a></div></section>`,
});
pages.push({
  path: '/404.html',
  html: layout({
    path: '/404.html',
    title: 'Page Not Found',
    description: 'The page you were looking for could not be found.',
    body: `
${pageHero({ eyebrow: '404', title: 'This trail doesn’t go anywhere', lead: 'The page you’re looking for has moved or doesn’t exist.', actions: false })}
<section class="section"><div class="wrap center"><a class="btn btn-wood" href="/">Back to Home</a> <a class="btn btn-navy" href="/services/">Our Services</a></div></section>`,
  }),
});

// ---------- Write output ----------
await rm(out, { recursive: true, force: true });
for (const p of pages) {
  const file = p.path.endsWith('.html') ? join(out, p.path) : join(out, p.path, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, p.html);
}
await cp(join(root, 'src/assets'), join(out, 'assets'), { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const sitemapUrls = pages.filter((p) => !['/404.html', '/thank-you/'].includes(p.path));
await writeFile(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
    .map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`
);
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /thank-you/\n\nSitemap: ${abs('/sitemap.xml')}\n`);

console.log(`Built ${pages.length} pages → dist/`);

// Vercel serverless function: emails every website quote request via Resend.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY     required  Resend API key (re_...)
//   LEAD_TO_EMAIL      optional  Where leads go. Comma-separate for several. Default: scott@lonestardeckstx.com
//   RESEND_FROM_EMAIL  optional  Sender on your verified Resend domain.
//                                Default: Lone Star Decks Website <leads@lonestardeckstx.com>

const DEFAULT_TO = 'scott@lonestardeckstx.com';
const DEFAULT_FROM = 'Lone Star Decks Website <leads@lonestardeckstx.com>';

// Field name → label, in the order they appear in the email.
const FIELDS = [
  ['name', 'Name'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['neighborhood', 'Neighborhood'],
  ['service', 'Project type'],
  ['message', 'Project details'],
  ['page', 'Submitted from'],
];
const MAX_LEN = { message: 5000 };

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isEmail = (s) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

function parseBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'object') return body;
  // Fallback if the runtime hands us a raw string.
  try {
    return JSON.parse(body);
  } catch {
    return Object.fromEntries(new URLSearchParams(body));
  }
}

function clean(raw) {
  const data = {};
  for (const [key] of FIELDS) {
    const value = typeof raw[key] === 'string' ? raw[key].trim() : '';
    data[key] = value.slice(0, MAX_LEN[key] || 200);
  }
  return data;
}

function buildEmail(data) {
  const rows = FIELDS.filter(([key]) => data[key])
    .map(
      ([key, label]) => `<tr>
        <td style="padding:8px 12px;background:#f2ebe0;font-weight:700;color:#10294a;vertical-align:top;white-space:nowrap">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${esc(data[key])}</td>
      </tr>`
    )
    .join('');
  const telDigits = data.phone.replace(/[^\d+]/g, '');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1c2633;max-width:600px">
    <h2 style="color:#10294a;margin:0 0 4px">New quote request</h2>
    <p style="margin:0 0 16px;color:#5b6676">From the Lone Star Decks website</p>
    <table style="border-collapse:collapse;width:100%">${rows}</table>
    <p style="margin-top:20px">
      <a href="tel:${esc(telDigits)}" style="background:#a4521f;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700">Call ${esc(data.name)}</a>
    </p>
    ${data.email ? '<p style="color:#5b6676;font-size:13px">Hit reply to respond directly to this lead.</p>' : ''}
  </div>`;
  const text = FIELDS.filter(([key]) => data[key])
    .map(([key, label]) => `${label}: ${data[key]}`)
    .join('\n');
  return { html, text };
}

function respond(req, res, status, payload) {
  const wantsJson = (req.headers.accept || '').includes('application/json');
  if (wantsJson) return res.status(status).json(payload);
  // Plain HTML form post (JavaScript disabled): send the visitor to a page.
  res.setHeader('Location', payload.ok ? '/thank-you/' : '/contact/?error=1');
  return res.status(303).end();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const raw = parseBody(req);
  // Honeypot: real people never fill in the hidden "company" field.
  if (raw.company) return respond(req, res, 200, { ok: true });

  const data = clean(raw);
  if (!data.name || !data.phone) {
    return respond(req, res, 400, { ok: false, error: 'Please include your name and phone number.' });
  }
  if (data.email && !isEmail(data.email)) {
    return respond(req, res, 400, { ok: false, error: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return respond(req, res, 500, { ok: false, error: 'Email is not configured.' });
  }

  const to = (process.env.LEAD_TO_EMAIL || DEFAULT_TO).split(',').map((s) => s.trim()).filter(Boolean);
  const { html, text } = buildEmail(data);
  const subjectBits = [data.service, data.neighborhood].filter(Boolean).join(' · ');

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
      to,
      subject: `New quote request: ${data.name}${subjectBits ? ` — ${subjectBits}` : ''}`,
      html,
      text,
      ...(data.email ? { reply_to: data.email } : {}),
    }),
  }).catch((err) => ({ ok: false, status: 0, text: async () => String(err) }));

  if (!resendRes.ok) {
    console.error('Resend error', resendRes.status, await resendRes.text());
    return respond(req, res, 502, { ok: false, error: 'We couldn’t send your request.' });
  }
  return respond(req, res, 200, { ok: true });
}

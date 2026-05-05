// Vercel Serverless Function: POST /api/send-email-riuc
// Sends a professionally letter-headed HTML email branded for
// Rosebank International University College (RIUC, Ghana)
// using nodemailer + the SAME SMTP credentials as /api/send-email.
//
// Required env vars (same as send-email.js):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
//   ADMIN_AUTH_TOKEN  shared secret the admin UI sends in x-admin-token
// Optional:
//   MAIL_FROM_RIUC    "Rosebank International University College <info@riuc.edu.gh>"
//                     Falls back to MAIL_FROM, then to SMTP_USER.
//   RIUC_LOGO_URL     Override URL the function fetches the RIUC logo from.
//   RIUC_BANNER_URL   Override URL for the top banner image.

import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
};

// ---------- Brand & contact details (from https://www.riuc.edu.gh) ----------
const BRAND = {
  navy:   '#1B3A77',  // primary RIUC navy
  navyDk: '#0F2350',  // header band
  gold:   '#C9A646',  // accent
  goldDk: '#A88732',
  grey:   '#5A5A5A',
  light:  '#F4F6FB',
  border: '#D4DAE6',
  white:  '#FFFFFF',
  dark:   '#1A1A1A',
};

const CONTACT = {
  name:    'Rosebank International University College',
  short:   'RIUC',
  tagline: 'Fast Track Your Global Career',
  phone:   '086 1259 906',
  whatsapp:'087 260 6854',
  email:   'info@riuc.edu.gh',
  web:     'www.riuc.edu.gh',
  address: '239 Pretorius St, Pretoria Central, Pretoria, 0126',
};

// ---------- Logo / banner (fetched once, embedded as CID) ----------
let LOGO_BUFFER = null;       // header strip logo (white wordmark)
let GOLD_LOGO_BUFFER = null;  // gold shield logo for top banner
let STUDENTS_BUFFER = null;   // students cutout image for top banner
const LOGO_CID       = 'riuc-logo@riuc';
const GOLD_LOGO_CID  = 'riuc-gold-logo@riuc';
const STUDENTS_CID   = 'riuc-students@riuc';
const LOGO_URL       = `cid:${LOGO_CID}`;
const GOLD_LOGO_URL  = `cid:${GOLD_LOGO_CID}`;
const STUDENTS_URL   = `cid:${STUDENTS_CID}`;

async function fetchFirst(urls) {
  for (const url of urls.filter(Boolean)) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch { /* try next */ }
  }
  return null;
}

async function loadLogo(req) {
  if (LOGO_BUFFER) return LOGO_BUFFER;
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host  = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  LOGO_BUFFER = await fetchFirst([
    process.env.RIUC_LOGO_URL,
    host ? `${proto}://${host}/riuc-logo-white.png` : null,
    host ? `${proto}://${host}/riuc-logo.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/riuc-logo-white.png` : null,
  ]);
  return LOGO_BUFFER;
}

async function loadGoldLogo(req) {
  if (GOLD_LOGO_BUFFER) return GOLD_LOGO_BUFFER;
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host  = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  GOLD_LOGO_BUFFER = await fetchFirst([
    process.env.RIUC_GOLD_LOGO_URL,
    host ? `${proto}://${host}/riuc-logo.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/riuc-logo.png` : null,
  ]);
  return GOLD_LOGO_BUFFER;
}

async function loadStudents(req) {
  if (STUDENTS_BUFFER) return STUDENTS_BUFFER;
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host  = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  STUDENTS_BUFFER = await fetchFirst([
    process.env.RIUC_STUDENTS_URL,
    host ? `${proto}://${host}/riuc-students.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/riuc-students.png` : null,
  ]);
  return STUDENTS_BUFFER;
}

let LETTERHEAD_LOGO_BUFFER = null;
async function loadLetterheadLogo(req) {
  if (LETTERHEAD_LOGO_BUFFER) return LETTERHEAD_LOGO_BUFFER;
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host  = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  LETTERHEAD_LOGO_BUFFER = await fetchFirst([
    process.env.RIUC_LETTERHEAD_LOGO_URL,
    host ? `${proto}://${host}/riuc-letterhead-logo.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/riuc-letterhead-logo.png` : null,
  ]);
  return LETTERHEAD_LOGO_BUFFER;
}

// ---------- Helpers ----------
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bodyToHtml(text) {
  const raw = String(text == null ? '' : text);
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    let html = raw
      .replace(/<\/?(script|iframe|object|embed|style|link|meta)[^>]*>/gi, '')
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
      .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');

    html = html.replace(/<a\b([^>]*)>/gi, (m, attrs) => {
      if (/\bdata-cta\b/i.test(attrs || '')) return m;
      let a = attrs || '';
      let existingStyle = '';
      a = a.replace(/\sstyle\s*=\s*"([^"]*)"/i, (mm, s) => { existingStyle = s; return ''; });
      a = a.replace(/\sstyle\s*=\s*'([^']*)'/i, (mm, s) => { existingStyle = s; return ''; });
      a = a.replace(/\starget\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      a = a.replace(/\srel\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      const baseStyle = `color:${BRAND.navy};text-decoration:underline;font-weight:600;`;
      const finalStyle = existingStyle
        ? `${baseStyle}${existingStyle.replace(/;?\s*$/, ';')}`
        : baseStyle;
      return `<a${a} target="_blank" rel="noopener noreferrer" style="${finalStyle}">`;
    });

    const parts = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/i);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) continue;
      parts[i] = parts[i].replace(
        /(^|[^"'>=])(https?:\/\/[^\s<"']+)/g,
        (m, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.navy};text-decoration:underline;font-weight:600;">${u}</a>`
      );
    }
    html = parts.join('');

    // Strip stray background colors from inline styles (gray highlights left by
    // paste / contenteditable). CTA buttons keep their colour because they're
    // marked with data-cta and are skipped here.
    html = html.replace(/<([a-z][a-z0-9]*)\b([^>]*?)>/gi, (m, tag, attrs) => {
      if (/\bdata-cta\b/i.test(attrs)) return m;
      const t = tag.toLowerCase();
      if (t === 'a' || t === 'img') return m;
      const newAttrs = attrs.replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/i, (sm, sv) => {
        const quote = sv[0];
        let css = sv.slice(1, -1);
        css = css
          .replace(/(^|;)\s*background(-color|-image)?\s*:[^;]*/gi, '$1')
          .replace(/^\s*;+/, '')
          .replace(/;\s*;+/g, ';')
          .trim();
        return css ? ` style=${quote}${css}${quote}` : '';
      });
      return `<${tag}${newAttrs}>`;
    });

    // Force solid-disc bullets (some clients render <ul> as open rings/circles)
    html = html
      .replace(/<ul\b([^>]*)>/gi, (m, attrs) => {
        const a = (attrs || '').replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/i, '');
        return `<ul${a} style="list-style-type:disc;padding-left:24px;margin:0 0 14px 0;">`;
      })
      .replace(/<ol\b([^>]*)>/gi, (m, attrs) => {
        const a = (attrs || '').replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/i, '');
        return `<ol${a} style="list-style-type:decimal;padding-left:24px;margin:0 0 14px 0;">`;
      })
      .replace(/<li\b([^>]*)>/gi, (m, attrs) => {
        const a = (attrs || '').replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/i, '');
        return `<li${a} style="margin:4px 0;line-height:1.6;color:#1A1A1A;">`;
      });

    return `<div style="line-height:1.65;color:#1A1A1A;font-size:15px;">${html}</div>`;
  }
  const escaped = escapeHtml(raw);
  const linked = escaped.replace(/\b(https?:\/\/[^\s<]+)/g,
    (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.navy};text-decoration:underline;font-weight:600;">${u}</a>`);
  return linked
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px 0;line-height:1.65;color:#1A1A1A;font-size:15px;">${p.replace(/\n/g,'<br/>')}</p>`)
    .join('');
}

function buildEmailHtml({ subject, body, recipientName }) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const ref = `RIUC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const greeting = recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Dear Student,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(subject)}</title>
<style>
  /* Stop Outlook / iOS dark-mode from inverting white panels and the logo. */
  :root { color-scheme: light; supported-color-schemes: light; }
  [data-ogsc] .light-bg, [data-ogsb] .light-bg { background:#FFFFFF !important; }
  u + .body .light-bg { background:#FFFFFF !important; }
</style>
</head>
<body style="margin:0;padding:0;background:#EAEEF6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAEEF6;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="660" cellpadding="0" cellspacing="0"
               style="width:660px;max-width:96%;background:${BRAND.white};border:1px solid ${BRAND.border};
                      box-shadow:0 8px 32px rgba(15,35,80,0.12);">

          <!-- TOP BANNER (composite: gold logo on left, students on right, white bg) -->
          <tr>
            <td bgcolor="#FFFFFF" style="padding:0;background:${BRAND.white} !important;background-color:${BRAND.white};line-height:0;font-size:0;border-bottom:4px solid ${BRAND.gold};">
              <table role="presentation" width="660" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:660px;max-width:660px;background:${BRAND.white} !important;background-color:${BRAND.white};">
                <tr>
                  <td width="230" align="center" valign="middle" bgcolor="#FFFFFF" style="width:230px;padding:12px 14px;background:${BRAND.white} !important;background-color:${BRAND.white};">
                    <img src="${GOLD_LOGO_URL}" alt="RIUC" width="200" bgcolor="#FFFFFF"
                         style="display:block;width:200px;max-width:100%;height:auto;border:0;margin:0 auto;background:${BRAND.white} !important;background-color:${BRAND.white};" />
                  </td>
                  <td width="430" align="right" valign="middle" bgcolor="#FFFFFF" style="width:430px;background:${BRAND.white} !important;background-color:${BRAND.white};padding:0;">
                    <img src="${STUDENTS_URL}" alt="RIUC Students" width="430" height="110" bgcolor="#FFFFFF"
                         style="display:block;width:430px;height:110px;max-width:430px;object-fit:cover;border:0;background:${BRAND.white} !important;background-color:${BRAND.white};" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- UNIFIED GOLD BAR: date + contact -->
          <tr>
            <td style="background:${BRAND.gold};padding:10px 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="color:${BRAND.navyDk};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                    ${today}
                  </td>
                  <td valign="middle" align="right" style="color:${BRAND.navyDk};font-size:11px;font-weight:700;">
                    Tel: ${CONTACT.phone} &nbsp;&middot;&nbsp; ${CONTACT.email} &nbsp;&middot;&nbsp; ${CONTACT.web}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SUBJECT -->
          <tr>
            <td style="padding:28px 36px 8px 36px;">
              <div style="font-size:11px;letter-spacing:0.16em;color:${BRAND.grey};text-transform:uppercase;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
                Subject
              </div>
              <div style="font-size:21px;font-weight:700;color:${BRAND.navyDk};margin-top:6px;line-height:1.3;">
                ${escapeHtml(subject)}
              </div>
              <div style="height:2px;width:56px;background:${BRAND.gold};margin-top:14px;"></div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:18px 36px 8px 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.navyDk};font-weight:700;">
                ${greeting}
              </p>
              ${bodyToHtml(body)}
            </td>
          </tr>

          <!-- SIGN-OFF -->
          <tr>
            <td style="padding:8px 36px 28px 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 6px 0;font-size:15px;color:#1A1A1A;line-height:1.6;">
                Yours sincerely,
              </p>
              <p style="margin:0;font-size:15px;color:${BRAND.navyDk};font-weight:700;">
                RIUC Bursary &amp; Finance Office
              </p>
              <p style="margin:2px 0 0 0;font-size:12px;color:${BRAND.grey};font-style:italic;">
                ${CONTACT.tagline}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:${BRAND.border};"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:18px 36px 24px 36px;background:${BRAND.light};font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:${BRAND.grey};line-height:1.6;">
                    <strong style="color:${BRAND.navyDk};">${CONTACT.name}</strong><br/>
                    ${CONTACT.address}<br/>
                    Tel: ${CONTACT.phone} &middot; Whatsapp: ${CONTACT.whatsapp}<br/>
                    Email:
                    <a href="mailto:${CONTACT.email}" style="color:${BRAND.navy};text-decoration:none;font-weight:600;">${CONTACT.email}</a>
                    &middot; Web:
                    <a href="https://${CONTACT.web}" style="color:${BRAND.navy};text-decoration:none;font-weight:600;">${CONTACT.web}</a>
                  </td>
                  <td align="right" valign="bottom" style="font-size:10px;color:${BRAND.grey};">
                    Ref ${ref}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTTOM BRAND BAND (moved from top) -->
          <tr>
            <td style="background:${BRAND.navy};border-top:4px solid ${BRAND.gold};padding:22px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td valign="middle" style="padding-right:16px;">
                        <img src="${LOGO_URL}" width="56" height="56" alt="RIUC"
                             style="display:block;background:transparent;" />
                      </td>
                      <td valign="middle">
                        <div style="color:${BRAND.white};font-size:18px;font-weight:700;letter-spacing:0.04em;font-family:Arial,Helvetica,sans-serif;">
                          ROSEBANK INTERNATIONAL
                        </div>
                        <div style="color:${BRAND.gold};font-size:13px;margin-top:2px;letter-spacing:0.06em;font-family:Arial,Helvetica,sans-serif;">
                          UNIVERSITY COLLEGE &middot; PRETORIA, SOUTH AFRICA
                        </div>
                      </td>
                    </tr></table>
                  </td>
                  <td valign="middle" align="right">
                    <div style="color:${BRAND.gold};font-size:11px;font-weight:700;letter-spacing:0.12em;font-family:Arial,Helvetica,sans-serif;">
                      OFFICE OF THE REGISTRAR
                    </div>
                    <div style="color:#CFD7E8;font-size:10.5px;margin-top:4px;font-family:Arial,Helvetica,sans-serif;">
                      ${CONTACT.tagline}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="height:6px;background:${BRAND.gold};line-height:6px;font-size:0;">&nbsp;</td>
          </tr>
        </table>

        <div style="font-size:10.5px;color:#6E7891;margin-top:14px;max-width:600px;text-align:center;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
          This message was sent by Rosebank International University College.
          If you received it in error, please reply to inform us and delete the message.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainText({ subject, body, recipientName }) {
  const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Student,';
  const plainBody = /<[a-z][\s\S]*>/i.test(body)
    ? String(body)
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|blockquote)\s*>/gi, '\n')
        .replace(/<li[^>]*>/gi, ' \u2022 ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : body;
  return [
    'ROSEBANK INTERNATIONAL UNIVERSITY COLLEGE',
    CONTACT.tagline,
    '------------------------------------------------',
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    plainBody,
    '',
    'Yours sincerely,',
    'RIUC Bursary & Finance Office',
    '',
    '------------------------------------------------',
    CONTACT.name,
    CONTACT.address,
    `Tel:      ${CONTACT.phone}`,
    `Whatsapp: ${CONTACT.whatsapp}`,
    `Email:    ${CONTACT.email}`,
    `Web:      ${CONTACT.web}`,
  ].join('\n');
}

// ---------- PDF version of the email (attached to outgoing message) ----------
function decodeHtmlEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

// Extract CTA buttons (<a data-cta ...>) and other anchors from the body so we
// can render them as real clickable elements inside the PDF. Returns the body
// rewritten with placeholder tokens [[CTA:n]] / [[LINK:n|text]] that survive
// htmlToPlain() and can be detected during layout.
function extractInteractiveTokens(body) {
  const ctas = [];   // [{ url, text, color }]
  const links = [];  // [{ url, text }]
  const raw = String(body == null ? '' : body);
  if (!/<a\b/i.test(raw)) {
    return { html: raw, ctas, links };
  }
  // Replace each <a> with a placeholder; keep CTAs and ordinary links separate.
  const html = raw.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
    const hrefMatch = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || '');
    const href = decodeHtmlEntities(hrefMatch ? (hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || '') : '');
    const text = decodeHtmlEntities(String(inner || '').replace(/<[^>]+>/g, '').trim());
    if (!href || !text) return text || '';
    const isCta = /\bdata-cta\b/i.test(attrs || '');
    if (isCta) {
      // Pull the button background colour straight out of the anchor's inline
      // style so the PDF matches whatever the editor emitted.
      const styleMatch = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs || '');
      const styleStr = styleMatch ? (styleMatch[2] || styleMatch[3] || '') : '';
      const bgMatch = /background(?:-color)?\s*:\s*([^;"']+)/i.exec(styleStr);
      const color = bgMatch ? bgMatch[1].trim() : BRAND.navy;
      const idx = ctas.length;
      ctas.push({ url: href, text, color });
      return `\n\n[[CTA:${idx}]]\n\n`;
    }
    const idx = links.length;
    links.push({ url: href, text });
    return `[[LINK:${idx}]]`;
  });
  return { html, ctas, links };
}

// Convert a CSS colour (#hex or rgb()/named) into [r,g,b]. Falls back to navy.
function cssColorToRgb(value) {
  const v = String(value || '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return hexToRgb(v);
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return hexToRgb(BRAND.navy);
}

function htmlToPlain(input) {
  const raw = String(input == null ? '' : input);
  if (!/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return raw
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, ' \u2022 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function buildEmailPdfBuffer({ subject, body, recipientName, logo }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const contentW = pageW - marginX * 2;

  const navy   = hexToRgb(BRAND.navyDk);
  const navy2  = hexToRgb(BRAND.navy);
  const gold   = hexToRgb(BRAND.gold);
  const grey   = hexToRgb(BRAND.grey);
  const dark   = hexToRgb(BRAND.dark);

  // ---- Header band ----
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageW, 96, 'F');
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(0, 96, pageW, 4, 'F');

  // Logo on the left of the header (if available)
  if (logo) {
    try {
      const dataUrl = `data:image/png;base64,${logo.toString('base64')}`;
      doc.addImage(dataUrl, 'PNG', marginX, 22, 56, 56);
    } catch { /* ignore image errors */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ROSEBANK INTERNATIONAL UNIVERSITY COLLEGE', marginX + (logo ? 72 : 0), 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text(CONTACT.tagline, marginX + (logo ? 72 : 0), 68);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Tel ${CONTACT.phone}  |  ${CONTACT.email}  |  ${CONTACT.web}`, marginX + (logo ? 72 : 0), 84);

  // ---- Date + reference strip ----
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(today, marginX, 130);
  doc.text(CONTACT.address, pageW - marginX, 130, { align: 'right' });

  // ---- Subject ----
  let cursorY = 168;
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT', marginX, cursorY);
  cursorY += 22; // breathing room between label and subject line
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(16);
  const subjLines = doc.splitTextToSize(String(subject || ''), contentW);
  doc.text(subjLines, marginX, cursorY);
  cursorY += subjLines.length * 19 + 10;
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(2);
  doc.line(marginX, cursorY, marginX + 56, cursorY);
  cursorY += 26;

  // ---- Greeting ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(recipientName ? `Dear ${recipientName},` : 'Dear Student,', marginX, cursorY);
  cursorY += 22;

  // ---- Body ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  // Pull CTAs and inline links out before flattening to plain text so we can
  // render them as real clickable elements in the PDF.
  const { html: bodyWithTokens, ctas, links } = extractInteractiveTokens(body);
  const plain = htmlToPlain(bodyWithTokens);
  const paragraphs = plain.split(/\n{2,}/);
  const lineHeight = 15;
  const bottomMargin = 140;

  function ensureSpace(lines) {
    if (cursorY + lines * lineHeight > pageH - bottomMargin) {
      doc.addPage();
      cursorY = 72;
    }
  }

  function drawCtaButton(cta) {
    // Mirror the email's <a data-cta> styling exactly:
    // background: cta.color, color #FFFFFF, Arial 14px bold, letter-spacing 0.04em,
    // padding 12px 26px, border-radius 6px, centred with 18px vertical margin.
    const padX = 26;
    const padY = 12;
    const radius = 6;
    const fontSize = 14;
    const tracking = 0.04 * fontSize; // letter-spacing 0.04em
    const verticalMargin = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    const label = String(cta.text || '');
    // Account for letter-spacing when measuring label width.
    const labelW = doc.getTextWidth(label) + tracking * Math.max(0, label.length - 1);
    const btnW = labelW + padX * 2;
    const btnH = fontSize + padY * 2; // ~38pt for default text

    ensureSpace(Math.ceil((btnH + verticalMargin * 2) / lineHeight));
    cursorY += verticalMargin;

    // Centred horizontally inside the content column (matches text-align:center).
    const btnX = marginX + (contentW - btnW) / 2;
    const [br, bg, bb] = cssColorToRgb(cta.color);
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(btnX, cursorY, btnW, btnH, radius, radius, 'F');

    doc.setTextColor(255, 255, 255);
    // Draw label centred. jsPDF doesn't support letter-spacing natively, so
    // when tracking is requested we draw character-by-character to honour it.
    if (tracking > 0 && label.length > 1) {
      let x = btnX + padX;
      const baselineY = cursorY + padY + fontSize - 3; // optical baseline
      for (const ch of label) {
        doc.text(ch, x, baselineY);
        x += doc.getTextWidth(ch) + tracking;
      }
    } else {
      doc.text(label, btnX + btnW / 2, cursorY + padY + fontSize - 3, { align: 'center' });
    }
    // Make the button clickable.
    doc.link(btnX, cursorY, btnW, btnH, { url: cta.url });

    cursorY += btnH + verticalMargin;
    // restore body styling
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(dark[0], dark[1], dark[2]);
  }

  // Renders a single line that may contain [[LINK:n]] tokens, drawing each
  // segment in sequence and wiring up doc.link() rectangles for the URLs.
  function drawLineWithLinks(line) {
    if (!line) { cursorY += lineHeight; return; }
    const segments = line.split(/(\[\[LINK:\d+\]\])/g).filter(Boolean);
    let xCursor = marginX;
    const baselineY = cursorY + 11;
    for (const seg of segments) {
      const linkMatch = /^\[\[LINK:(\d+)\]\]$/.exec(seg);
      if (linkMatch) {
        const link = links[Number(linkMatch[1])];
        if (link) {
          const txt = link.text;
          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.setFont('helvetica', 'bold');
          const w = doc.getTextWidth(txt);
          doc.text(txt, xCursor, baselineY);
          // underline
          doc.setDrawColor(navy[0], navy[1], navy[2]);
          doc.setLineWidth(0.6);
          doc.line(xCursor, baselineY + 2, xCursor + w, baselineY + 2);
          doc.link(xCursor, cursorY, w, lineHeight, { url: link.url });
          xCursor += w;
          // restore
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(dark[0], dark[1], dark[2]);
        }
      } else {
        doc.text(seg, xCursor, baselineY);
        xCursor += doc.getTextWidth(seg);
      }
    }
    cursorY += lineHeight;
  }

  for (const para of paragraphs) {
    const ctaMatch = /^\[\[CTA:(\d+)\]\]$/.exec(para.trim());
    if (ctaMatch) {
      const cta = ctas[Number(ctaMatch[1])];
      if (cta) drawCtaButton(cta);
      continue;
    }
    const pieces = para.split(/\n/);
    for (const piece of pieces) {
      // For wrapping, treat the whole [[LINK:n]] token as one word — strip
      // tokens for measurement, then re-inject when drawing each line.
      const withSpacing = piece.replace(/\[\[LINK:(\d+)\]\]/g, (m, idx) => {
        const link = links[Number(idx)];
        // pad with sentinel that has roughly the same width as the visible text
        return link ? `\u0001${idx}\u0002${link.text}\u0003` : '';
      });
      const wrapped = doc.splitTextToSize(withSpacing, contentW);
      ensureSpace(wrapped.length);
      for (const wline of wrapped) {
        // Re-expand sentinel markers back to [[LINK:n]] tokens for rendering.
        const expanded = wline.replace(/\u0001(\d+)\u0002[^\u0003]*\u0003/g, '[[LINK:$1]]');
        drawLineWithLinks(expanded);
      }
    }
    cursorY += 8; // paragraph gap
  }

  // ---- Sign off ----
  cursorY += 10;
  ensureSpace(4);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Yours sincerely,', marginX, cursorY);
  cursorY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('RIUC Bursary & Finance Office', marginX, cursorY);

  // ---- Footer on every page ----
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = pageH - 70;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(marginX, fy, pageW - marginX, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(CONTACT.name, marginX, fy + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.setFontSize(8);
    doc.text(CONTACT.address, marginX, fy + 30);
    doc.text(
      `Tel: ${CONTACT.phone}  |  Whatsapp: ${CONTACT.whatsapp}  |  ${CONTACT.email}  |  ${CONTACT.web}`,
      marginX, fy + 42,
    );
    doc.setFontSize(8);
    doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginX, fy + 42, { align: 'right' });
    // bottom navy strip
    doc.setFillColor(navy2[0], navy2[1], navy2[2]);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(0, pageH - 18, pageW, 4, 'F');
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function safePdfFilename(subject) {
  const base = String(subject || 'RIUC-Communication')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'RIUC-Communication';
  return `${base}.pdf`;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const expected = process.env.ADMIN_AUTH_TOKEN;
  const provided = req.headers['x-admin-token'];
  if (!expected || provided !== expected) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }

  const to            = String(payload.to || '').trim();
  const subject       = String(payload.subject || '').trim();
  const body          = String(payload.body || '').trim();
  const recipientName = payload.recipientName ? String(payload.recipientName).trim() : '';
  const cc            = payload.cc ? String(payload.cc).trim() : '';
  const bcc           = payload.bcc ? String(payload.bcc).trim() : '';
  const replyTo       = payload.replyTo ? String(payload.replyTo).trim() : '';
  const important     = payload.important === undefined ? true : Boolean(payload.important);
  const userAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];

  if (!to || !subject || !body) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Missing required fields: to, subject, body' }));
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const addr of to.split(',').map(s => s.trim()).filter(Boolean)) {
    if (!emailRe.test(addr)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Invalid recipient email: ${addr}` }));
    }
  }

  const host   = process.env.SMTP_HOST;
  const port   = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;
  const FROM_NAME = process.env.MAIL_FROM_NAME_RIUC || 'Rosebank International University College';
  const rawFrom = (process.env.MAIL_FROM_RIUC || '').trim();
  let from = '';
  if (rawFrom) {
    // If the env var already contains a display name (e.g. "Name <email>"), use it as-is.
    // Otherwise treat it as a bare address and wrap it with the friendly display name
    // so Gmail/Outlook don't fall back to showing the raw local-part as the sender name.
    from = /<[^>]+>/.test(rawFrom) ? rawFrom : `${FROM_NAME} <${rawFrom}>`;
  } else if (user) {
    from = `${FROM_NAME} <${user}>`;
  }

  if (!host || !user || !pass || !from) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS env vars.'
    }));
  }

  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
  });

  const html = buildEmailHtml({ subject, body, recipientName });
  const text = buildPlainText({ subject, body, recipientName });
  const [logo, goldLogo, students, letterheadLogo] = await Promise.all([
    loadLogo(req), loadGoldLogo(req), loadStudents(req), loadLetterheadLogo(req)
  ]);

  const attachments = [];
  if (logo) {
    attachments.push({
      filename: 'riuc-logo.png',
      content: logo,
      cid: LOGO_CID,
      contentType: 'image/png',
    });
  }
  if (goldLogo) {
    attachments.push({
      filename: 'riuc-gold-logo.png',
      content: goldLogo,
      cid: GOLD_LOGO_CID,
      contentType: 'image/png',
    });
  }
  if (students) {
    attachments.push({
      filename: 'riuc-students.png',
      content: students,
      cid: STUDENTS_CID,
      contentType: 'image/png',
    });
  }

  // Generate a PDF version of this email and attach it.
  try {
    const pdfBuffer = buildEmailPdfBuffer({ subject, body, recipientName, logo: letterheadLogo || goldLogo || logo });
    if (pdfBuffer && pdfBuffer.length) {
      attachments.push({
        filename: safePdfFilename(subject),
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }
  } catch (pdfErr) {
    console.error('RIUC email PDF generation failed:', pdfErr);
  }

  const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
  let totalBytes = 0;
  for (const att of userAttachments) {
    if (!att || typeof att !== 'object') continue;
    const filename = String(att.filename || 'attachment').slice(0, 200);
    const contentType = att.contentType ? String(att.contentType) : 'application/octet-stream';
    let raw = att.content;
    if (typeof raw !== 'string' || !raw) continue;
    const commaIdx = raw.indexOf(',');
    if (raw.startsWith('data:') && commaIdx !== -1) raw = raw.slice(commaIdx + 1);
    let buf;
    try { buf = Buffer.from(raw, 'base64'); } catch { continue; }
    if (!buf || !buf.length) continue;
    totalBytes += buf.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        error: `Attachments exceed ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB total limit`,
      }));
    }
    attachments.push({ filename, content: buf, contentType });
  }

  const mailOptions = {
    from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
    attachments: attachments.length ? attachments : undefined,
  };

  if (important) {
    mailOptions.priority = 'high';
    mailOptions.headers = {
      'X-Priority': '1 (Highest)',
      'X-MSMail-Priority': 'High',
      Importance: 'High',
    };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    }));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'Failed to send email',
      detail: err && err.message ? err.message : String(err),
    }));
  }
}

// Vercel Serverless Function: POST /api/send-email-msa
// Sends a professionally letter-headed HTML email branded for IIE MSA
// (The Independent Institute of Education — Monash South Africa, an Emeris brand).
//
// Required env vars:
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
//   ADMIN_AUTH_TOKEN
// Optional:
//   MAIL_FROM_MSA         "IIE MSA <enquiries@iiemsa.co.za>"
//   MAIL_FROM_NAME_MSA    Display name for the From: header
//   MSA_LOGO_URL          Override URL for the dark MSA logo
//   MSA_IIE_LOGO_URL      Override URL for the parent IIE logo (top hero, small)
//   MSA_FOOTER_URL        Override URL for the IIE footer image (bottom band)
//   EMERIS_WHITE_LOGO_URL Override URL for the Emeris parent-org logo

import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
};

// ---------- Brand & contact (https://www.iiemsa.co.za) ----------
const BRAND = {
  red:      '#9B1006', // primary deep red
  redDk:    '#6B0A04', // darker variant for depth
  black:    '#000000', // secondary (navbar, high-contrast)
  dark:     '#212529', // accent dark gray (body / structure)
  charcoal: '#212529',
  grey:     '#6E7479', // metadata grey
  neutral:  '#F4F1F1', // page background off-white
  border:   '#E4DFDF',
  white:    '#FFFFFF',
  cream:    '#FAF7F7',
};

const CONTACT = {
  name:     'IIE MSA (The Independent Institute of Education — Monash South Africa)',
  long:     'The Independent Institute of Education — Monash South Africa',
  short:    'IIE MSA',
  tagline:  "Education that's real-world ready.",
  phone:    '+27 11 950 4000',
  callcentre: '+27 11 950 4009',
  email:    'enquiries@iiemsa.co.za',
  enquire:  'portal.iiemsa.co.za/enquiry',
  web:      'www.iiemsa.co.za',
  address:  '144 Peter Road, Ruimsig, Johannesburg \u2014 Postal: Private Bag X60, Roodepoort 1725, South Africa',
  legal:    'IIE MSA is an educational brand of The Independent Institute of Education (Pty) Ltd, registered with the DHET as a private higher education institution under the Higher Education Act, 1997 (reg. no. 2007/HE07/002). Company Reg. No. 1987/004754/07. IIE MSA is becoming Emeris.',
};

// ---------- Logos (fetched once, embedded as CID) ----------
let LOGO_BUFFER        = null;
let IIE_LOGO_BUFFER    = null;
let FOOTER_BUFFER      = null;
let EMERIS_LOGO_BUFFER = null;

const LOGO_CID         = 'msa-logo@msa';
const IIE_LOGO_CID     = 'msa-iie-logo@msa';
const FOOTER_CID       = 'msa-footer@msa';
const EMERIS_LOGO_CID  = 'emeris-white-logo@msa';
const LOGO_URL         = `cid:${LOGO_CID}`;
const IIE_LOGO_URL     = `cid:${IIE_LOGO_CID}`;
const FOOTER_URL       = `cid:${FOOTER_CID}`;
const EMERIS_LOGO_URL  = `cid:${EMERIS_LOGO_CID}`;

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

function buildBaseUrl(req) {
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host  = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  return host ? `${proto}://${host}` : '';
}

async function loadLogo(req) {
  if (LOGO_BUFFER) return LOGO_BUFFER;
  const base = buildBaseUrl(req);
  LOGO_BUFFER = await fetchFirst([
    process.env.MSA_LOGO_URL,
    base ? `${base}/msa_logo.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/msa_logo.png` : null,
  ]);
  return LOGO_BUFFER;
}

async function loadIieLogo(req) {
  if (IIE_LOGO_BUFFER) return IIE_LOGO_BUFFER;
  const base = buildBaseUrl(req);
  IIE_LOGO_BUFFER = await fetchFirst([
    process.env.MSA_IIE_LOGO_URL,
    base ? `${base}/iie_logo_dark.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/iie_logo_dark.png` : null,
  ]);
  return IIE_LOGO_BUFFER;
}

async function loadFooter(req) {
  if (FOOTER_BUFFER) return FOOTER_BUFFER;
  const base = buildBaseUrl(req);
  FOOTER_BUFFER = await fetchFirst([
    process.env.MSA_FOOTER_URL,
    base ? `${base}/hsm_footer.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/hsm_footer.png` : null,
  ]);
  return FOOTER_BUFFER;
}

async function loadEmerisLogo(req) {
  if (EMERIS_LOGO_BUFFER) return EMERIS_LOGO_BUFFER;
  const base = buildBaseUrl(req);
  EMERIS_LOGO_BUFFER = await fetchFirst([
    process.env.EMERIS_WHITE_LOGO_URL,
    base ? `${base}/emeris-logo-transparent-whiet-color.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/emeris-logo-transparent-whiet-color.png` : null,
  ]);
  return EMERIS_LOGO_BUFFER;
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
      const baseStyle = `color:${BRAND.red};text-decoration:underline;font-weight:600;`;
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
        (m, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.red};text-decoration:underline;font-weight:600;">${u}</a>`
      );
    }
    html = parts.join('');

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
        return `<li${a} style="margin:4px 0;line-height:1.6;color:${BRAND.charcoal};">`;
      });

    return `<div style="line-height:1.65;color:${BRAND.charcoal};font-size:15px;">${html}</div>`;
  }
  const escaped = escapeHtml(raw);
  const linked = escaped.replace(/\b(https?:\/\/[^\s<]+)/g,
    (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.red};text-decoration:underline;font-weight:600;">${u}</a>`);
  return linked
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px 0;line-height:1.65;color:${BRAND.charcoal};font-size:15px;">${p.replace(/\n/g,'<br/>')}</p>`)
    .join('');
}

function looksLikePng(buf) {
  return Buffer.isBuffer(buf) && buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

function looksLikeSvg(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 5) return false;
  const head = buf.slice(0, Math.min(buf.length, 512)).toString('utf8').trim().toLowerCase();
  return head.startsWith('<?xml') ? /<svg\b/.test(head) : head.startsWith('<svg');
}

// ---------- HTML template ----------
function buildEmailHtml({ subject, body, recipientName }) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const ref = `MSA-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const greeting = recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Dear Student,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.neutral};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.charcoal};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.neutral};padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="660" cellpadding="0" cellspacing="0"
             style="width:660px;max-width:96%;background:${BRAND.white};border:1px solid ${BRAND.border};
                    box-shadow:0 8px 24px rgba(0,0,0,0.08);">

        <!-- TOP HERO: white letterhead, MSA logo left + parent IIE + red ADMISSIONS right -->
        <tr>
          <td bgcolor="${BRAND.white}" style="background-color:${BRAND.white};padding:24px 28px;border-bottom:4px solid ${BRAND.red};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle" align="left" style="width:300px;">
                <img src="${LOGO_URL}" alt="IIE MSA" height="64"
                     style="display:block;height:64px;width:auto;border:0;" />
              </td>
              <td valign="middle" align="right" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <div style="margin-bottom:6px;">
                  <img src="${IIE_LOGO_URL}" alt="The Independent Institute of Education" height="22"
                       style="display:inline-block;height:22px;width:auto;border:0;vertical-align:middle;" />
                </div>
                <div style="color:${BRAND.red};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;line-height:1.2;">
                  Admissions Office
                </div>
                <div style="color:${BRAND.dark};font-size:13px;font-weight:600;margin-top:4px;line-height:1.3;">
                  ${escapeHtml(CONTACT.tagline)}
                </div>
                <div style="color:${BRAND.grey};font-size:11px;margin-top:2px;line-height:1.3;">
                  ${CONTACT.web}
                </div>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Red strip with date + contact -->
        <tr>
          <td bgcolor="${BRAND.red}" style="background-color:${BRAND.red};padding:10px 32px;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle" style="color:${BRAND.white};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                ${today}
              </td>
              <td valign="middle" align="right" style="color:${BRAND.white};font-size:11px;font-weight:700;">
                ${CONTACT.phone} &nbsp;&middot;&nbsp; ${CONTACT.email}
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- SUBJECT -->
        <tr>
          <td style="padding:28px 36px 8px 36px;">
            <div style="font-size:11px;letter-spacing:0.16em;color:${BRAND.grey};text-transform:uppercase;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
              Subject
            </div>
            <div style="font-size:21px;font-weight:700;color:${BRAND.dark};margin-top:6px;line-height:1.3;">
              ${escapeHtml(subject)}
            </div>
            <div style="height:3px;width:56px;background:${BRAND.red};margin-top:14px;"></div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:18px 36px 8px 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.dark};font-weight:700;">
              ${greeting}
            </p>
            ${bodyToHtml(body)}
          </td>
        </tr>

        <!-- SIGN-OFF -->
        <tr>
          <td style="padding:8px 36px 28px 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 6px 0;font-size:15px;color:${BRAND.charcoal};line-height:1.6;">
              Yours sincerely,
            </p>
            <p style="margin:0;font-size:15px;color:${BRAND.dark};font-weight:700;">
              IIE MSA Admissions &amp; Student Accounts
            </p>
            <p style="margin:2px 0 0 0;font-size:12px;color:${BRAND.red};font-style:italic;font-weight:600;">
              ${escapeHtml(CONTACT.tagline)}
            </p>
          </td>
        </tr>

        <tr><td style="padding:0 36px;"><div style="height:1px;background:${BRAND.border};"></div></td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:18px 36px 24px 36px;background:${BRAND.cream};font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:11px;color:${BRAND.charcoal};line-height:1.6;">
                <strong style="color:${BRAND.dark};">${CONTACT.name}</strong><br/>
                ${escapeHtml(CONTACT.address)}<br/>
                Tel: ${CONTACT.phone} &middot; Call centre: ${CONTACT.callcentre}<br/>
                Email:
                <a href="mailto:${CONTACT.email}" style="color:${BRAND.red};text-decoration:none;font-weight:600;">${CONTACT.email}</a>
                &middot; Enquire:
                <a href="https://${CONTACT.enquire}" style="color:${BRAND.red};text-decoration:none;font-weight:600;">${CONTACT.enquire}</a>
                <br/>Web:
                <a href="https://${CONTACT.web}" style="color:${BRAND.red};text-decoration:none;font-weight:600;">${CONTACT.web}</a>
              </td>
              <td align="right" valign="bottom" style="font-size:10px;color:${BRAND.grey};">
                Ref ${ref}
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- BOTTOM BRAND BAND: white background with full-width IIE footer (logo + legal) -->
        <tr>
          <td bgcolor="${BRAND.white}" align="center" style="background-color:${BRAND.white};border-top:2px solid ${BRAND.red};border-bottom:1px solid ${BRAND.border};padding:0;">
            <img src="${FOOTER_URL}" alt="The Independent Institute of Education" width="660"
                 style="display:block;width:100%;max-width:660px;height:auto;border:0;margin:0;" />
          </td>
        </tr>

        <!-- Emeris parent-org strip -->
        <tr>
          <td bgcolor="${BRAND.black}" valign="middle" style="background-color:${BRAND.black};padding:14px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle" align="left">
                <img src="${EMERIS_LOGO_URL}" alt="Emeris" height="26"
                     style="display:block;height:26px;width:auto;border:0;" />
              </td>
              <td valign="middle" align="right" style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
                <div style="color:${BRAND.red};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;line-height:1.1;">
                  Uniting under Emeris
                </div>
                <div style="color:${BRAND.white};font-size:11px;margin-top:2px;line-height:1.3;">
                  IIE MSA is becoming Emeris &middot; emeris.ac.za
                </div>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- LEGAL STRIP -->
        <tr>
          <td style="background:${BRAND.dark};padding:12px 32px;font-family:Arial,Helvetica,sans-serif;">
            <div style="color:#DCDCDC;font-size:9.5px;line-height:1.5;text-align:center;">
              ${escapeHtml(CONTACT.legal)}
            </div>
          </td>
        </tr>

        <tr><td style="height:6px;background:${BRAND.red};line-height:6px;font-size:0;">&nbsp;</td></tr>
      </table>

      <div style="font-size:10.5px;color:${BRAND.grey};margin-top:14px;max-width:600px;text-align:center;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
        This message was sent by IIE MSA. If you received it in error, please reply to inform us and delete the message.
      </div>
    </td></tr>
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
    'IIE MSA',
    CONTACT.tagline,
    '------------------------------------------------',
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    plainBody,
    '',
    'Yours sincerely,',
    'IIE MSA Admissions & Student Accounts',
    '',
    '------------------------------------------------',
    CONTACT.name,
    CONTACT.address,
    `Tel:         ${CONTACT.phone}`,
    `Call centre: ${CONTACT.callcentre}`,
    `Email:       ${CONTACT.email}`,
    `Enquire:     https://${CONTACT.enquire}`,
    `Web:         ${CONTACT.web}`,
  ].join('\n');
}

// ---------- PDF version ----------
function decodeHtmlEntities(s) {
  return String(s == null ? '' : s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function extractInteractiveTokens(body) {
  const ctas = [];
  const links = [];
  const raw = String(body == null ? '' : body);
  if (!/<a\b/i.test(raw)) {
    return { html: raw, ctas, links };
  }
  const html = raw.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
    const hrefMatch = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || '');
    const href = decodeHtmlEntities(hrefMatch ? (hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || '') : '');
    const text = decodeHtmlEntities(String(inner || '').replace(/<[^>]+>/g, '').trim());
    if (!href || !text) return text || '';
    const isCta = /\bdata-cta\b/i.test(attrs || '');
    if (isCta) {
      const styleMatch = /\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs || '');
      const styleStr = styleMatch ? (styleMatch[2] || styleMatch[3] || '') : '';
      const bgMatch = /background(?:-color)?\s*:\s*([^;"']+)/i.exec(styleStr);
      const color = bgMatch ? bgMatch[1].trim() : BRAND.red;
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

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cssColorToRgb(value) {
  const v = String(value || '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return hexToRgb(v);
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return hexToRgb(BRAND.red);
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

function buildEmailPdfBuffer({ subject, body, recipientName, logo, iieLogo, footer, emerisLogo }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const contentW = pageW - marginX * 2;

  const red      = hexToRgb(BRAND.red);
  const black    = hexToRgb(BRAND.black);
  const dark     = hexToRgb(BRAND.dark);
  const charcoal = hexToRgb(BRAND.charcoal);
  const grey     = hexToRgb(BRAND.grey);
  const borderC  = hexToRgb(BRAND.border);

  // ---- Top hero band: white letterhead with MSA logo + right info column ----
  const HERO_H = 96;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, HERO_H, 'F');

  if (logo && (looksLikePng(logo) || (!looksLikeSvg(logo)))) {
    try {
      const fmt = looksLikePng(logo) ? 'PNG' : 'JPEG';
      const mime = fmt === 'PNG' ? 'png' : 'jpeg';
      const dataUrl = `data:image/${mime};base64,${logo.toString('base64')}`;
      let ratio = 3.0;
      try {
        const props = doc.getImageProperties(dataUrl);
        if (props && props.width && props.height) ratio = props.width / props.height;
      } catch { /* ignore */ }
      const logoH = 56;
      const logoW = logoH * ratio;
      const logoX = marginX;
      const logoY = (HERO_H - logoH) / 2;
      doc.addImage(dataUrl, fmt, logoX, logoY, logoW, logoH);
    } catch { /* ignore */ }
  } else {
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('IIE MSA', marginX, HERO_H / 2 + 6);
  }

  // Right column: small IIE logo + ADMISSIONS OFFICE + tagline + web
  const rightX = pageW - marginX;
  let rTopY = 24;
  if (iieLogo && (looksLikePng(iieLogo) || (!looksLikeSvg(iieLogo)))) {
    try {
      const fmt = looksLikePng(iieLogo) ? 'PNG' : 'JPEG';
      const mime = fmt === 'PNG' ? 'png' : 'jpeg';
      const dataUrl = `data:image/${mime};base64,${iieLogo.toString('base64')}`;
      let ratio = 2.5;
      try {
        const props = doc.getImageProperties(dataUrl);
        if (props && props.width && props.height) ratio = props.width / props.height;
      } catch { /* ignore */ }
      const iieH = 18;
      const iieW = iieH * ratio;
      doc.addImage(dataUrl, fmt, rightX - iieW, rTopY, iieW, iieH);
      rTopY += iieH + 6;
    } catch { /* ignore */ }
  }
  doc.setTextColor(red[0], red[1], red[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ADMISSIONS OFFICE', rightX, rTopY + 4, { align: 'right' });
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(10);
  doc.text(CONTACT.tagline, rightX, rTopY + 18, { align: 'right' });
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(CONTACT.web, rightX, rTopY + 32, { align: 'right' });

  // Red accent stripe under hero
  const accentH = 4;
  doc.setFillColor(red[0], red[1], red[2]);
  doc.rect(0, HERO_H, pageW, accentH, 'F');

  // Red info strip with date + contact
  const stripY = HERO_H + accentH;
  const stripH = 24;
  doc.setFillColor(red[0], red[1], red[2]);
  doc.rect(0, stripY, pageW, stripH, 'F');

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const stripTextY = stripY + stripH / 2 + 3;
  doc.text(String(today).toUpperCase(), marginX, stripTextY);
  doc.text(
    `${CONTACT.phone}  ·  ${CONTACT.email}`,
    pageW - marginX, stripTextY, { align: 'right' }
  );

  // ---- Subject ----
  let cursorY = stripY + stripH + 38;
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT', marginX, cursorY);
  cursorY += 22;
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(16);
  const subjLines = doc.splitTextToSize(String(subject || ''), contentW);
  doc.text(subjLines, marginX, cursorY);
  cursorY += subjLines.length * 19 + 10;
  doc.setFillColor(red[0], red[1], red[2]);
  doc.rect(marginX, cursorY, 56, 3, 'F');
  cursorY += 26;

  // ---- Greeting ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(recipientName ? `Dear ${recipientName},` : 'Dear Student,', marginX, cursorY);
  cursorY += 22;

  // ---- Body ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
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
    const padX = 26;
    const padY = 12;
    const radius = 6;
    const fontSize = 14;
    const tracking = 0.04 * fontSize;
    const verticalMargin = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    const label = String(cta.text || '');
    const labelW = doc.getTextWidth(label) + tracking * Math.max(0, label.length - 1);
    const btnW = labelW + padX * 2;
    const btnH = fontSize + padY * 2;

    ensureSpace(Math.ceil((btnH + verticalMargin * 2) / lineHeight));
    cursorY += verticalMargin;

    const btnX = marginX + (contentW - btnW) / 2;
    const [br, bg, bb] = cssColorToRgb(cta.color);
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(btnX, cursorY, btnW, btnH, radius, radius, 'F');

    doc.setTextColor(255, 255, 255);
    if (tracking > 0 && label.length > 1) {
      let x = btnX + padX;
      const baselineY = cursorY + padY + fontSize - 3;
      for (const ch of label) {
        doc.text(ch, x, baselineY);
        x += doc.getTextWidth(ch) + tracking;
      }
    } else {
      doc.text(label, btnX + btnW / 2, cursorY + padY + fontSize - 3, { align: 'center' });
    }
    doc.link(btnX, cursorY, btnW, btnH, { url: cta.url });

    cursorY += btnH + verticalMargin;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  }

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
          doc.setTextColor(red[0], red[1], red[2]);
          doc.setFont('helvetica', 'bold');
          const w = doc.getTextWidth(txt);
          doc.text(txt, xCursor, baselineY);
          doc.setDrawColor(red[0], red[1], red[2]);
          doc.setLineWidth(0.6);
          doc.line(xCursor, baselineY + 2, xCursor + w, baselineY + 2);
          doc.link(xCursor, cursorY, w, lineHeight, { url: link.url });
          xCursor += w;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
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
      const withSpacing = piece.replace(/\[\[LINK:(\d+)\]\]/g, (m, idx) => {
        const link = links[Number(idx)];
        return link ? `\u0001${idx}\u0002${link.text}\u0003` : '';
      });
      const wrapped = doc.splitTextToSize(withSpacing, contentW);
      ensureSpace(wrapped.length);
      for (const wline of wrapped) {
        const expanded = wline.replace(/\u0001(\d+)\u0002[^\u0003]*\u0003/g, '[[LINK:$1]]');
        drawLineWithLinks(expanded);
      }
    }
    cursorY += 8;
  }

  // ---- Sign off ----
  cursorY += 10;
  ensureSpace(4);
  doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
  doc.text('Yours sincerely,', marginX, cursorY);
  cursorY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('IIE MSA Admissions & Student Accounts', marginX, cursorY);

  // ---- Footer on every page ----
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    const boilerH = 56;
    const emerisH = 26;
    const legalH  = 16;
    const accentBottomH = 4;
    const totalBottomH = boilerH + emerisH + legalH + accentBottomH;
    const bandTopY = pageH - totalBottomH;

    // Footer text just above the bottom band
    const fy = bandTopY - 56;
    doc.setDrawColor(borderC[0], borderC[1], borderC[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, fy, pageW - marginX, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(CONTACT.short, marginX, fy + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.setFontSize(8);
    doc.text(CONTACT.address, marginX, fy + 30);
    doc.text(
      `Tel: ${CONTACT.phone}  |  ${CONTACT.email}  |  ${CONTACT.web}`,
      marginX, fy + 42,
    );
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginX, fy + 42, { align: 'right' });

    // White band with full-width IIE footer image
    doc.setFillColor(255, 255, 255);
    doc.rect(0, bandTopY, pageW, boilerH, 'F');
    doc.setFillColor(red[0], red[1], red[2]);
    doc.rect(0, bandTopY - 2, pageW, 2, 'F');
    doc.setDrawColor(borderC[0], borderC[1], borderC[2]);
    doc.setLineWidth(0.4);
    doc.line(0, bandTopY + boilerH, pageW, bandTopY + boilerH);

    if (footer && (looksLikePng(footer) || (!looksLikeSvg(footer)))) {
      try {
        const fmt = looksLikePng(footer) ? 'PNG' : 'JPEG';
        const mime = fmt === 'PNG' ? 'png' : 'jpeg';
        const dataUrl = `data:image/${mime};base64,${footer.toString('base64')}`;
        let ratio = 12;
        try {
          const props = doc.getImageProperties(dataUrl);
          if (props && props.width && props.height) ratio = props.width / props.height;
        } catch { /* ignore */ }
        const imgW = pageW;
        let imgH = imgW / ratio;
        if (imgH > boilerH) imgH = boilerH;
        const imgX = 0;
        const imgY = bandTopY + (boilerH - imgH) / 2;
        doc.addImage(dataUrl, fmt, imgX, imgY, imgW, imgH);
      } catch { /* ignore */ }
    }

    // Emeris parent strip (black bg)
    const emerisY = bandTopY + boilerH;
    doc.setFillColor(black[0], black[1], black[2]);
    doc.rect(0, emerisY, pageW, emerisH, 'F');

    if (emerisLogo && (looksLikePng(emerisLogo) || (!looksLikeSvg(emerisLogo)))) {
      try {
        const fmt = looksLikePng(emerisLogo) ? 'PNG' : 'JPEG';
        const mime = fmt === 'PNG' ? 'png' : 'jpeg';
        const dataUrl = `data:image/${mime};base64,${emerisLogo.toString('base64')}`;
        let ratio = 3.2;
        try {
          const props = doc.getImageProperties(dataUrl);
          if (props && props.width && props.height) ratio = props.width / props.height;
        } catch { /* ignore */ }
        const eH = 14;
        const eW = eH * ratio;
        doc.addImage(dataUrl, fmt, marginX, emerisY + (emerisH - eH) / 2, eW, eH);
      } catch { /* ignore */ }
    }
    doc.setTextColor(red[0], red[1], red[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('UNITING UNDER EMERIS', pageW - marginX, emerisY + emerisH / 2 - 1, { align: 'right' });
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('IIE MSA is becoming Emeris  ·  emeris.ac.za', pageW - marginX, emerisY + emerisH / 2 + 9, { align: 'right' });

    // Legal strip (dark gray)
    const legalY = emerisY + emerisH;
    doc.setFillColor(dark[0], dark[1], dark[2]);
    doc.rect(0, legalY, pageW, legalH, 'F');
    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('IIE MSA is an educational brand of The Independent Institute of Education (Pty) Ltd  ·  DHET reg. 2007/HE07/002  ·  Co. Reg. 1987/004754/07',
      pageW / 2, legalY + legalH / 2 + 2, { align: 'center' });

    // Red accent at the very bottom
    const accentY = legalY + legalH;
    doc.setFillColor(red[0], red[1], red[2]);
    doc.rect(0, accentY, pageW, accentBottomH, 'F');
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function safePdfFilename(subject) {
  const base = String(subject || 'IIE-MSA-Communication')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'IIE-MSA-Communication';
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
  const previewPdf    = Boolean(payload.previewPdf);

  if (previewPdf) {
    if (!subject || !body) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Missing required fields: subject, body' }));
    }
    try {
      const [logo, iieLogo, footer, emerisLogo] = await Promise.all([
        loadLogo(req), loadIieLogo(req), loadFooter(req), loadEmerisLogo(req),
      ]);
      const pdfBuffer = buildEmailPdfBuffer({ subject, body, recipientName, logo, iieLogo, footer, emerisLogo });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safePdfFilename(subject)}"`);
      return res.end(pdfBuffer);
    } catch (err) {
      console.error('IIE MSA PDF preview failed:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'PDF preview failed', detail: String(err && err.message || err) }));
    }
  }

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
  const FROM_NAME = process.env.MAIL_FROM_NAME_MSA || 'IIE MSA';
  const rawFrom = (process.env.MAIL_FROM_MSA || '').trim();
  let from = '';
  if (rawFrom) {
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
  const [logo, iieLogo, footer, emerisLogo] = await Promise.all([
    loadLogo(req), loadIieLogo(req), loadFooter(req), loadEmerisLogo(req),
  ]);

  const attachments = [];
  if (logo) {
    const isSvg = looksLikeSvg(logo);
    attachments.push({
      filename: isSvg ? 'msa-logo.svg' : 'msa-logo.png',
      content: logo,
      cid: LOGO_CID,
      contentType: isSvg ? 'image/svg+xml' : (looksLikePng(logo) ? 'image/png' : 'image/jpeg'),
    });
  }
  if (iieLogo) {
    const isSvg = looksLikeSvg(iieLogo);
    attachments.push({
      filename: isSvg ? 'iie-logo.svg' : 'iie-logo.png',
      content: iieLogo,
      cid: IIE_LOGO_CID,
      contentType: isSvg ? 'image/svg+xml' : (looksLikePng(iieLogo) ? 'image/png' : 'image/jpeg'),
    });
  }
  if (footer) {
    const isSvg = looksLikeSvg(footer);
    attachments.push({
      filename: isSvg ? 'iie-footer.svg' : 'iie-footer.png',
      content: footer,
      cid: FOOTER_CID,
      contentType: isSvg ? 'image/svg+xml' : (looksLikePng(footer) ? 'image/png' : 'image/jpeg'),
    });
  }
  if (emerisLogo) {
    const isSvg = looksLikeSvg(emerisLogo);
    attachments.push({
      filename: isSvg ? 'emeris-white-logo.svg' : 'emeris-white-logo.png',
      content: emerisLogo,
      cid: EMERIS_LOGO_CID,
      contentType: isSvg ? 'image/svg+xml' : (looksLikePng(emerisLogo) ? 'image/png' : 'image/jpeg'),
    });
  }

  try {
    const pdfBuffer = buildEmailPdfBuffer({ subject, body, recipientName, logo, iieLogo, footer, emerisLogo });
    if (pdfBuffer && pdfBuffer.length) {
      attachments.push({
        filename: safePdfFilename(subject),
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }
  } catch (pdfErr) {
    console.error('IIE MSA email PDF generation failed:', pdfErr);
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

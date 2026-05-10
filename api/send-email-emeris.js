// Vercel Serverless Function: POST /api/send-email-emeris
// Sends a professionally letter-headed HTML email branded for Emeris
// (the unified Varsity College / IIE MSA / Vega School higher-education
// brand). Uses nodemailer + the SAME SMTP credentials as /api/send-email.
//
// Required env vars (same as send-email.js):
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
//   ADMIN_AUTH_TOKEN  shared secret the admin UI sends in x-admin-token
// Optional:
//   MAIL_FROM_EMERIS         "Emeris <info@emeris.ac.za>"
//                            Falls back to MAIL_FROM, then to SMTP_USER.
//   EMERIS_LOGO_URL          Override URL for the white wordmark
//   EMERIS_TEAL_LOGO_URL     Override URL for the teal wordmark (header)
//   EMERIS_BANNER_URL        Override URL for the top "swoosh" banner

import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import zlib from 'node:zlib';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
};

// ---------- Brand & contact details (https://www.emeris.ac.za) ----------
const BRAND = {
  teal:    '#1AA39C',  // primary Emeris teal
  tealDk:  '#0B7A78',  // header band
  tealDp:  '#064E4E',  // deepest teal for footer band
  coral:   '#115063',  // accent (teal, replaces previous warm tone)
  coralDk: '#D55F26',
  grey:    '#5A5A5A',
  light:   '#EFF8F7',
  border:  '#CFE3E1',
  white:   '#FFFFFF',
  dark:    '#1A1A1A',
};

const CONTACT = {
  name:    'Emeris',
  long:    'Emeris (formerly Varsity College, IIE MSA & Vega School)',
  short:   'Emeris',
  tagline: 'Be Your Best',
  phone:   '0860 222 062',
  whatsapp:'087 220 5111',
  email:   'info@emeris.ac.za',
  enquire: 'portal.emeris.ac.za/enquiry',
  web:     'www.emeris.ac.za',
  address: 'Emeris National Office, 31 Sixth Street, Houghton Estate, Johannesburg, 2198',
  legal:   'An educational brand of The Independent Institute of Education (Pty) Ltd. Registered with the DHET as a private higher education institution under the Higher Education Act, 1997 (reg. no. 2007/HE07/002).',
};

// ---------- Logo / banner (fetched once, embedded as CID) ----------
let LOGO_BUFFER = null;       // white wordmark for dark footer band
let TEAL_LOGO_BUFFER = null;  // teal wordmark for letterhead
let BANNER_BUFFER = null;     // signature top banner (teal swoosh + logo)
let BOTTOM_BANNER_BUFFER = null; // signature bottom banner (logo + graphic)
const LOGO_CID    = 'emeris-logo@emeris';
const TEAL_CID    = 'emeris-teal-logo@emeris';
const BANNER_CID  = 'emeris-banner@emeris';
const BOTTOM_BANNER_CID = 'emeris-bottom-banner@emeris';
const LOGO_URL    = `cid:${LOGO_CID}`;
const TEAL_URL    = `cid:${TEAL_CID}`;
const BANNER_URL  = `cid:${BANNER_CID}`;
const BOTTOM_BANNER_URL = `cid:${BOTTOM_BANNER_CID}`;

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
    process.env.EMERIS_LOGO_URL,
    base ? `${base}/emeris-logo-transparent-whiet-color.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/emeris-logo-transparent-whiet-color.png` : null,
  ]);
  return LOGO_BUFFER;
}

async function loadTealLogo(req) {
  if (TEAL_LOGO_BUFFER) return TEAL_LOGO_BUFFER;
  const base = buildBaseUrl(req);
  TEAL_LOGO_BUFFER = await fetchFirst([
    process.env.EMERIS_TEAL_LOGO_URL,
    base ? `${base}/${encodeURIComponent('emeris logo-transparent-teal color.png')}` : null,
    base ? `${base}/${encodeURIComponent('emeris logo2-transparent-teal color.png')}` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/${encodeURIComponent('emeris logo-transparent-teal color.png')}` : null,
  ]);
  return TEAL_LOGO_BUFFER;
}

async function loadBanner(req) {
  if (BANNER_BUFFER) return BANNER_BUFFER;
  const base = buildBaseUrl(req);
  BANNER_BUFFER = await fetchFirst([
    process.env.EMERIS_BANNER_URL,
    base ? `${base}/new-brand-homepage-banner.jpg` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/new-brand-homepage-banner.jpg` : null,
  ]);
  return BANNER_BUFFER;
}

let STUDENTS_BUFFER = null;
async function loadStudents(req) {
  if (STUDENTS_BUFFER) return STUDENTS_BUFFER;
  const base = buildBaseUrl(req);
  STUDENTS_BUFFER = await fetchFirst([
    process.env.EMERIS_STUDENTS_URL,
    base ? `${base}/riuc-students.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/riuc-students.png` : null,
  ]);
  return STUDENTS_BUFFER;
}

async function loadBottomBanner(req) {
  if (BOTTOM_BANNER_BUFFER) return BOTTOM_BANNER_BUFFER;
  const base = buildBaseUrl(req);
  BOTTOM_BANNER_BUFFER = await fetchFirst([
    process.env.EMERIS_BOTTOM_BANNER_URL,
    base ? `${base}/Emeris-top-banner.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/Emeris-top-banner.png` : null,
  ]);
  return BOTTOM_BANNER_BUFFER;
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
      const baseStyle = `color:${BRAND.tealDk};text-decoration:underline;font-weight:600;`;
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
        (m, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.tealDk};text-decoration:underline;font-weight:600;">${u}</a>`
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
        return `<li${a} style="margin:4px 0;line-height:1.6;color:#1A1A1A;">`;
      });

    return `<div style="line-height:1.65;color:#1A1A1A;font-size:15px;">${html}</div>`;
  }
  const escaped = escapeHtml(raw);
  const linked = escaped.replace(/\b(https?:\/\/[^\s<]+)/g,
    (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer" style="color:${BRAND.tealDk};text-decoration:underline;font-weight:600;">${u}</a>`);
  return linked
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px 0;line-height:1.65;color:#1A1A1A;font-size:15px;">${p.replace(/\n/g,'<br/>')}</p>`)
    .join('');
}

function buildEmailHtml({ subject, body, recipientName }) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const ref = `EMS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
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
  :root { color-scheme: light; supported-color-schemes: light; }
  [data-ogsc] .light-bg, [data-ogsb] .light-bg { background:#FFFFFF !important; }
  u + .body .light-bg { background:#FFFFFF !important; }
</style>
</head>
<body style="margin:0;padding:0;background:#E6EFEE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E6EFEE;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="660" cellpadding="0" cellspacing="0"
               style="width:660px;max-width:96%;background:${BRAND.white};border:1px solid ${BRAND.border};
                      box-shadow:0 8px 32px rgba(11,122,120,0.16);">

          <!-- TOP BANNER (composite: teal logo on left, students on right, white bg) -->
          <tr>
            <td bgcolor="#FFFFFF" style="padding:0;background:${BRAND.white} !important;background-color:${BRAND.white};line-height:0;font-size:0;border-bottom:4px solid ${BRAND.coral};">
              <table role="presentation" width="660" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:660px;max-width:660px;background:${BRAND.white} !important;background-color:${BRAND.white};">
                <tr>
                  <td width="230" align="center" valign="middle" bgcolor="#FFFFFF" style="width:230px;padding:12px 14px;background:${BRAND.white} !important;background-color:${BRAND.white};">
                    <img src="${TEAL_URL}" alt="Emeris" width="200" bgcolor="#FFFFFF"
                         style="display:block;width:200px;max-width:100%;height:auto;border:0;margin:0 auto;background:${BRAND.white} !important;background-color:${BRAND.white};" />
                  </td>
                  <td width="430" align="right" valign="middle" bgcolor="#EFF8F7" style="width:430px;padding:0;background-color:${BRAND.light};background-image:linear-gradient(115deg, ${BRAND.tealDp} 0%, ${BRAND.tealDk} 35%, ${BRAND.teal} 60%, ${BRAND.light} 95%);background-repeat:no-repeat;background-size:cover;">
                    <!--[if gte mso 9]>
                    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:430px;height:110px;position:absolute;left:0;top:0;">
                      <v:fill type="gradient" color="${BRAND.tealDp}" color2="${BRAND.light}" angle="115" />
                    </v:rect>
                    <![endif]-->
                    <img src="${BANNER_URL}" alt="Emeris — Be Your Best" width="430" height="110"
                         style="display:block;width:430px;height:110px;max-width:430px;object-fit:cover;border:0;position:relative;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- UNIFIED INFO BAR: date + contact -->
          <tr>
            <td style="background:${BRAND.light};padding:10px 32px;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="color:${BRAND.tealDp};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                    ${today}
                  </td>
                  <td valign="middle" align="right" style="color:${BRAND.tealDp};font-size:11px;font-weight:700;">
                    ${CONTACT.phone} &nbsp;&middot;&nbsp; ${CONTACT.email} &nbsp;&middot;&nbsp; ${CONTACT.web}
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
              <div style="font-size:21px;font-weight:700;color:${BRAND.tealDp};margin-top:6px;line-height:1.3;">
                ${escapeHtml(subject)}
              </div>
              <div style="height:2px;width:56px;background:${BRAND.coral};margin-top:14px;"></div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:18px 36px 8px 36px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.tealDp};font-weight:700;">
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
              <p style="margin:0;font-size:15px;color:${BRAND.tealDp};font-weight:700;">
                Emeris Student Accounts &amp; Admissions
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
                    <strong style="color:${BRAND.tealDp};">${CONTACT.name}</strong><br/>
                    ${CONTACT.address}<br/>
                    Tel: ${CONTACT.phone} &middot; Whatsapp: ${CONTACT.whatsapp}<br/>
                    Email:
                    <a href="mailto:${CONTACT.email}" style="color:${BRAND.tealDk};text-decoration:none;font-weight:600;">${CONTACT.email}</a>
                    &middot; Enquire:
                    <a href="https://${CONTACT.enquire}" style="color:${BRAND.tealDk};text-decoration:none;font-weight:600;">${CONTACT.enquire}</a>
                    <br/>Web:
                    <a href="https://${CONTACT.web}" style="color:${BRAND.tealDk};text-decoration:none;font-weight:600;">${CONTACT.web}</a>
                  </td>
                  <td align="right" valign="bottom" style="font-size:10px;color:${BRAND.grey};">
                    Ref ${ref}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTTOM BRAND BANNER (image with overlaid text) -->
          <tr>
            <td background="${BOTTOM_BANNER_URL}" bgcolor="${BRAND.tealDp}" valign="top"
                style="background-image:url('${BOTTOM_BANNER_URL}');background-color:${BRAND.tealDp};background-repeat:no-repeat;background-position:center center;background-size:100% 100%;border-top:3px solid ${BRAND.coral};">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:660px;height:115px;">
                <v:fill type="frame" src="${BOTTOM_BANNER_URL}" color="${BRAND.tealDp}" />
                <v:textbox inset="0,0,0,0"><![endif]-->
              <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="width:660px;max-width:100%;">
                <tr>
                  <td valign="top" align="left" height="115" style="height:115px;padding:55px 200px 0 32px;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;overflow:hidden;white-space:nowrap;">
                    <div style="color:#6BC0E6;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;line-height:1;margin:0;white-space:nowrap;">
                      Office of the Registrar
                    </div>
                    <div style="color:#FFFFFF;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;margin:4px 0 0 0;letter-spacing:0.01em;line-height:1.2;font-weight:400;white-space:nowrap;">
                      ${CONTACT.tagline} &middot; 12 campuses across South Africa
                    </div>
                    <div style="color:#FFFFFF;font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;margin:0;letter-spacing:0.01em;line-height:1.2;font-weight:400;white-space:nowrap;">
                      ${escapeHtml(CONTACT.address.split(',').slice(0,2).join(','))} &middot; <span style="color:#6BC0E6;font-weight:600;">${CONTACT.email}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
            </td>
          </tr>

          <!-- LEGAL STRIP -->
          <tr>
            <td style="background:${BRAND.dark};padding:12px 32px;font-family:Arial,Helvetica,sans-serif;">
              <div style="color:#9FB6B4;font-size:9.5px;line-height:1.5;text-align:center;">
                ${escapeHtml(CONTACT.legal)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="height:6px;background:${BRAND.coral};line-height:6px;font-size:0;">&nbsp;</td>
          </tr>
        </table>

        <div style="font-size:10.5px;color:#6E7E7C;margin-top:14px;max-width:600px;text-align:center;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
          This message was sent by Emeris. If you received it in error, please reply to inform us and delete the message.
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
    'EMERIS',
    CONTACT.tagline,
    '------------------------------------------------',
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    plainBody,
    '',
    'Yours sincerely,',
    'Emeris Student Accounts & Admissions',
    '',
    '------------------------------------------------',
    CONTACT.name,
    CONTACT.address,
    `Tel:      ${CONTACT.phone}`,
    `Whatsapp: ${CONTACT.whatsapp}`,
    `Email:    ${CONTACT.email}`,
    `Enquire:  https://${CONTACT.enquire}`,
    `Web:      ${CONTACT.web}`,
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
      const color = bgMatch ? bgMatch[1].trim() : BRAND.tealDk;
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

function cssColorToRgb(value) {
  const v = String(value || '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return hexToRgb(v);
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return hexToRgb(BRAND.tealDk);
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

function looksLikePng(buf) {
  return Buffer.isBuffer(buf) && buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

// Build a tiny PNG (width px wide, 1 px tall, RGBA) of a horizontal gradient that
// fades from `hex` (fully opaque on the left) to fully transparent on the right.
// Returned as a base64 data URL ready for jsPDF.addImage(...).
function makeHorizontalFadePng(hex, width = 256) {
  const [r, g, b] = hexToRgb(hex);
  // Raw scanline: 1 filter byte (0 = None) + width * 4 RGBA bytes
  const raw = Buffer.alloc(1 + width * 4);
  raw[0] = 0;
  for (let x = 0; x < width; x++) {
    const t = x / (width - 1);
    // Hold the color near full opacity for the first ~40% of the width, then
    // ease out smoothly to fully transparent. Makes the swoosh feel solid on
    // the left without losing the soft fade on the right.
    let a;
    if (t < 0.4) {
      a = 1;
    } else {
      const u = (t - 0.4) / 0.6; // 0..1 across the fade region
      // smoothstep-ish ease-out
      a = 1 - (u * u * (3 - 2 * u));
    }
    const off = 1 + x * 4;
    raw[off]     = r;
    raw[off + 1] = g;
    raw[off + 2] = b;
    raw[off + 3] = Math.round(255 * Math.max(0, Math.min(1, a)));
  }
  const idat = zlib.deflateSync(raw);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    // CRC32 over type + data
    let c = 0xffffffff;
    const all = Buffer.concat([typeBuf, data]);
    for (let i = 0; i < all.length; i++) {
      c = c ^ all[i];
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    crcBuf.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8]  = 8;   // bit depth
  ihdr[9]  = 6;   // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

function buildEmailPdfBuffer({ subject, body, recipientName, logo, banner }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const contentW = pageW - marginX * 2;

  const teal   = hexToRgb(BRAND.tealDk);
  const tealDp = hexToRgb(BRAND.tealDp);
  const coral  = hexToRgb(BRAND.coral);
  const grey   = hexToRgb(BRAND.grey);
  const dark   = hexToRgb(BRAND.dark);

  // ---- Header band (matches email top banner exactly: solid #115063 band with
  // white logo on the left and the brand hero banner image on the right) ----
  const HEADER_H = 115; // mirrors the 115px tall HTML row
  const headerBg = hexToRgb('#115063');
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, 0, pageW, HEADER_H, 'F');

  // Mirror email proportions: left cell 230/660, right cell 430/660
  const leftCellW  = pageW * (230 / 660);
  const rightCellW = pageW - leftCellW;

  // Right cell: brand hero banner (object-fit: cover ~ stretch, ratios match closely)
  if (banner) {
    try {
      const bannerH = HEADER_H - 5; // mirror email's 110px image inside 115px row
      const bannerY = (HEADER_H - bannerH) / 2;
      const bannerFmt = looksLikePng(banner) ? 'PNG' : 'JPEG';
      const dataUrl = `data:image/${bannerFmt === 'PNG' ? 'png' : 'jpeg'};base64,${banner.toString('base64')}`;
      doc.addImage(dataUrl, bannerFmt, leftCellW, bannerY, rightCellW, bannerH);
    } catch { /* ignore image errors */ }
  }

  // Left cell: (swoosh + logo are drawn LAST so they overlay both the header band
  // AND the date strip below it.)

  // Coral accent stripe (3px in email)
  doc.setFillColor(coral[0], coral[1], coral[2]);
  doc.rect(0, HEADER_H, pageW, 3, 'F');

  // ---- Date + reference strip (matches email's light info bar with subtle border) ----
  const stripY = HEADER_H + 3;
  const stripH = 28;
  const lightBg = hexToRgb(BRAND.light);
  const borderC = hexToRgb(BRAND.border);
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(0, stripY, pageW, stripH, 'F');
  doc.setDrawColor(borderC[0], borderC[1], borderC[2]);
  doc.setLineWidth(0.5);
  doc.line(0, stripY + stripH, pageW, stripY + stripH);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setTextColor(tealDp[0], tealDp[1], tealDp[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const stripTextY = stripY + stripH / 2 + 3;
  doc.text(String(today).toUpperCase(), marginX, stripTextY);
  // (Address moved into the top banner — see overlay below.)

  // Address overlay: a slim translucent dark bar across the bottom of the header
  // banner, with the office address in white. Reads cleanly over the hero image
  // and matches the brand colour of the banner band.
  const addrBarH = 18;
  const addrBarY = HEADER_H - addrBarH;
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.55 }));
  doc.setFillColor(0, 0, 0);
  doc.rect(0, addrBarY, pageW, addrBarH, 'F');
  doc.restoreGraphicsState();
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(CONTACT.address, pageW - 18, addrBarY + addrBarH / 2 + 2.5, { align: 'right' });

  // (Top-left swoosh moved to the bottom banner — see footer drawing below.)

  if (logo) {
    try {
      const logoW = pageW * (190 / 660);
      const logoH = logoW * 0.26;
      const logoX = 22;
      const logoY = (HEADER_H - logoH) / 2;
      const dataUrl = `data:image/png;base64,${logo.toString('base64')}`;
      doc.addImage(dataUrl, 'PNG', logoX, logoY, logoW, logoH);
    } catch { /* ignore image errors */ }
  }

  // ---- Subject ----
  let cursorY = 168;
  doc.setTextColor(grey[0], grey[1], grey[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT', marginX, cursorY);
  cursorY += 22;
  doc.setTextColor(tealDp[0], tealDp[1], tealDp[2]);
  doc.setFontSize(16);
  const subjLines = doc.splitTextToSize(String(subject || ''), contentW);
  doc.text(subjLines, marginX, cursorY);
  cursorY += subjLines.length * 19 + 10;
  doc.setDrawColor(coral[0], coral[1], coral[2]);
  doc.setLineWidth(2);
  doc.line(marginX, cursorY, marginX + 56, cursorY);
  cursorY += 26;

  // ---- Greeting ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(tealDp[0], tealDp[1], tealDp[2]);
  doc.text(recipientName ? `Dear ${recipientName},` : 'Dear Student,', marginX, cursorY);
  cursorY += 22;

  // ---- Body ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(dark[0], dark[1], dark[2]);
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
    doc.setTextColor(dark[0], dark[1], dark[2]);
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
          doc.setTextColor(teal[0], teal[1], teal[2]);
          doc.setFont('helvetica', 'bold');
          const w = doc.getTextWidth(txt);
          doc.text(txt, xCursor, baselineY);
          doc.setDrawColor(teal[0], teal[1], teal[2]);
          doc.setLineWidth(0.6);
          doc.line(xCursor, baselineY + 2, xCursor + w, baselineY + 2);
          doc.link(xCursor, cursorY, w, lineHeight, { url: link.url });
          xCursor += w;
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
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Yours sincerely,', marginX, cursorY);
  cursorY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(tealDp[0], tealDp[1], tealDp[2]);
  doc.text('Emeris Student Accounts & Admissions', marginX, cursorY);

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
    doc.setTextColor(tealDp[0], tealDp[1], tealDp[2]);
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

    // ---- Bottom banner: solid teal band with left-side gradient swoosh ----
    const bannerH = 30;
    const bannerY = pageH - bannerH;
    doc.setFillColor(tealDp[0], tealDp[1], tealDp[2]);
    doc.rect(0, bannerY, pageW, bannerH, 'F');
    doc.setFillColor(coral[0], coral[1], coral[2]);
    doc.rect(0, bannerY - 4, pageW, 4, 'F');

    // Swoosh (clipped to ellipse + banner rect) on the left of the bottom band
    // Decorative angled blade across the left half of the bottom banner.
    // Built from a rectangular gradient + an angled "cut" mask:
    //   1) Lay down a gradient (#a5c785 -> transparent) across the left half.
    //   2) Cover the right portion with a teal triangle whose hypotenuse forms
    //      the diagonal trailing edge -- this gives the gradient a clean
    //      slanted edge without needing custom path/clip APIs.
    //   3) Add a thin secondary blade on top for a layered look.
    const halfW   = pageW * 0.5;
    const slantX  = bannerH * 1.6; // how far the diagonal trailing edge slants
    const gradPng = makeHorizontalFadePng('#a5c785', 512);

    // Main blade: full-height gradient
    try {
      doc.addImage(gradPng, 'PNG', 0, bannerY, halfW, bannerH);
    } catch { /* ignore */ }
    // Mask: triangle in the banner's teal colour to slice the trailing edge
    doc.setFillColor(tealDp[0], tealDp[1], tealDp[2]);
    doc.triangle(
      halfW - slantX, bannerY,
      halfW,          bannerY,
      halfW - slantX, bannerY + bannerH,
      'F'
    );

    // Secondary thin highlight blade, offset upward, slimmer slant
    const accentY = bannerY + bannerH * 0.18;
    const accentH = Math.max(2, bannerH * 0.22);
    const accentW = halfW * 0.78;
    const accentSlant = slantX * 0.55;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.6 }));
    try {
      doc.addImage(gradPng, 'PNG', 0, accentY, accentW, accentH);
    } catch { /* ignore */ }
    doc.setFillColor(tealDp[0], tealDp[1], tealDp[2]);
    doc.triangle(
      accentW - accentSlant, accentY,
      accentW,               accentY,
      accentW - accentSlant, accentY + accentH,
      'F'
    );
    doc.restoreGraphicsState();

    // Tagline text on top of the banner (right side)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      `${CONTACT.tagline}  ·  12 campuses across South Africa`,
      pageW - marginX,
      bannerY + bannerH / 2 + 3,
      { align: 'right' }
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function safePdfFilename(subject) {
  const base = String(subject || 'Emeris-Communication')
    .replace(/[^A-Za-z0-9 _-]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'Emeris-Communication';
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

  // PDF preview short-circuit: build the same letter PDF and return it directly
  // without sending any email. Useful for the dashboard preview switch.
  if (previewPdf) {
    if (!subject || !body) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Missing required fields: subject, body' }));
    }
    try {
      const [logo, banner] = await Promise.all([loadLogo(req), loadBanner(req)]);
      const pdfBuffer = buildEmailPdfBuffer({ subject, body, recipientName, logo, banner });
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safePdfFilename(subject)}"`);
      return res.end(pdfBuffer);
    } catch (err) {
      console.error('Emeris PDF preview failed:', err);
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
  const FROM_NAME = process.env.MAIL_FROM_NAME_EMERIS || 'Emeris';
  const rawFrom = (process.env.MAIL_FROM_EMERIS || '').trim();
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
  const [logo, tealLogo, banner, bottomBanner, students] = await Promise.all([
    loadLogo(req), loadTealLogo(req), loadBanner(req), loadBottomBanner(req), loadStudents(req),
  ]);

  const attachments = [];
  if (logo) {
    attachments.push({
      filename: 'emeris-logo.png',
      content: logo,
      cid: LOGO_CID,
      contentType: 'image/png',
    });
  }
  if (tealLogo) {
    attachments.push({
      filename: 'emeris-teal-logo.png',
      content: tealLogo,
      cid: TEAL_CID,
      contentType: 'image/png',
    });
  }
  // For the EMAIL, use the students cutout in the top-banner right cell. The
  // PDF still uses `banner` (the brand hero image) below. They share the
  // BANNER_CID slot for the email <img>.
  const emailBannerImg = students || banner;
  const emailBannerIsPng = looksLikePng(emailBannerImg);
  if (emailBannerImg) {
    attachments.push({
      filename: emailBannerIsPng ? 'emeris-banner.png' : 'emeris-banner.jpg',
      content: emailBannerImg,
      cid: BANNER_CID,
      contentType: emailBannerIsPng ? 'image/png' : 'image/jpeg',
    });
  }
  if (bottomBanner) {
    attachments.push({
      filename: 'emeris-bottom-banner.png',
      content: bottomBanner,
      cid: BOTTOM_BANNER_CID,
      contentType: 'image/png',
    });
  }

  // Generate a PDF version of this email and attach it.
  try {
    const pdfBuffer = buildEmailPdfBuffer({ subject, body, recipientName, logo, banner });
    if (pdfBuffer && pdfBuffer.length) {
      attachments.push({
        filename: safePdfFilename(subject),
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }
  } catch (pdfErr) {
    console.error('Emeris email PDF generation failed:', pdfErr);
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

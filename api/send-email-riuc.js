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
  phone:   '+233 307 007 800',
  whatsapp:'+233 59 646 6466',
  email:   'info@riuc.edu.gh',
  web:     'www.riuc.edu.gh',
  address: 'Opeibea House, No A177 Liberation Road, Airport Commercial Centre, Accra, Ghana',
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
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#EAEEF6;font-family:Georgia,'Times New Roman',serif;color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAEEF6;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="660" cellpadding="0" cellspacing="0"
               style="width:660px;max-width:96%;background:${BRAND.white};border:1px solid ${BRAND.border};
                      box-shadow:0 8px 32px rgba(15,35,80,0.12);">

          <!-- TOP BANNER (composite: gold logo on left, students on right, white bg) -->
          <tr>
            <td style="padding:0;background:${BRAND.white};line-height:0;font-size:0;border-bottom:4px solid ${BRAND.gold};">
              <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="width:660px;max-width:660px;background:${BRAND.white};">
                <tr>
                  <td width="230" align="center" valign="middle" style="width:230px;padding:12px 14px;background:${BRAND.white};">
                    <img src="${GOLD_LOGO_URL}" alt="RIUC" width="200"
                         style="display:block;width:200px;max-width:100%;height:auto;border:0;margin:0 auto;" />
                  </td>
                  <td width="430" align="right" valign="middle" style="width:430px;background:${BRAND.white};padding:0;">
                    <img src="${STUDENTS_URL}" alt="RIUC Students" width="430" height="110"
                         style="display:block;width:430px;height:110px;max-width:430px;object-fit:cover;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DATE / REF (moved from old navy header) -->
          <tr>
            <td style="background:${BRAND.white};padding:14px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="font-size:11px;color:${BRAND.grey};letter-spacing:0.04em;">
                    ${today}
                  </td>
                  <td valign="middle" align="right" style="font-size:11px;color:${BRAND.grey};font-family:'Courier New',monospace;">
                    Ref: ${ref}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTACT BAR -->
          <tr>
            <td style="background:${BRAND.gold};padding:8px 32px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:${BRAND.navyDk};font-size:11px;font-weight:700;">
                    Tel: ${CONTACT.phone}
                  </td>
                  <td align="center" style="color:${BRAND.navyDk};font-size:11px;font-weight:700;">
                    ${CONTACT.email}
                  </td>
                  <td align="right" style="color:${BRAND.navyDk};font-size:11px;font-weight:700;">
                    ${CONTACT.web}
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
            <td style="padding:18px 36px 8px 36px;font-family:Georgia,'Times New Roman',serif;">
              <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.navyDk};font-weight:700;">
                ${greeting}
              </p>
              ${bodyToHtml(body)}
            </td>
          </tr>

          <!-- SIGN-OFF -->
          <tr>
            <td style="padding:8px 36px 28px 36px;font-family:Georgia,'Times New Roman',serif;">
              <p style="margin:0 0 6px 0;font-size:15px;color:#1A1A1A;line-height:1.6;">
                Yours sincerely,
              </p>
              <p style="margin:0;font-size:15px;color:${BRAND.navyDk};font-weight:700;">
                The RIUC Office of Admissions
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
                    Tel: ${CONTACT.phone} &middot; WhatsApp: ${CONTACT.whatsapp}<br/>
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
    'The RIUC Office of Admissions',
    '',
    '------------------------------------------------',
    CONTACT.name,
    CONTACT.address,
    `Tel:      ${CONTACT.phone}`,
    `WhatsApp: ${CONTACT.whatsapp}`,
    `Email:    ${CONTACT.email}`,
    `Web:      ${CONTACT.web}`,
  ].join('\n');
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
  const from   = process.env.MAIL_FROM_RIUC
              || process.env.MAIL_FROM
              || (user ? `Rosebank International University College <${user}>` : '');

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
  const [logo, goldLogo, students] = await Promise.all([
    loadLogo(req), loadGoldLogo(req), loadStudents(req)
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

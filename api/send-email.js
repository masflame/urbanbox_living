// Vercel Serverless Function: POST /api/send-email
// Sends a professionally letter-headed HTML email (Urban Box Living branding)
// using nodemailer + SMTP credentials configured via environment variables.
//
// Required env vars (set in Vercel project settings AND .env.local for dev):
//   SMTP_HOST     e.g. mail.xanziteh.co.za
//   SMTP_PORT     465 (SSL) or 587 (STARTTLS)
//   SMTP_SECURE   "true" for 465, "false" for 587
//   SMTP_USER     hello.urbanboxliving@xanziteh.co.za
//   SMTP_PASS     <mailbox password>
//   MAIL_FROM     "Urban Box Living <hello.urbanboxliving@xanziteh.co.za>"
//   ADMIN_AUTH_TOKEN  shared secret the admin UI sends in x-admin-token

import nodemailer from 'nodemailer';

// Load the logo once and embed it as a CID attachment so it always renders,
// even if recipients block remote images and regardless of which domain is live.
let LOGO_BUFFER = null;
async function loadLogo(req) {
  if (LOGO_BUFFER) return LOGO_BUFFER;
  // Build candidate URLs: explicit env, the request host, and the Vercel-provided URL.
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'https';
  const host  = (req && req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
  const candidates = [
    process.env.LOGO_URL,
    host ? `${proto}://${host}/logo.png` : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/logo.png` : null,
    'https://urbanboxliving.vercel.app/logo.png',
  ].filter(Boolean);
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        LOGO_BUFFER = Buffer.from(ab);
        return LOGO_BUFFER;
      }
    } catch { /* try next */ }
  }
  return null;
}
const LOGO_CID = 'ubl-logo@urbanboxliving';

const BRAND = {
  gold:  '#C9A84C',
  dark:  '#0C0C0C',
  grey:  '#5A5A5A',
  light: '#F5F4F0',
  border:'#D2D0C8',
  white: '#FFFFFF',
};

const CONTACT = {
  phone: '+27 60 830 6956',
  email: 'hello.urbanboxliving@xanziteh.co.za',
  web:   'urbanboxliving.co.za',
  address: 'Urban Box Living, South Africa',
};

const LOGO_URL = `cid:${LOGO_CID}`;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bodyToHtml(text) {
  // Preserve paragraph breaks, escape HTML, convert URLs to links
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/\b(https?:\/\/[^\s<]+)/g,
    (u) => `<a href="${u}" style="color:#C9A84C;text-decoration:none;">${u}</a>`);
  return linked
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px 0;line-height:1.65;color:#1A1A1A;font-size:15px;">${p.replace(/\n/g,'<br/>')}</p>`)
    .join('');
}

function buildEmailHtml({ subject, body, recipientName }) {
  const today = new Date().toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const ref = `UBL-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const greeting = recipientName ? `Dear ${escapeHtml(recipientName)},` : 'Hello,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#EEEAE0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEEAE0;padding:32px 0;">
    <tr>
      <td align="center">
        <!-- Letter container -->
        <table role="presentation" width="640" cellpadding="0" cellspacing="0"
               style="width:640px;max-width:96%;background:${BRAND.white};border:1px solid ${BRAND.border};
                      box-shadow:0 8px 32px rgba(0,0,0,0.08);">

          <!-- HEADER BAND -->
          <tr>
            <td style="background:${BRAND.dark};border-left:6px solid ${BRAND.gold};padding:22px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right:14px;">
                          <img src="${LOGO_URL}" width="48" height="48" alt="Urban Box Living"
                               style="display:block;border-radius:4px;background:#fff;" />
                        </td>
                        <td valign="middle">
                          <div style="color:${BRAND.gold};font-size:18px;font-weight:700;letter-spacing:0.04em;">
                            URBAN BOX LIVING
                          </div>
                          <div style="color:#BFBFBF;font-size:11px;margin-top:2px;letter-spacing:0.02em;">
                            Modular Container Homes &amp; Structures
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle" align="right">
                    <div style="color:${BRAND.gold};font-size:11px;font-weight:700;letter-spacing:0.12em;">
                      OFFICIAL CORRESPONDENCE
                    </div>
                    <div style="color:#BFBFBF;font-size:10.5px;margin-top:4px;">
                      ${today}
                    </div>
                    <div style="color:#BFBFBF;font-size:10.5px;margin-top:2px;font-family:'Courier New',monospace;">
                      Ref: ${ref}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTACT BAR -->
          <tr>
            <td style="background:${BRAND.gold};padding:8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:${BRAND.dark};font-size:11px;font-weight:600;">
                    Tel: ${CONTACT.phone}
                  </td>
                  <td align="center" style="color:${BRAND.dark};font-size:11px;font-weight:600;">
                    ${CONTACT.email}
                  </td>
                  <td align="right" style="color:${BRAND.dark};font-size:11px;font-weight:600;">
                    ${CONTACT.web}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SUBJECT BAND -->
          <tr>
            <td style="padding:28px 36px 8px 36px;">
              <div style="font-size:11px;letter-spacing:0.16em;color:${BRAND.grey};text-transform:uppercase;font-weight:600;">
                Subject
              </div>
              <div style="font-size:20px;font-weight:700;color:${BRAND.dark};margin-top:6px;line-height:1.3;">
                ${escapeHtml(subject)}
              </div>
              <div style="height:2px;width:48px;background:${BRAND.gold};margin-top:14px;"></div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:18px 36px 8px 36px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:${BRAND.dark};font-weight:600;">
                ${greeting}
              </p>
              ${bodyToHtml(body)}
            </td>
          </tr>

          <!-- SIGN-OFF -->
          <tr>
            <td style="padding:8px 36px 28px 36px;">
              <p style="margin:0 0 6px 0;font-size:15px;color:#1A1A1A;line-height:1.6;">
                Kind regards,
              </p>
              <p style="margin:0;font-size:15px;color:${BRAND.dark};font-weight:700;">
                The Urban Box Living Team
              </p>
              <p style="margin:2px 0 0 0;font-size:12px;color:${BRAND.grey};">
                Modular Container Homes &amp; Structures
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:${BRAND.border};"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:18px 36px 24px 36px;background:${BRAND.light};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:${BRAND.grey};line-height:1.6;">
                    <strong style="color:${BRAND.dark};">Urban Box Living</strong><br/>
                    ${CONTACT.address}<br/>
                    Tel: ${CONTACT.phone} &middot; Email:
                    <a href="mailto:${CONTACT.email}" style="color:${BRAND.gold};text-decoration:none;">${CONTACT.email}</a><br/>
                    Web: <a href="https://${CONTACT.web}" style="color:${BRAND.gold};text-decoration:none;">${CONTACT.web}</a>
                  </td>
                  <td align="right" valign="bottom" style="font-size:10px;color:${BRAND.grey};">
                    Ref ${ref}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTTOM ACCENT -->
          <tr>
            <td style="height:6px;background:${BRAND.gold};line-height:6px;font-size:0;">&nbsp;</td>
          </tr>
        </table>

        <div style="font-size:10.5px;color:#8A8478;margin-top:14px;max-width:600px;text-align:center;line-height:1.5;">
          This message was sent by Urban Box Living. If you received it in error,
          please reply to inform us and delete the message.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPlainText({ subject, body, recipientName }) {
  const greeting = recipientName ? `Dear ${recipientName},` : 'Hello,';
  return [
    'URBAN BOX LIVING',
    'Modular Container Homes & Structures',
    '------------------------------------------------',
    `Subject: ${subject}`,
    '',
    greeting,
    '',
    body,
    '',
    'Kind regards,',
    'The Urban Box Living Team',
    '',
    '------------------------------------------------',
    `Tel:   ${CONTACT.phone}`,
    `Email: ${CONTACT.email}`,
    `Web:   ${CONTACT.web}`,
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

  // Auth: require shared secret token from admin UI
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
  // Mark as important / high priority by default — admin UI can opt out.
  const important     = payload.important === undefined ? true : Boolean(payload.important);

  if (!to || !subject || !body) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Missing required fields: to, subject, body' }));
  }

  // Basic email format check
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
  const from   = process.env.MAIL_FROM || (user ? `Urban Box Living <${user}>` : '');

  if (!host || !user || !pass || !from) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM env vars.'
    }));
  }

  const transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
  });

  const html = buildEmailHtml({ subject, body, recipientName });
  const text = buildPlainText({ subject, body, recipientName });
  const logo = await loadLogo(req);

  const mailOptions = {
    from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
    attachments: logo ? [{
      filename: 'logo.png',
      content: logo,
      cid: LOGO_CID,
      contentType: 'image/png',
    }] : undefined,
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

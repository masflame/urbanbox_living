// Payfast helper: builds a signed form and POSTs the user to Payfast.
//
// SECURITY NOTE:
// The passphrase is currently exposed in the client bundle. This is OK for
// SANDBOX testing but MUST be moved to a serverless function before going
// live (e.g. /api/payfast-sign). When that endpoint exists, replace
// signPayload() below with a fetch() to that endpoint.

import md5 from "js-md5";

const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
const PASSPHRASE = import.meta.env.VITE_PAYFAST_PASSPHRASE || "";
const PAYFAST_URL =
  import.meta.env.VITE_PAYFAST_URL ||
  "https://sandbox.payfast.co.za/eng/process";
const RETURN_URL =
  import.meta.env.VITE_PAYFAST_RETURN_URL ||
  `${window.location.origin}/checkout/success`;
const CANCEL_URL =
  import.meta.env.VITE_PAYFAST_CANCEL_URL ||
  `${window.location.origin}/checkout/payment`;
const NOTIFY_URL =
  import.meta.env.VITE_PAYFAST_NOTIFY_URL ||
  import.meta.env.VITE_PAYFAST_NOTIFY_URL_DEV ||
  null;

// Payfast signature spec: URL-encode values as application/x-www-form-urlencoded
// (spaces as +, uppercase hex), then MD5 the joined string + passphrase.
function payfastEncode(value) {
  return encodeURIComponent(String(value).trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function signPayload(data) {
  const ordered = Object.keys(data)
    .filter((k) => data[k] !== "" && data[k] !== null && data[k] !== undefined)
    .map((k) => `${k}=${payfastEncode(data[k])}`)
    .join("&");
  const withPass = PASSPHRASE
    ? `${ordered}&passphrase=${payfastEncode(PASSPHRASE)}`
    : ordered;
  return md5(withPass);
}

export function isPayfastConfigured() {
  return Boolean(MERCHANT_ID && MERCHANT_KEY);
}

/**
 * Build a Payfast checkout form and submit it (full page redirect).
 *
 * @param {object} opts
 * @param {string} opts.orderId   - your internal order reference (m_payment_id)
 * @param {number} opts.amount    - amount in ZAR (will be rounded to 2 decimals)
 * @param {string} opts.itemName  - short item name shown on Payfast page
 * @param {string} opts.itemDescription - longer description
 * @param {string} opts.firstName
 * @param {string} opts.lastName
 * @param {string} opts.email
 * @param {string} [opts.cellNumber]
 */
export function submitPayfastCheckout(opts) {
  if (!isPayfastConfigured()) {
    throw new Error(
      "Payfast is not configured. Set VITE_PAYFAST_MERCHANT_ID and VITE_PAYFAST_MERCHANT_KEY."
    );
  }

  // Field order matters for the signature on Payfast's side.
  const data = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: opts.returnUrl || RETURN_URL,
    cancel_url: opts.cancelUrl || CANCEL_URL,
    ...(NOTIFY_URL ? { notify_url: NOTIFY_URL } : {}),
    name_first: opts.firstName || "",
    name_last: opts.lastName || "",
    email_address: opts.email || "",
    ...(opts.cellNumber ? { cell_number: opts.cellNumber } : {}),
    m_payment_id: opts.orderId,
    amount: Number(opts.amount).toFixed(2),
    item_name: (opts.itemName || "Order").slice(0, 100),
    item_description: (opts.itemDescription || "").slice(0, 255),
  };

  data.signature = signPayload(data);

  // Build & submit form
  const form = document.createElement("form");
  form.method = "POST";
  form.action = PAYFAST_URL;
  form.style.display = "none";

  Object.entries(data).forEach(([k, v]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = String(v);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

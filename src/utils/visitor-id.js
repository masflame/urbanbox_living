async function hash(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getVisitorId() {
  const stored = localStorage.getItem("gm_visitor_id");
  if (stored) return stored;

  const raw = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency,
    `${screen.width}x${screen.height}`,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.platform,
  ].join("|");

  const id = (await hash(raw)).slice(0, 32);
  localStorage.setItem("gm_visitor_id", id);
  return id;
}

export function getSessionId() {
  let sid = sessionStorage.getItem("gm_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("gm_session_id", sid);
  }
  return sid;
}

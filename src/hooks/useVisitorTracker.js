import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { getVisitorId, getSessionId } from "../utils/visitor-id";

const VISITOR_TABLE =
  import.meta.env.VITE_ACCOUNT_VISITORS_TABLE || "Visitors";
// Prefer the dedicated account/orders project (where the Visitors table
// lives). Fall back to the older storage project, then the main project.
const supabaseUrl =
  import.meta.env.VITE_ACCOUNT_PROJECT_URL ||
  import.meta.env.VITE_STORAGE_PROJECT_URL ||
  import.meta.env.VITE_PROJECT_URL ||
  import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_ACCOUNT_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STORAGE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

function getVisitorEndpoint(tableName, query = {}) {
  if (!supabaseUrl) return null;
  const url = new URL(`/rest/v1/${tableName}`, supabaseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });
  return url.toString();
}

async function requestVisitorTable(tableName, { method = "GET", query, body, prefer, keepalive = false }) {
  if (!supabaseUrl || !supabaseKey) return { data: null, error: null, tableName };
  const endpoint = getVisitorEndpoint(tableName, query);
  if (!endpoint) return { data: null, error: null, tableName };

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  try {
    const response = await fetch(endpoint, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    });
    if (!response.ok) {
      let details = null;
      try { details = await response.json(); } catch { details = await response.text(); }
      return {
        data: null,
        error: {
          message: `Request failed with status ${response.status}${details?.message ? `: ${details.message}` : ""}`,
          status: response.status,
          details,
        },
        tableName,
      };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return { data: null, error: null };
    return { data: await response.json(), error: null, tableName };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : "Unknown request error" },
      tableName,
    };
  }
}

const requestVisitors = (options) => requestVisitorTable(VISITOR_TABLE, options);

async function fetchVisitor(visitorId) {
  const { data, error } = await requestVisitors({
    query: { visitor_id: `eq.${visitorId}`, select: "*", limit: "1" },
  });
  return { data: Array.isArray(data) ? data[0] || null : null, error };
}

async function insertVisitor(row) {
  const { data, error } = await requestVisitors({
    method: "POST",
    query: { select: "*" },
    body: [row],
    prefer: "return=representation",
  });
  return { data: Array.isArray(data) ? data[0] || null : null, error };
}

async function updateVisitor(visitorId, payload, options = {}) {
  return requestVisitors({
    method: "PATCH",
    query: {
      visitor_id: `eq.${visitorId}`,
      ...(options.select ? { select: options.select } : {}),
    },
    body: payload,
    prefer: options.prefer || "return=minimal",
    keepalive: options.keepalive || false,
  });
}

async function getClientIpAddress() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("https://api64.ipify.org?format=json", { signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.ip || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default function useVisitorTracker() {
  const { pathname, search } = useLocation();
  const pageStart = useRef(Date.now());
  const maxScroll = useRef(0);
  const dbRow = useRef(null);
  const session = useRef(null);
  const ready = useRef(false);
  const initCalled = useRef(false);

  function scrollPct() {
    const doc = document.documentElement;
    const h = doc.scrollHeight - doc.clientHeight;
    return h > 0 ? Math.round((window.scrollY / h) * 100) : 0;
  }

  function getUtm() {
    const p = new URLSearchParams(search);
    return {
      source: p.get("utm_source") || null,
      medium: p.get("utm_medium") || null,
      campaign: p.get("utm_campaign") || null,
    };
  }

  const persist = useCallback(async (sessions, extra = {}) => {
    if (!dbRow.current) return;
    const { error } = await updateVisitor(dbRow.current.visitor_id, {
      sessions,
      last_seen: new Date().toISOString(),
      ...extra,
    });
    if (error) console.error("Visitor persist error:", error);
  }, []);

  // INIT - fetch-or-create visitor row, push first session
  useEffect(() => {
    if (!supabaseUrl || !supabaseKey || initCalled.current) return;
    initCalled.current = true;

    (async () => {
      try {
        const visitorId = await getVisitorId();
      const sessionId = getSessionId();
      const now = new Date().toISOString();
      const utm = getUtm();
      // NOTE: the Visitors table currently has no ip_address column.
      // Re-enable this once the column exists.
      // const ipAddress = await getClientIpAddress();
      const ipAddress = null;

      const newSession = {
        sid: sessionId,
        ref: document.referrer || null,
        utm: (utm.source || utm.medium || utm.campaign) ? utm : null,
        started: now,
        pages: [{ url: pathname, title: document.title, at: now, dur: null, scroll: null }],
      };

      const { data: existing } = await fetchVisitor(visitorId);

      if (existing) {
        const sessions = Array.isArray(existing.sessions)
          ? [...existing.sessions, newSession]
          : [newSession];
        dbRow.current = existing;
        await updateVisitor(visitorId, {
          sessions,
          visit_count: (existing.visit_count || 0) + 1,
          last_seen: now,
          ...(ipAddress ? { ip_address: ipAddress } : {}),
        });
        dbRow.current.sessions = sessions;
      } else {
        const row = {
          visitor_id: visitorId,
          user_agent: navigator.userAgent,
          screen_resolution: `${screen.width}x${screen.height}`,
          language: navigator.language,
          platform: navigator.platform,
          visit_count: 1,
          last_seen: now,
          sessions: [newSession],
          ...(ipAddress ? { ip_address: ipAddress } : {}),
        };
        const { data } = await insertVisitor(row);
        dbRow.current = data || row;
      }

      session.current = newSession;
      ready.current = true;
      } catch (err) {
        if (typeof console !== 'undefined') console.warn('Visitor tracker init failed:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Route change → close previous page entry + push new page
  useEffect(() => {
    try {
      if (!ready.current || !session.current || !dbRow.current) return;
      const now = new Date().toISOString();
      const pages = session.current.pages;
      if (pages.length > 0) {
        const last = pages[pages.length - 1];
        if (last.dur === null) {
          last.dur = Math.round((Date.now() - pageStart.current) / 1000);
          last.scroll = maxScroll.current;
        }
      }
      pages.push({ url: `${pathname}${search}`, title: document.title, at: now, dur: null, scroll: null });
      pageStart.current = Date.now();
      maxScroll.current = 0;
      const sessions = dbRow.current.sessions;
      sessions[sessions.length - 1] = session.current;
      persist(sessions);
    } catch (err) {
      if (typeof console !== 'undefined') console.warn('Visitor tracker route effect failed:', err);
    }
  }, [pathname, search, persist]);

  // Scroll tracking
  useEffect(() => {
    function onScroll() {
      const pct = scrollPct();
      if (pct > maxScroll.current) maxScroll.current = pct;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // beforeunload - finalise last page using keepalive fetch
  useEffect(() => {
    function onExit() {
      if (!ready.current || !dbRow.current || !session.current) return;
      const pages = session.current.pages;
      if (pages.length > 0) {
        const last = pages[pages.length - 1];
        if (last.dur === null) {
          last.dur = Math.round((Date.now() - pageStart.current) / 1000);
          last.scroll = maxScroll.current;
        }
      }
      const sessions = dbRow.current.sessions;
      sessions[sessions.length - 1] = session.current;
      updateVisitor(
        dbRow.current.visitor_id,
        { sessions, last_seen: new Date().toISOString() },
        { keepalive: true },
      ).catch(() => {});
    }
    window.addEventListener("beforeunload", onExit);
    return () => window.removeEventListener("beforeunload", onExit);
  }, [pathname, search]);
}

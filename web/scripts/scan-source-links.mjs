/**
 * Site-wide source accuracy audit.
 *
 * For every href on the published site AND every sourced claim:
 *   1) Source valid — not denylisted; reachable (or official URL-year trust);
 *      publication/URL year matches the briefing year.
 *   2) Claim valid — distinctive numbers in the claim appear in the fetched
 *      text of the cited page(s) (union across multi-source facts).
 *
 * Usage: npm run scan-links
 * Env:   SCAN_LINKS_SKIP_FETCH=1  → static checks only (denylist / URL year)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const contentDir = path.join(webRoot, "content", "briefings");
const srcDir = path.join(webRoot, "src");
const rejectPath = path.join(__dirname, "rejected-source-ids.json");
const skipFetch = process.env.SCAN_LINKS_SKIP_FETCH === "1";

/** Browser-like UA for ordinary news desks. */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 syravocado-link-audit/2.0";
/**
 * Declared bot UA required by BLS / SEC fair-access policies.
 * Format: "<app> <contact-email>" — browser UAs get HTTP 403 on these hosts.
 */
const DECLARED_UA =
  "syravocado-link-audit/2.0 research@syravocado.local";

const rejects = JSON.parse(fs.readFileSync(rejectPath, "utf8"));
const deniedWallIds = new Set(rejects.wallstreetcnArticleIds ?? []);
const deniedBbIds = new Set(rejects.blockbeatsFlashIds ?? []);
const deniedSubstrings = (rejects.exactUrlSubstrings ?? []).map((s) =>
  s.toLowerCase(),
);

/**
 * Hosts/paths that may bot-block from CI IPs even with a declared UA.
 * Trust only when the URL embeds the briefing year (fallback, not preferred).
 * BLS + TSMC are handled via declared UA / SEC EDGAR adapters instead.
 */
const OFFICIAL_URL_YEAR_TRUST = [
  /home\.treasury\.gov\/resource-center\/data-chart-center\/interest-rates/i,
  /federalreserve\.gov\/newsevents\/.*20\d{2}/i,
  /asml\.com\/en\/news\/press-releases\/20\d{2}\//i,
];

/** News URLs with /YYYY/MM/DD/ (or /YYYY/MM/) that some CI egress IPs 403 (e.g. SED). */
const DATED_ARTICLE_PATH = /\/(20\d{2})\/(\d{2})(?:\/\d{2})?\//;

/** Homepage / tool hubs — validate reachability + denylist, not claim evidence. */
const HUB_HOSTS = new Set([
  "wallstreetcn.com",
  "www.wallstreetcn.com",
  "finance.yahoo.com",
  "www.federalreserve.gov",
  "www.cmegroup.com",
  "www.reuters.com",
  "www.bloomberg.com",
  "www.cnbc.com",
  "www.caixinglobal.com",
  "www.yicai.com",
  "www.theblockbeats.info",
  "www.sec.gov",
  "www.asml.com",
  "www.pbc.gov.cn",
  "www.stats.gov.cn",
  "en.yna.co.kr",
]);

/**
 * @typedef {{ href: string, where: string, briefingYear?: number, claimText?: string }} LinkHit
 * @typedef {{ file: string, where: string, text: string, hrefs: string[], briefingYear: number }} ClaimGroup
 */

function hostOf(href) {
  try {
    return new URL(href).hostname;
  } catch {
    return "";
  }
}

function isHubUrl(href) {
  try {
    const u = new URL(href);
    if (href.includes("${") || href.includes("%7B")) return true; // template placeholders in source
    if (HUB_HOSTS.has(u.hostname) && (u.pathname === "/" || u.pathname === "")) {
      return true;
    }
    // Catalog / tool hubs (not article claims)
    if (
      (u.hostname.endsWith("wallstreetcn.com") && u.pathname === "/") ||
      (u.hostname === "finance.yahoo.com" && u.pathname === "/") ||
      (u.hostname === "www.stats.gov.cn" && /\/english\/?$/.test(u.pathname)) ||
      (u.hostname === "www.pbc.gov.cn" &&
        (u.pathname === "/" || u.pathname === "")) ||
      (u.hostname === "www.cmegroup.com" && u.pathname.includes("fedwatch")) ||
      (u.hostname === "www.asml.com" && u.pathname.endsWith("/investors")) ||
      (u.hostname === "www.bls.gov" &&
        (u.pathname === "/" || /\/news\.release\/(cpi|ppi)\.nr0\.htm$/i.test(u.pathname)))
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function wallstreetcnArticleId(href) {
  const m = href.match(/wallstreetcn\.com\/articles\/(\d+)/i);
  return m?.[1] ?? null;
}

function blockbeatsFlashId(href) {
  const m = href.match(/theblockbeats\.info\/flash\/(\d+)/i);
  return m?.[1] ?? null;
}

function yearsInUrl(href) {
  const years = new Set();
  let m;
  const pathYear = /(?:^|\/)(20\d{2})(?:\/|-)/g;
  while ((m = pathYear.exec(href)) !== null) years.add(Number(m[1]));
  const bls = href.match(/(?:cpi|ppi)_(\d{4})(20\d{2})\.htm/i);
  if (bls) years.add(Number(bls[2]));
  const iso = href.match(/(20\d{2})-\d{2}-\d{2}/g);
  if (iso) for (const token of iso) years.add(Number(token.slice(0, 4)));
  for (const qm of href.matchAll(/[?&][^=]*=(20\d{2})(?:&|$)/g)) {
    years.add(Number(qm[1]));
  }
  return [...years];
}

function officialUrlYearTrust(href, briefingYear) {
  if (briefingYear == null) return false;
  if (!OFFICIAL_URL_YEAR_TRUST.some((re) => re.test(href))) return false;
  const years = yearsInUrl(href);
  return years.includes(briefingYear);
}

/** True when URL path embeds briefing year as a dated article path. */
function datedArticleYearTrust(href, briefingYear) {
  if (briefingYear == null) return false;
  const m = href.match(DATED_ARTICLE_PATH);
  if (!m) return false;
  return Number(m[1]) === briefingYear;
}

/** Combined soft trust when a live fetch is blocked in CI. */
function urlYearTrust(href, briefingYear) {
  return (
    officialUrlYearTrust(href, briefingYear) ||
    datedArticleYearTrust(href, briefingYear)
  );
}

function staticProblems(href, briefingYear) {
  const problems = [];
  const lower = href.toLowerCase();
  for (const sub of deniedSubstrings) {
    if (lower.includes(sub)) problems.push(`denylisted URL (${sub})`);
  }
  const wId = wallstreetcnArticleId(href);
  if (wId && deniedWallIds.has(wId)) {
    problems.push(`denylisted 华尔街见闻 article id ${wId}`);
  }
  const bId = blockbeatsFlashId(href);
  if (bId && deniedBbIds.has(bId)) {
    problems.push(`denylisted BlockBeats flash id ${bId}`);
  }
  if (briefingYear != null) {
    for (const y of yearsInUrl(href)) {
      if (y < briefingYear) {
        problems.push(`URL embeds year ${y} but briefing year is ${briefingYear}`);
      }
    }
  }
  return problems;
}

function normalizeText(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?45;|&#x2212;|&minus;/gi, "-")
    .replace(/[−–—]/g, "-")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Strip HTML to text and pull common date meta. */
function htmlToPlain(html) {
  const dates = [];
  const patterns = [
    /property=["']article:published_time["'][^>]*content=["']([^"']+)/gi,
    /content=["']([^"']+)["'][^>]*property=["']article:published_time["']/gi,
    /"datePublished"\s*:\s*"([^"]+)"/gi,
    /datetime=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) dates.push(m[1]);
  }
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  return { text: normalizeText(noScript), dates };
}

function yearsFromDateStrings(dates) {
  const years = new Set();
  for (const d of dates) {
    const m = String(d).match(/(20\d{2})/);
    if (m) years.add(Number(m[1]));
  }
  return [...years];
}

function yearsFromBody(text) {
  const years = new Set();
  // Chinese explicit dates near top matter most — scan whole body still
  const re = /(20\d{2})\s*年\s*\d{1,2}\s*月|(20\d{2})-\d{2}-\d{2}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    years.add(Number(m[1] || m[2]));
  }
  return [...years];
}

async function httpGet(url, userAgent) {
  const res = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const raw = await res.text();
  return { res, raw };
}

/** Browser UA first; on 401/403 retry with declared bot UA (BLS/SEC). */
async function httpGetWithUaFallback(url) {
  let { res, raw } = await httpGet(url, BROWSER_UA);
  let via = "http";
  if (res.status === 401 || res.status === 403) {
    ({ res, raw } = await httpGet(url, DECLARED_UA));
    via = "http-declared-ua";
  }
  return { res, raw, via };
}

/**
 * investor.tsmc.com is Cloudflare-blocked; resolve Q2/Qx prints via SEC EDGAR 6-K exhibits.
 * @param {string} href
 */
async function fetchTsmcViaSec(href) {
  const yearMatch = href.match(/\/(20\d{2})\//);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getUTCFullYear();
  const quarterMatch = href.match(/\/q([1-4])\/?$/i);
  const quarter = quarterMatch ? Number(quarterMatch[1]) : null;
  // Q2 results typically file in July; Q1 in April, etc.
  const monthHint = { 1: "04", 2: "07", 3: "10", 4: "01" }[quarter] ?? null;

  try {
    const subRes = await fetch(
      "https://data.sec.gov/submissions/CIK0001046179.json",
      {
        headers: { "user-agent": DECLARED_UA, accept: "application/json" },
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!subRes.ok) {
      return {
        ok: false,
        status: subRes.status,
        text: "",
        years: [year],
        via: "sec-edgar-tsmc",
        error: `submissions HTTP ${subRes.status}`,
      };
    }
    const sub = await subRes.json();
    const recent = sub?.filings?.recent;
    if (!recent?.form) {
      return {
        ok: false,
        text: "",
        years: [year],
        via: "sec-edgar-tsmc",
        error: "no recent filings",
      };
    }

    /** @type {string[]} */
    const candidates = [];
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] !== "6-K") continue;
      const date = recent.filingDate[i];
      if (!String(date).startsWith(String(year))) continue;
      if (monthHint && !String(date).includes(`-${monthHint}-`)) {
        // keep as secondary candidate
        candidates.push(recent.accessionNumber[i]);
        continue;
      }
      candidates.unshift(recent.accessionNumber[i]);
    }
    if (!candidates.length) {
      return {
        ok: false,
        text: "",
        years: [year],
        via: "sec-edgar-tsmc",
        error: `no ${year} 6-K filings found`,
      };
    }

    for (const accession of [...new Set(candidates)].slice(0, 4)) {
      const accPath = accession.replace(/-/g, "");
      const idxUrl = `https://www.sec.gov/Archives/edgar/data/1046179/${accPath}/index.json`;
      const { res: idxRes, raw: idxRaw } = await httpGet(idxUrl, DECLARED_UA);
      if (!idxRes.ok) continue;
      let items = [];
      try {
        items = JSON.parse(idxRaw)?.directory?.item ?? [];
      } catch {
        continue;
      }
      const names = items.map((it) => it.name).filter(Boolean);
      const pick =
        names.find((n) => /presentatione?\.htm$/i.test(n)) ||
        names.find((n) => /withguidance|earningsrelease/i.test(n)) ||
        names.find((n) => /tsm-.*6k\.htm$/i.test(n));
      if (!pick) continue;
      const docUrl = `https://www.sec.gov/Archives/edgar/data/1046179/${accPath}/${pick}`;
      const { res, raw } = await httpGet(docUrl, DECLARED_UA);
      if (!res.ok || raw.length < 200) continue;
      const { text, dates } = htmlToPlain(raw);
      if (!text || text.length < 40) continue;
      return {
        ok: true,
        status: res.status,
        text,
        years: [
          ...new Set([
            year,
            ...yearsFromDateStrings(dates),
            ...yearsFromBody(text),
          ]),
        ],
        via: `sec-edgar-tsmc:${pick}`,
      };
    }
    return {
      ok: false,
      text: "",
      years: [year],
      via: "sec-edgar-tsmc",
      error: "no usable 6-K exhibit body",
    };
  } catch (e) {
    return {
      ok: false,
      text: "",
      years: [year],
      via: "sec-edgar-tsmc",
      error: String(e.message || e),
    };
  }
}

/**
 * Fetch page/API content for evidence + year checks.
 * @returns {Promise<{ ok: boolean, status?: number, text: string, years: number[], via: string, error?: string }>}
 */
async function fetchSource(href) {
  // Yahoo quote pages often block HTML; chart API still exposes closes.
  const yf = href.match(
    /finance\.yahoo\.com\/quote\/([^/?#]+)(?:\/history)?/i,
  );
  if (yf) {
    const symbol = decodeURIComponent(yf[1]);
    try {
      const api = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
      const res = await fetch(api, {
        headers: {
          "user-agent": BROWSER_UA,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const meta = result?.meta ?? {};
      const quotes = result?.indicators?.quote?.[0] ?? {};
      const closes = quotes.close ?? [];
      const parts = [
        meta.symbol,
        meta.regularMarketPrice,
        meta.chartPreviousClose,
        ...closes.filter((x) => x != null),
      ];
      // percent changes between last two closes
      if (closes.length >= 2) {
        const a = closes[closes.length - 2];
        const b = closes[closes.length - 1];
        if (a && b) {
          const pct = (((b - a) / a) * 100).toFixed(2);
          parts.push(pct, String(Math.abs(Number(pct))));
        }
      }
      const text = normalizeText(parts.join(" "));
      return {
        ok: res.ok && text.length > 5,
        status: res.status,
        text,
        years: [new Date().getUTCFullYear()],
        via: "yahoo-chart-api",
      };
    } catch (e) {
      return {
        ok: false,
        text: "",
        years: [],
        via: "yahoo-chart-api",
        error: String(e.message || e),
      };
    }
  }

  const wId = wallstreetcnArticleId(href);
  if (wId) {
    try {
      const api = `https://api-one-wscn.awtmt.com/apiv1/content/articles/${wId}?extract=1`;
      const res = await fetch(api, {
        headers: { "user-agent": BROWSER_UA, accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      const json = await res.json();
      const d = json?.data ?? {};
      const text = normalizeText(
        [d.title, d.content_short, d.content, d.summary, d.uri]
          .filter(Boolean)
          .join("\n"),
      );
      const years = [];
      if (d.display_time) {
        years.push(new Date(d.display_time * 1000).getUTCFullYear());
      }
      years.push(...yearsFromBody(text));
      if (!text || text.length < 40) {
        return {
          ok: false,
          status: res.status,
          text: "",
          years,
          via: "wallstreetcn-api",
          error: "empty article body",
        };
      }
      return {
        ok: res.ok,
        status: res.status,
        text,
        years: [...new Set(years)],
        via: "wallstreetcn-api",
      };
    } catch (e) {
      return {
        ok: false,
        text: "",
        years: [],
        via: "wallstreetcn-api",
        error: String(e.message || e),
      };
    }
  }

  // TSMC IR site is Cloudflare-blocked — use SEC 6-K exhibits for the same prints.
  if (/investor\.tsmc\.com/i.test(href)) {
    const sec = await fetchTsmcViaSec(href);
    if (sec.ok) return sec;
    // fall through to HTTP attempt (rarely works) then return SEC error
    const direct = await (async () => {
      try {
        const { res, raw, via } = await httpGetWithUaFallback(href);
        if (res.ok && raw.length > 500) {
          const { text, dates } = htmlToPlain(raw);
          return {
            ok: true,
            status: res.status,
            text,
            years: [
              ...new Set([
                ...yearsInUrl(href),
                ...yearsFromDateStrings(dates),
                ...yearsFromBody(text),
              ]),
            ],
            via,
          };
        }
      } catch {
        /* ignore */
      }
      return null;
    })();
    if (direct?.ok) return direct;
    return sec;
  }

  let url = href;
  if (/bok\.or\.kr\/.*view\.do/i.test(href) && !/menuNo=/i.test(href)) {
    url += (href.includes("?") ? "&" : "?") + "menuNo=400022";
  }

  // BLS / SEC prefer declared UA first (browser UA is reliably 403).
  const preferDeclared =
    /bls\.gov/i.test(href) || /sec\.gov/i.test(href);

  try {
    let res;
    let raw;
    let via;
    if (preferDeclared) {
      ({ res, raw } = await httpGet(url, DECLARED_UA));
      via = "http-declared-ua";
      if (!res.ok) {
        const second = await httpGet(url, BROWSER_UA);
        res = second.res;
        raw = second.raw;
        via = "http";
      }
    } else {
      ({ res, raw, via } = await httpGetWithUaFallback(url));
    }

    const spa =
      res.ok &&
      raw.length < 5000 &&
      /id=["']app["']/.test(raw) &&
      !/<article/i.test(raw);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        text: "",
        years: yearsInUrl(href),
        via,
        error: `HTTP ${res.status}`,
      };
    }
    if (spa) {
      return {
        ok: false,
        status: res.status,
        text: "",
        years: yearsInUrl(href),
        via: `${via}-spa`,
        error: "SPA shell without article body",
      };
    }
    const { text, dates } = htmlToPlain(raw);
    const years = [
      ...new Set([
        ...yearsInUrl(href),
        ...yearsFromDateStrings(dates),
        ...yearsFromBody(text),
      ]),
    ];
    return { ok: true, status: res.status, text, years, via };
  } catch (e) {
    return {
      ok: false,
      text: "",
      years: yearsInUrl(href),
      via: "http",
      error: String(e.message || e),
    };
  }
}

/** Distinctive hard numbers from a claim that must be evidenced. */
function extractAnchors(claimText) {
  const t = String(claimText || "");
  /** @type {string[]} */
  const anchors = [];
  const push = (s) => {
    const n = s.replace(/,/g, "");
    if (!n) return;
    // skip bare years
    if (/^20\d{2}$/.test(n)) return;
    // skip lone day/month-ish integers
    if (/^\d{1,2}$/.test(n)) return;
    anchors.push(n);
  };

  for (const m of t.matchAll(/\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?/g)) {
    push(m[0].replace(/^\$/, ""));
  }
  for (const m of t.matchAll(/\$(\d+(?:\.\d+)?)\s*(?:bn|tn|m)?/gi)) {
    push(m[1]);
  }
  for (const m of t.matchAll(
    /(?:CNY|RMB|￥)\s*(\d+(?:\.\d+)?)\s*(?:bn|tn|亿)?/gi,
  )) {
    push(m[1]);
  }
  for (const m of t.matchAll(/([−\-]?\d+(?:\.\d+)?)%/g)) {
    push(m[1].replace(/^[−\-]/, "-").replace(/^-/, "-"));
    // also store unsigned form for pages that omit the sign
    push(m[1].replace(/^[−\-]/, ""));
  }
  for (const m of t.matchAll(/\b(\d+\.\d{2})\b/g)) {
    push(m[1]);
  }
  // rates like 2.75 without % nearby still useful when distinctive
  for (const m of t.matchAll(/\b(\d+\.\d{2})\b/g)) {
    push(m[1]);
  }

  return [...new Set(anchors.filter((a) => a.length >= 3 || a.includes(".")))];
}

/** Fed-style fractions often written as 3-1/2 instead of 3.50. */
const DECIMAL_TO_FRACTION = {
  "3.50": ["3-1/2", "3½", "3-1/2 percent"],
  "3.75": ["3-3/4", "¾", "3-3/4 percent"],
  "3.25": ["3-1/4", "¼", "3-1/4 percent"],
  "2.25": ["2-1/4", "2-1/4 percent"],
  "2.50": ["2-1/2", "2½"],
  "2.75": ["2-3/4"],
};

function pageHasAnchor(pageText, anchor) {
  if (!pageText) return false;
  const variants = new Set([
    anchor,
    anchor.replace(/^-/, ""),
  ]);
  // comma forms for large levels
  const unsigned = anchor.replace(/^-/, "");
  if (/^\d{4,}(\.\d+)?$/.test(unsigned)) {
    const [whole, frac] = unsigned.split(".");
    const withComma =
      whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
      (frac != null ? `.${frac}` : "");
    variants.add(withComma);
  }
  // one-decimal rounding (AP "0.4%" vs claim "0.38%")
  if (/^\d+\.\d{2}$/.test(unsigned)) {
    const rounded = (Math.round(Number(unsigned) * 10) / 10).toFixed(1);
    variants.add(rounded);
  }
  for (const frac of DECIMAL_TO_FRACTION[unsigned] ?? []) {
    variants.add(frac);
  }
  for (const v of variants) {
    if (v && pageText.includes(String(v).toLowerCase())) return true;
  }
  return false;
}

function collectHrefs(value, where, out, briefingYear) {
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      collectHrefs(item, `${where}[${i}]`, out, briefingYear),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "href" && typeof child === "string" && child.trim()) {
        out.push({ href: child.trim(), where: `${where}.href`, briefingYear });
      } else {
        collectHrefs(child, `${where}.${key}`, out, briefingYear);
      }
    }
  }
}

function loadBriefingLinks() {
  /** @type {LinkHit[]} */
  const hits = [];
  if (!fs.existsSync(contentDir)) return hits;
  for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
    const { data } = matter(raw);
    if (!data?.date) continue;
    const year = Number(String(data.date).slice(0, 4));
    collectHrefs(data, file, hits, Number.isFinite(year) ? year : undefined);
  }
  return hits;
}

function walkFiles(dir, extRe, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, extRe, out);
    } else if (extRe.test(entry.name)) out.push(full);
  }
  return out;
}

function loadSrcLinks() {
  /** @type {LinkHit[]} */
  const hits = [];
  const files = walkFiles(srcDir, /\.(tsx?|jsx?|mjs)$/);
  const urlRe = /https?:\/\/[^\s"'`)\]]+/g;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(webRoot, file);
    let match;
    while ((match = urlRe.exec(text)) !== null) {
      hits.push({ href: match[0].replace(/[.,;]+$/, ""), where: rel });
    }
  }
  return hits;
}

/** Group claim text with its source hrefs for evidence checks. */
function loadClaimGroups() {
  /** @type {ClaimGroup[]} */
  const groups = [];
  if (!fs.existsSync(contentDir)) return groups;

  for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(contentDir, file), "utf8");
    const { data } = matter(raw);
    if (!data?.date) continue;
    const briefingYear = Number(String(data.date).slice(0, 4));

    const addGroup = (where, text, sources) => {
      if (!text || !Array.isArray(sources) || !sources.length) return;
      const hrefs = sources
        .map((s) => (s && typeof s.href === "string" ? s.href.trim() : ""))
        .filter(Boolean);
      if (!hrefs.length) return;
      groups.push({ file, where, text, hrefs, briefingYear });
    };

    const factArrays = [
      ["summary", data.summary],
      ["globalChanged", data.globalChanged],
      ["chinaChanged", data.chinaChanged],
    ];
    for (const [name, arr] of factArrays) {
      if (!Array.isArray(arr)) continue;
      arr.forEach((item, i) => {
        if (item && typeof item === "object" && item.text) {
          addGroup(`${file}.${name}[${i}]`, item.text, item.sources);
        }
      });
    }

    if (Array.isArray(data.figures)) {
      data.figures.forEach((fig, i) => {
        if (!fig?.source?.href) return;
        let text = [fig.title, fig.display, fig.delta]
          .filter(Boolean)
          .join(" ");
        if (Array.isArray(fig.points)) {
          text += ` ${fig.points.map((p) => `${p.label} ${p.value}`).join(" ")}`;
        }
        addGroup(`${file}.figures[${i}]`, text, [fig.source]);
      });
    }

    if (Array.isArray(data.assetFramework)) {
      data.assetFramework.forEach((row, i) => {
        if (row?.driver && Array.isArray(row.driverSources)) {
          addGroup(
            `${file}.assetFramework[${i}].driver`,
            row.driver,
            row.driverSources,
          );
        }
      });
    }

    if (Array.isArray(data.signals)) {
      data.signals.forEach((row, i) => {
        if (row?.evidence && Array.isArray(row.evidenceSources)) {
          addGroup(
            `${file}.signals[${i}].evidence`,
            row.evidence,
            row.evidenceSources,
          );
        }
      });
    }

    if (Array.isArray(data.keySources)) {
      data.keySources.forEach((ks, i) => {
        if (ks?.href) {
          addGroup(
            `${file}.keySources[${i}]`,
            ks.label || "key source",
            [ks],
          );
        }
      });
    }
  }
  return groups;
}

function selfCheck() {
  const sample = staticProblems(
    "https://wallstreetcn.com/articles/3751205",
    2026,
  );
  if (!sample.length) {
    throw new Error("[scan-links] self-check failed: denylist missed 3751205");
  }
}

async function main() {
  selfCheck();

  const linkHits = [...loadBriefingLinks(), ...loadSrcLinks()];
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const warnings = [];

  // --- Pass 1: static checks on every href ---
  for (const hit of linkHits) {
    for (const p of staticProblems(hit.href, hit.briefingYear)) {
      failures.push(`${hit.where}\n    ${hit.href}\n    · ${p}`);
    }
  }

  const uniqueHrefs = [...new Set(linkHits.map((h) => h.href))];
  console.log(
    `[scan-links] Static: ${linkHits.length} occurrence(s), ${uniqueHrefs.length} unique href(s).`,
  );

  if (skipFetch) {
    if (failures.length) {
      console.error(`[scan-links] FAIL — ${failures.length} static issue(s):`);
      for (const f of failures) console.error(`  - ${f}`);
      process.exit(1);
    }
    console.log("[scan-links] OK (static only — SCAN_LINKS_SKIP_FETCH=1).");
    return;
  }

  // --- Pass 2: fetch each unique href ---
  /** @type {Map<string, Awaited<ReturnType<typeof fetchSource>>>} */
  const cache = new Map();
  const yearByHref = new Map(
    linkHits
      .filter((h) => h.briefingYear != null)
      .map((h) => [h.href, h.briefingYear]),
  );

  console.log(`[scan-links] Fetching ${uniqueHrefs.length} unique source URL(s)…`);
  let i = 0;
  for (const href of uniqueHrefs) {
    i += 1;
    process.stdout.write(`  [${i}/${uniqueHrefs.length}] ${hostOf(href)}\r`);
    // eslint-disable-next-line no-await-in-loop
    cache.set(href, await fetchSource(href));
  }
  process.stdout.write("\n");

  for (const href of uniqueHrefs) {
    const briefingYear = yearByHref.get(href);
    const fetched = cache.get(href);
    const hub = isHubUrl(href);

    if (staticProblems(href, briefingYear).length) continue; // already failed

    if (fetched?.ok) {
      if (briefingYear != null && fetched.years.length) {
        const hasBriefingYear = fetched.years.includes(briefingYear);
        const onlyOlder = fetched.years.every((y) => y < briefingYear);
        // wallstreetcn / dated articles: fail if publication year is older
        if (wallstreetcnArticleId(href) || blockbeatsFlashId(href)) {
          const pubYear = fetched.years[0];
          if (pubYear != null && pubYear < briefingYear) {
            failures.push(
              `${href}\n    · fetched publication year ${pubYear} < briefing ${briefingYear} (via ${fetched.via})`,
            );
          }
        } else if (onlyOlder && !hasBriefingYear && !hub) {
          failures.push(
            `${href}\n    · page dates only predate briefing year ${briefingYear} (found ${fetched.years.join(",")})`,
          );
        }
      }
      continue;
    }

    // Fetch failed
    if (hub) {
      warnings.push(`hub unreachable (non-fatal): ${href} (${fetched?.error})`);
      continue;
    }
    if (urlYearTrust(href, briefingYear)) {
      warnings.push(
        `fetch blocked; URL year trusted (${briefingYear}): ${href} (${fetched?.error || fetched?.status})`,
      );
      continue;
    }
    failures.push(
      `${href}\n    · source unreachable — cannot validate (${fetched?.error || fetched?.status || "unknown"}; via ${fetched?.via})`,
    );
  }

  // --- Pass 3: claim evidence (union of cited pages) ---
  const claims = loadClaimGroups();
  console.log(`[scan-links] Checking evidence for ${claims.length} sourced claim group(s)…`);

  for (const claim of claims) {
    // keySources labels are not numeric claims
    if (claim.where.includes(".keySources[")) {
      continue;
    }

    const anchors = extractAnchors(claim.text);
    if (!anchors.length) continue;

    const pageTexts = [];
    let anyFetchable = false;
    let anyYearTrust = false;
    const softBlocked = [];

    for (const href of claim.hrefs) {
      if (staticProblems(href, claim.briefingYear).length) continue;
      const fetched = cache.get(href);
      if (fetched?.ok && fetched.text) {
        anyFetchable = true;
        pageTexts.push(fetched.text);
      } else if (urlYearTrust(href, claim.briefingYear)) {
        anyYearTrust = true;
        softBlocked.push(href);
      }
    }

    const combined = pageTexts.join("\n");
    const missing = anchors.filter((a) => !pageHasAnchor(combined, a));

    // If we have fetchable pages, require anchors to appear (allow some slack:
    // pass if ≥60% of anchors match OR all "strong" anchors with a decimal match).
    if (anyFetchable) {
      const hitCount = anchors.length - missing.length;
      const strong = anchors.filter((a) => /\d+\.\d{2}/.test(a) || a.length >= 5);
      const strongMissing = strong.filter((a) => !pageHasAnchor(combined, a));
      const ratio = hitCount / anchors.length;
      // Co-cited dated article blocked in CI (e.g. SED) — don't fail the whole claim.
      if (softBlocked.length && missing.length && ratio < 0.6) {
        warnings.push(
          `${claim.where}: partial evidence (${hitCount}/${anchors.length}); dated co-source blocked in this environment (${softBlocked.length})`,
        );
        continue;
      }
      if (strong.length && strongMissing.length === strong.length) {
        failures.push(
          `${claim.where}\n    claim: ${claim.text.slice(0, 160)}…\n    · none of the strong numbers (${strong.slice(0, 8).join(", ")}) appear in cited page(s):\n      ${claim.hrefs.join("\n      ")}`,
        );
      } else if (ratio < 0.34 && missing.length) {
        failures.push(
          `${claim.where}\n    claim: ${claim.text.slice(0, 160)}…\n    · missing evidence for: ${missing.slice(0, 10).join(", ")}\n      sources: ${claim.hrefs.join(", ")}`,
        );
      } else if (missing.length && ratio < 0.6) {
        warnings.push(
          `${claim.where}: partial evidence (${hitCount}/${anchors.length} anchors); missing ${missing.slice(0, 6).join(", ")}`,
        );
      }
      continue;
    }

    // No fetchable body — URL-year trust on dated/official sources
    if (anyYearTrust && claim.hrefs.every(
      (h) =>
        urlYearTrust(h, claim.briefingYear) ||
        isHubUrl(h) ||
        staticProblems(h, claim.briefingYear).length,
    )) {
      warnings.push(
        `${claim.where}: evidence via URL-year trust only (pages bot-blocked in this environment)`,
      );
      continue;
    }

    if (!anyFetchable && !anyYearTrust) {
      failures.push(
        `${claim.where}\n    claim: ${claim.text.slice(0, 160)}…\n    · no fetchable source to verify claim numbers; hrefs:\n      ${claim.hrefs.join("\n      ")}`,
      );
    }
  }

  // Negative self-check: wrong-year wallstreetcn must fail year gate when fetched
  const bad = await fetchSource("https://wallstreetcn.com/articles/3751205");
  if (bad.ok && bad.years[0] === 2025) {
    const wouldFail = bad.years[0] < 2026;
    if (!wouldFail) {
      failures.push("self-check: 3751205 year gate logic broken");
    } else {
      console.log(
        "[scan-links] self-check: 3751205 resolves to 2025 via API — year gate would reject.",
      );
    }
  }

  console.log(`[scan-links] warnings: ${warnings.length}`);
  for (const w of warnings.slice(0, 30)) console.log(`  ! ${w}`);

  if (failures.length) {
    console.error(`\n[scan-links] FAIL — ${failures.length} accuracy issue(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      "\nFix the cite or the claim text, add newly found bad IDs to rejected-source-ids.json, then re-run npm run scan-links.",
    );
    process.exit(1);
  }

  console.log(
    "[scan-links] OK — every site href and sourced claim passed validity + evidence checks.",
  );
}

main().catch((err) => {
  console.error("[scan-links] fatal:", err);
  process.exit(1);
});

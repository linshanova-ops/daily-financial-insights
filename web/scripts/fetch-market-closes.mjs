/**
 * Fetch Market Dashboard closes from free public APIs and optionally inject
 * into a briefing markdown frontmatter as `marketDashboard`.
 *
 * Usage:
 *   node scripts/fetch-market-closes.mjs
 *   node scripts/fetch-market-closes.mjs --inject content/briefings/YYYY-MM-DD.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import {
  changeDirection,
  formatBpChange,
  formatLevel,
  formatPctChange,
  formatSignedPct,
  parseUsDate,
  unixToDateString,
} from "./lib/market-closes-format.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UA = "Mozilla/5.0 (compatible; syravocado-market-dashboard/1.0)";

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/csv,*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Last two non-null daily closes from Yahoo chart API. */
async function yahooPair(symbol) {
  const encoded = encodeURIComponent(symbol);
  // Prefer 1mo so thin symbols (e.g. HSTECH.HK) still yield two sessions.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1mo`;
  const data = await fetchJson(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo: no result for ${symbol}`);
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const pairs = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && !Number.isNaN(closes[i])) {
      pairs.push({ t: timestamps[i], c: closes[i] });
    }
  }
  if (pairs.length < 1) throw new Error(`Yahoo: no closes for ${symbol}`);
  const last = pairs[pairs.length - 1];
  const prev = pairs.length >= 2 ? pairs[pairs.length - 2] : null;
  return { prev, last, symbol };
}

function yahooSource(symbol, label) {
  const pathSym = encodeURIComponent(symbol);
  return {
    label: label || `Yahoo Finance (${symbol})`,
    href: `https://finance.yahoo.com/quote/${pathSym}/`,
  };
}

async function rowFromYahoo({
  id,
  asset,
  symbol,
  decimals = 2,
  prefix = "",
  suffix = "",
  sourceLabel,
}) {
  const { prev, last } = await yahooPair(symbol);
  const latest = formatLevel(last.c, { decimals, prefix, suffix });
  const change = prev ? formatPctChange(prev.c, last.c) : null;
  return {
    id,
    asset,
    latest,
    change,
    changeDirection: changeDirection(change),
    asOfDate: unixToDateString(last.t),
    source: yahooSource(symbol, sourceLabel),
  };
}

async function fetchTreasuryRows() {
  const year = new Date().getUTCFullYear();
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`;
  const text = await fetchText(url);
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 3) throw new Error("Treasury CSV too short");
  const header = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const idx = (name) => header.indexOf(name);
  const cols = {
    date: idx("Date"),
    y2: idx("2 Yr"),
    y5: idx("5 Yr"),
    y10: idx("10 Yr"),
    y30: idx("30 Yr"),
  };
  if (Object.values(cols).some((i) => i < 0)) {
    throw new Error(`Treasury CSV missing columns: ${header.join("|")}`);
  }
  const parseRow = (line) => {
    const cells = line.split(",").map((c) => c.replace(/"/g, "").trim());
    return {
      date: parseUsDate(cells[cols.date]),
      y2: Number(cells[cols.y2]),
      y5: Number(cells[cols.y5]),
      y10: Number(cells[cols.y10]),
      y30: Number(cells[cols.y30]),
    };
  };
  const latest = parseRow(lines[1]);
  const prev = parseRow(lines[2]);
  const mk = (id, asset, key) => {
    const change = formatBpChange(prev[key], latest[key]);
    return {
      id,
      asset,
      latest: formatLevel(latest[key], { decimals: 2, suffix: "%" }),
      change,
      changeDirection: changeDirection(change),
      asOfDate: latest.date,
      source: {
        label: "U.S. Treasury",
        href: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/textview?type=daily_treasury_yield_curve",
      },
    };
  };
  return [
    mk("us02y", "US 2Y yield", "y2"),
    mk("us05y", "US 5Y yield", "y5"),
    mk("us10y", "US 10Y yield", "y10"),
    mk("us30y", "US 30Y yield", "y30"),
  ];
}

async function fetchBtcRow() {
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
  );
  const usd = data?.bitcoin?.usd;
  const chg = data?.bitcoin?.usd_24h_change;
  if (usd == null) throw new Error("CoinGecko: missing bitcoin usd");
  const change = formatSignedPct(chg);
  const asOfDate = new Date().toISOString().slice(0, 10);
  return {
    id: "btc",
    asset: "BTC/USD",
    latest: formatLevel(usd, { decimals: 0, prefix: "$" }),
    change,
    changeDirection: changeDirection(change),
    asOfDate,
    source: {
      label: "CoinGecko",
      href: "https://www.coingecko.com/en/coins/bitcoin",
    },
  };
}

async function fetchFundingRow() {
  const hist = await fetchJson(
    "https://www.okx.com/api/v5/public/funding-rate-history?instId=BTC-USDT-SWAP&limit=2",
  );
  const rows = hist?.data || [];
  if (rows.length < 1) throw new Error("OKX: no funding history");
  const latest = Number(rows[0].fundingRate);
  const prev = rows[1] ? Number(rows[1].fundingRate) : null;
  const latestPct = formatLevel(latest * 100, { decimals: 4, suffix: "%" });
  let change = null;
  if (prev != null) {
    const bp = (latest - prev) * 10000; // rate diff in bp of notional
    const sign = bp > 0 ? "+" : bp < 0 ? "−" : "";
    change = `${sign}${Math.abs(bp).toFixed(3)} bp`;
  }
  const ts = rows[0].fundingTime ? Number(rows[0].fundingTime) : Date.now();
  return {
    id: "btc-funding",
    asset: "BTC funding rate",
    latest: latestPct,
    change,
    changeDirection: changeDirection(change),
    asOfDate: new Date(ts).toISOString().slice(0, 10),
    source: {
      label: "OKX funding API",
      href: "https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP",
    },
  };
}

async function safeRow(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[market-closes] skip ${label}: ${err?.message ?? err}`);
    return null;
  }
}

export async function buildMarketDashboard() {
  const equities = (
    await Promise.all([
      safeRow("spx", () =>
        rowFromYahoo({
          id: "spx",
          asset: "S&P 500",
          symbol: "^GSPC",
          sourceLabel: "Yahoo Finance (^GSPC)",
        }),
      ),
      safeRow("nasdaq", () =>
        rowFromYahoo({
          id: "nasdaq",
          asset: "Nasdaq Composite",
          symbol: "^IXIC",
          sourceLabel: "Yahoo Finance (^IXIC)",
        }),
      ),
      safeRow("vix", () =>
        rowFromYahoo({
          id: "vix",
          asset: "VIX",
          symbol: "^VIX",
          sourceLabel: "Yahoo Finance (^VIX)",
        }),
      ),
      safeRow("nikkei", () =>
        rowFromYahoo({
          id: "nikkei",
          asset: "Nikkei 225",
          symbol: "^N225",
          decimals: 2,
          sourceLabel: "Yahoo Finance (^N225)",
        }),
      ),
      safeRow("hsi", () =>
        rowFromYahoo({
          id: "hsi",
          asset: "Hang Seng",
          symbol: "^HSI",
          sourceLabel: "Yahoo Finance (^HSI)",
        }),
      ),
      safeRow("hstech", () =>
        rowFromYahoo({
          id: "hstech",
          asset: "Hang Seng Tech",
          symbol: "HSTECH.HK",
          sourceLabel: "Yahoo Finance (HSTECH.HK)",
        }),
      ),
      safeRow("shanghai", () =>
        rowFromYahoo({
          id: "shanghai",
          asset: "Shanghai Composite",
          symbol: "000001.SS",
          sourceLabel: "Yahoo Finance (000001.SS)",
        }),
      ),
    ])
  ).filter(Boolean);

  const treasuries = (await safeRow("treasuries", fetchTreasuryRows)) || [];

  const fxCmdtyCrypto = (
    await Promise.all([
      safeRow("usdjpy", () =>
        rowFromYahoo({
          id: "usdjpy",
          asset: "USD/JPY",
          symbol: "JPY=X",
          decimals: 4,
          sourceLabel: "Yahoo Finance (JPY=X)",
        }),
      ),
      safeRow("usdcny", () =>
        rowFromYahoo({
          id: "usdcny",
          asset: "USD/CNY",
          symbol: "CNY=X",
          decimals: 4,
          sourceLabel: "Yahoo Finance (CNY=X)",
        }),
      ),
      safeRow("gold", () =>
        rowFromYahoo({
          id: "gold",
          asset: "Gold (futures)",
          symbol: "GC=F",
          prefix: "$",
          sourceLabel: "Yahoo Finance (GC=F)",
        }),
      ),
      safeRow("brent", () =>
        rowFromYahoo({
          id: "brent",
          asset: "Brent crude",
          symbol: "BZ=F",
          prefix: "$",
          sourceLabel: "Yahoo Finance (BZ=F)",
        }),
      ),
      safeRow("btc", fetchBtcRow),
      safeRow("btc-funding", fetchFundingRow),
    ])
  ).filter(Boolean);

  const groups = [
    { id: "global-equities", title: "Global equities", rows: equities },
    { id: "us-treasuries", title: "US Treasuries", rows: treasuries },
    {
      id: "fx-commodities-crypto",
      title: "FX / Commodities / Crypto",
      rows: fxCmdtyCrypto,
    },
  ].filter((g) => g.rows.length > 0);

  return {
    asOf: new Date().toISOString(),
    note: "Equities, FX, gold futures, and Brent use the latest two Yahoo daily closes; US Treasuries use the official daily yield curve (bp vs prior print); BTC is CoinGecko 24h change; funding compares adjacent OKX prints. Snapshot captured at generate time — not live on the page.",
    groups,
  };
}

function injectIntoMarkdown(filePath, dashboard) {
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  const parsed = matter(raw);
  parsed.data.marketDashboard = dashboard;
  const next = matter.stringify(parsed.content || "\n", parsed.data);
  fs.writeFileSync(abs, next.endsWith("\n") ? next : `${next}\n`);
  console.log(`[market-closes] injected marketDashboard into ${abs}`);
}

async function main() {
  const args = process.argv.slice(2);
  const injectIdx = args.indexOf("--inject");
  const injectPath = injectIdx >= 0 ? args[injectIdx + 1] : null;

  const dashboard = await buildMarketDashboard();
  const rowCount = dashboard.groups.reduce((n, g) => n + g.rows.length, 0);
  console.log(
    `[market-closes] built ${dashboard.groups.length} groups / ${rowCount} rows asOf=${dashboard.asOf}`,
  );

  if (injectPath) {
    injectIntoMarkdown(injectPath, dashboard);
  } else {
    process.stdout.write(`${JSON.stringify(dashboard, null, 2)}\n`);
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(`[market-closes] ${err?.stack || err}`);
    process.exit(1);
  });
}

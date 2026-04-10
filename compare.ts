import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices, type Page } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OUTPUT_DIR = join(__dirname, "captures");
const INDEX_PATH = join(__dirname, "capture-comparison.html");

/** iPhone 13 모바일 컨텍스트 (Playwright 기기 프리셋) */
const iphone13 = devices["iPhone 13"];

const TARGETS: { name: string; slug: string; url: string }[] = [
  { name: "11번가", slug: "11st", url: "https://m.11st.co.kr/" },
  { name: "쿠팡", slug: "coupang", url: "https://m.coupang.com/" },
  { name: "G마켓", slug: "gmarket", url: "https://m.gmarket.co.kr/" },
  { name: "네이버쇼핑", slug: "naver-shopping", url: "https://m.shopping.naver.com/ns/home" },
  { name: "무신사", slug: "musinsa", url: "https://www.musinsa.com/" },
];

const ANTI_POPUP_CSS = `
[class*="popup"],
[class*="modal"],
[class*="layer"],
.dimmed {
  display: none !important;
}
`;

const SCROLL_UNLOCK_CSS = `
html, body {
  overflow: auto !important;
  position: static !important;
  height: auto !important;
}
`;

/** 접속 직후 팝업/레이어 숨김 + 스크롤 잠금 해제 스타일 주입 */
async function injectPopupSuppressStyles(page: Page): Promise<void> {
  await page.addStyleTag({ content: ANTI_POPUP_CSS + SCROLL_UNLOCK_CSS });
}

const CLOSE_TEXT_PATTERNS = [/닫기/, /오늘 하루 보지 않기/i, /close/i];

/** 닫기·오늘 하루 보지 않기·close 문구가 있는 버튼/링크를 순서대로 클릭 */
async function clickDismissButtons(page: Page): Promise<void> {
  for (const re of CLOSE_TEXT_PATTERNS) {
    const loc = page.locator(`button, a, [role="button"], input[type="button"]`).filter({ hasText: re });
    const n = await loc.count();
    const limit = Math.min(n, 8);
    for (let i = 0; i < limit; i++) {
      const el = loc.nth(i);
      try {
        if (await el.isVisible({ timeout: 400 })) {
          await el.click({ timeout: 2000, force: true });
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch {
        /* 가려졌거나 이미 사라짐 */
      }
    }
  }
}

/** 팝업 대기·숨김·닫기·스크롤 복구 후 캡처 가능 상태로 정리 */
async function preparePageForCapture(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await injectPopupSuppressStyles(page);
  /* 팝업이 뜨는 시간을 고려한 대기 후 닫기 시도 */
  await new Promise((r) => setTimeout(r, 2000));
  await clickDismissButtons(page);
  await injectPopupSuppressStyles(page);
  try {
    await page.waitForLoadState("networkidle", { timeout: 12_000 });
  } catch {
    /* 폴링 등으로 networkidle 생략 */
  }
  await new Promise((r) => setTimeout(r, 400));
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...iphone13,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });

  const results: { name: string; slug: string; file: string; ok: boolean; error?: string }[] = [];

  for (const t of TARGETS) {
    const fileName = `${t.slug}.png`;
    const filePath = join(OUTPUT_DIR, fileName);
    const page = await context.newPage();
    try {
      await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await preparePageForCapture(page);
      // ATF: 뷰포트 한 화면(GNB·상단·탭바 포함), 전체 페이지 스크롤 캡처 아님
      await page.screenshot({ path: filePath, fullPage: false });
      results.push({ name: t.name, slug: t.slug, file: `captures/${fileName}`, ok: true });
      console.log(`OK  ${t.name} → ${filePath}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name: t.name, slug: t.slug, file: `captures/${fileName}`, ok: false, error: msg });
      console.error(`FAIL ${t.name}: ${msg}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  const cards = results
    .map((r) => {
      const title = esc(r.name);
      const err = r.error ? `<p class="err">${esc(r.error)}</p>` : "";
      const img = r.ok
        ? `<div class="shot-wrap"><img src="${esc(r.file)}" alt="${title}" loading="lazy" /></div>`
        : `<div class="placeholder">캡처 실패</div>`;
      return `<section class="device-frame"><h2 class="device-title">${title}</h2>${img}${err}</section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>모바일 홈 ATF 비교 (iPhone 13 뷰포트)</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
      background: #e8e8e8;
      color: #1a1a1a;
    }
    h1 {
      margin: 0 0 20px;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      gap: 20px;
      align-items: flex-start;
      overflow-x: auto;
      padding-bottom: 16px;
      -webkit-overflow-scrolling: touch;
    }
    .device-frame {
      flex: 0 0 auto;
      width: ${iphone13.viewport.width}px;
      background: #ffffff;
      border: 1px solid #333333;
      border-radius: 14px;
      overflow: hidden;
    }
    .device-title {
      width: 100%;
      margin: 0;
      padding: 10px 12px;
      font-size: 1rem;
      font-weight: 600;
      text-align: center;
      line-height: 1.2;
      color: #111;
      background: #ffffff;
      border-bottom: 1px solid #e5e5e5;
    }
    .shot-wrap {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      overflow: hidden;
    }
    .shot-wrap img {
      display: block;
      width: 100%;
      height: auto;
      vertical-align: top;
      background: #ffffff;
    }
    .placeholder {
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #888;
      font-size: 0.9rem;
    }
    .err {
      margin: 0;
      padding: 8px 10px 12px;
      font-size: 0.75rem;
      color: #c62828;
      word-break: break-all;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <h1>모바일 홈 ATF 비교 · 뷰포트 ${iphone13.viewport.width}×${iphone13.viewport.height} (iPhone 13 프리셋)</h1>
  <div class="row">
${cards}
  </div>
</body>
</html>
`;

  writeFileSync(INDEX_PATH, html, "utf8");
  console.log(`\n대시보드: ${INDEX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

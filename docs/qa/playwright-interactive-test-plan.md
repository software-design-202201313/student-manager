# Playwright Interactive Browser Test Plan (Student Manager)

## 1) Scope
- Core flow: `landing -> login -> grade input/edit -> save -> radar chart`
- MVP checks:
  - score validation (`0~100`)
  - instant total/average update
  - auto 9-grade rank update
  - radar chart render + previous-semester comparison toggle

## 2) Environment
- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000/api/v1`
- Accounts:
  - teacher: `teacher@example.com / password123`
- Required:
  - Codex `js_repl` enabled
  - Playwright installed in `/frontend`
  - persistent dev server terminal (do not use one-shot background shell)

## 3) QA Inventory (Signoff Coverage)
- Claim A: login succeeds and redirects to dashboard
  - Functional check: login form submit, URL change to `/dashboard`
  - Visual check state: dashboard loaded after login
  - Evidence: dashboard screenshot + URL assertion log
- Claim B: invalid scores are blocked
  - Functional check: input `101` shows validation error
  - Visual check state: inline error visible near table
  - Evidence: validation screenshot
- Claim C: total/average update instantly after score edits
  - Functional check: update scores (`95`, `85`, then `80`) and verify totals (`180.0`, `175.0`) and averages (`90.0`, `87.5`)
  - Visual check state: grade table with updated summary values
  - Evidence: table screenshot + assertion logs
- Claim D: save persists grade changes
  - Functional check: click `성적 저장`, wait `POST/PUT /grades`, reload, verify value persists
  - Visual check state: same score still visible after reload
  - Evidence: post-save screenshot + network response assertion
- Claim E: radar chart and compare mode work
  - Functional check: switch to `레이더 차트`, enable `이전 학기와 비교`
  - Visual check state: chart labels and previous-semester legend visible
  - Evidence: chart screenshot
- Exploratory #1:
  - rapid edit + immediate save + reload (race timing sanity)
- Exploratory #2:
  - switch semester, return to current semester, verify edited values and chart stability

## 4) js_repl Bootstrap Cells
```javascript
var chromium;
var electronLauncher;
var browser;
var context;
var page;
var mobileContext;
var mobilePage;
var electronApp;
var appWindow;

({ chromium, _electron: electronLauncher } = await import("playwright"));
console.log("Playwright loaded");
```

```javascript
var resetWebHandles = function () {
  context = undefined;
  page = undefined;
  mobileContext = undefined;
  mobilePage = undefined;
};

var ensureWebBrowser = async function () {
  if (browser && !browser.isConnected()) {
    browser = undefined;
    resetWebHandles();
  }
  browser ??= await chromium.launch({ headless: false });
  return browser;
};

var reloadWebContexts = async function () {
  for (const currentContext of [context, mobileContext]) {
    if (!currentContext) continue;
    for (const p of currentContext.pages()) {
      await p.reload({ waitUntil: "domcontentloaded" });
    }
  }
  console.log("Reloaded existing web tabs");
};
```

```javascript
var TARGET_URL = "http://127.0.0.1:5173";

if (page?.isClosed()) page = undefined;
await ensureWebBrowser();
context ??= await browser.newContext({ viewport: { width: 1600, height: 900 } });
page ??= await context.newPage();
await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
console.log("Loaded:", await page.title());
```

## 5) Functional Runbook (Manual Interactive)
1. Go to `/login`, submit teacher credentials, verify `/dashboard`.
2. Open target student grade page (`/grades/:studentId`).
3. Enter `101` in first subject score input and verify validation text.
4. Edit scores to valid values (`95`, `85` then `80`) and verify total/average update.
5. Save grades and wait successful `POST/PUT /api/v1/grades`.
6. Reload and verify edited values persist.
7. Switch to `레이더 차트` tab and enable `이전 학기와 비교`.
8. Confirm subject labels + legend + export buttons are visible.
9. Run exploratory scenarios from inventory.

## 6) Visual QA Artifacts
- Save screenshots under:
  - `frontend/e2e-artifacts/playwright-interactive/login-dashboard.png`
  - `frontend/e2e-artifacts/playwright-interactive/grade-validation.png`
  - `frontend/e2e-artifacts/playwright-interactive/grade-summary.png`
  - `frontend/e2e-artifacts/playwright-interactive/grade-persisted.png`
  - `frontend/e2e-artifacts/playwright-interactive/radar-compare.png`

## 7) Fast Automated Verification (Fallback / CI-style)
```bash
cd /Users/jayden/Developer/student-manager/frontend
npx playwright test e2e/prd-user-stories.spec.ts --grep "US-001/US-002"
npx playwright test e2e/landing-login-grade.spec.ts
```

## 8) Cleanup
```javascript
if (electronApp) await electronApp.close().catch(() => {});
if (mobileContext) await mobileContext.close().catch(() => {});
if (context) await context.close().catch(() => {});
if (browser) await browser.close().catch(() => {});

browser = undefined;
context = undefined;
page = undefined;
mobileContext = undefined;
mobilePage = undefined;
electronApp = undefined;
appWindow = undefined;
```

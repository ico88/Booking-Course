import { existsSync } from "fs";

// Common system Chrome paths, tried when puppeteer's bundled binary is missing
const CHROME_PATHS_FALLBACK = [
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
];

function findChrome(puppeteer: { executablePath(): string }): string | undefined {
  // Prefer puppeteer's bundled browser
  try {
    const p = puppeteer.executablePath();
    if (p && existsSync(p)) return p;
  } catch { /* not available */ }

  // Fall back to any system Chrome
  return CHROME_PATHS_FALLBACK.find((p) => existsSync(p));
}

export async function generaPdfDaHtml(html: string): Promise<ArrayBuffer> {
  // webpackIgnore prevents webpack from bundling the native puppeteer binary package
  const { default: puppeteer } = await import(/* webpackIgnore: true */ "puppeteer");

  const executablePath = findChrome(puppeteer);
  if (!executablePath) {
    throw new Error(
      "Chrome non trovato. Installa Google Chrome oppure esegui: npx puppeteer browsers install chrome"
    );
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    // Copy Buffer into a plain ArrayBuffer for NextResponse BodyInit compatibility
    const ab = new ArrayBuffer(pdf.byteLength);
    new Uint8Array(ab).set(pdf);
    return ab;
  } finally {
    await browser.close();
  }
}

export async function generaPdfDaHtml(html: string): Promise<ArrayBuffer> {
  // webpackIgnore prevents webpack from bundling the native puppeteer binary package
  const { default: puppeteer } = await import(/* webpackIgnore: true */ "puppeteer");

  const browser = await puppeteer.launch({
    headless: true,
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

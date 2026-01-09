import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';

export const runtime = 'nodejs';

// Persistenter Browser auch bei HMR: globalThis nutzen
const __g: any = globalThis as any;
if (!__g.__TASKO_PDF_BROWSER__) __g.__TASKO_PDF_BROWSER__ = null;

// Globale, wiederverwendete Browser-Instanz (lokal/nicht-serverless sinnvoll)
let browserRef: import('puppeteer').Browser | null = __g.__TASKO_PDF_BROWSER__ as any;

async function getBrowser(_preferredHost?: string) {
  if (browserRef && (browserRef as any).isConnected?.()) return browserRef;

  // Browser starten (robuste Erkennung des Chrome-Pfads)
  const platform = process.platform; // 'darwin' | 'linux' | 'win32' ...
  // Serverless-Chromium nur auf Linux sinnvoll; auf macOS/Windows immer lokale Executable bevorzugen
  const preferServerlessChromium =
    platform === 'linux' &&
    Boolean(
      process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.VERCEL || process.env.NOW_REGION
    );
  const chromeFromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  const macCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/opt/homebrew/bin/chromium',
    '/usr/local/bin/chromium',
  ];
  async function resolveChromePath(): Promise<string | null> {
    const candidates: string[] = [];
    if (chromeFromEnv) candidates.push(chromeFromEnv);
    if (platform === 'darwin') candidates.push(...macCandidates);
    try {
      const anyP: any = puppeteer as any;
      if (typeof anyP.executablePath === 'function') {
        const p = await anyP.executablePath();
        if (p) candidates.unshift(p);
      }
    } catch {}
    for (const p of candidates) {
      try {
        if (p && fs.existsSync(p)) return p;
      } catch {}
    }
    return null;
  }

  // Hilfsfunktion: verschiedene Launch-Modi durchprobieren
  async function launchWithVariants(executablePath?: string) {
    const baseArgs = [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,BackForwardCache,AutomationControlled',
      '--remote-debugging-port=0',
      '--mute-audio',
      '--hide-scrollbars',
      '--window-size=1024,768',
    ];
    const variants: Array<Parameters<typeof puppeteer.launch>[0]> = [
      { headless: 'new' as any, pipe: true, args: baseArgs, executablePath },
      { headless: 'new' as any, pipe: false, args: baseArgs, executablePath },
      { headless: true, pipe: true as any, args: baseArgs, executablePath },
      { headless: true, pipe: false as any, args: baseArgs, executablePath },
    ];
    const errors: string[] = [];
    for (const v of variants) {
      try {
        return await puppeteer.launch(v as any);
      } catch (e: any) {
        errors.push(e?.message || String(e));
      }
    }
    throw new Error(
      'Puppeteer konnte nicht gestartet werden (alle Varianten fehlgeschlagen): ' +
        errors.join(' | ')
    );
  }

  try {
    // Priorität: System-Chrome, falls vorhanden (besonders in lokaler Entwicklung)
    const exe = await resolveChromePath();
    // 1) Bevorzuge immer explizite, vorhandene Chrome-Executable (egal ob Serverless-Env gesetzt)
    if (exe) {
      try {
        browserRef = await launchWithVariants(exe);
        __g.__TASKO_PDF_BROWSER__ = browserRef;
        return browserRef;
      } catch {}
    }
    // 2) Nicht-Linux: Standard-Puppeteer (gebundeltes Chromium) verwenden
    if (platform !== 'linux') {
      try {
        browserRef = await launchWithVariants();
        __g.__TASKO_PDF_BROWSER__ = browserRef;
        return browserRef;
      } catch {}
    }
    // 3) Linux-Serverless: @sparticuz/chromium + puppeteer-core
    if (preferServerlessChromium) {
      const chromium: any =
        (await import('@sparticuz/chromium')).default ?? (await import('@sparticuz/chromium'));
      const puppeteerCore: any = (await import('puppeteer-core')).default as unknown as any;
      const executablePath = await chromium.executablePath();
      // Für serverless nutzen wir puppeteer-core; pipe wird oft nicht unterstützt, daher ohne pipe beginnen
      const args = [
        ...(chromium.args || []),
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--remote-debugging-port=0',
      ];
      const variants: Array<Parameters<typeof puppeteerCore.launch>[0]> = [
        { headless: 'new' as any, args, executablePath },
        { headless: true, args, executablePath },
      ];
      for (const v of variants) {
        try {
          browserRef = await puppeteerCore.launch(v as any);
          break;
        } catch {}
      }
      if (!browserRef) throw new Error('puppeteer-core launch failed');
      __g.__TASKO_PDF_BROWSER__ = browserRef;
      return browserRef;
    }
    // 4) Fallback: letzter Versuch mit Standard-Puppeteer
    browserRef = await launchWithVariants();
    __g.__TASKO_PDF_BROWSER__ = browserRef;
  } catch (err) {
    browserRef = null;
    throw err;
  }

  // Safety: Browser bei Prozessende schließen (lokal)
  try {
    const onExit = () => {
      try {
        browserRef?.close();
        __g.__TASKO_PDF_BROWSER__ = null;
      } catch {}
    };
    process.once('exit', onExit);
    process.once('SIGINT', onExit);
    process.once('SIGTERM', onExit);
  } catch {}

  return browserRef;
}

export async function POST(req: NextRequest) {
  try {
    const { uid, quoteId, host, data } = (await req.json()) as {
      uid: string;
      quoteId: string;
      host?: string;
      data?: any; // Optional: Vorschau-Template-Daten
    };
    if (!uid || !quoteId) {
      return NextResponse.json({ error: 'uid und quoteId erforderlich' }, { status: 400 });
    }

    // Host bestimmen und Protokoll ableiten (lokal: http, prod: https)
    const headerHost = host || req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (!headerHost) return NextResponse.json({ error: 'Host nicht bestimmbar' }, { status: 400 });
    const xfProto = req.headers.get('x-forwarded-proto');
    const isLocal = /localhost|127\.0\.0\.1|:\d{2,5}$/.test(headerHost);
    const protocol = isLocal ? 'http://' : xfProto ? `${xfProto}://` : 'https://';

    // Ziel-URL bestimmen
    let url = `${protocol}${headerHost}/print/quote/${encodeURIComponent(uid)}/${encodeURIComponent(quoteId)}?auto=0`;
    // Vorschau-Daten (nicht gespeichertes Angebot) per payload anhängen
    if (quoteId === 'preview' && data) {
      try {
        const payload = encodeURIComponent(Buffer.from(JSON.stringify(data)).toString('base64'));
        url += `&payload=${payload}`;
      } catch {
        // Ignorieren – fällt auf Standard-URL zurück
      }
    }

    // Browser holen (ggf. bereits laufend)
    let browser: import('puppeteer').Browser | null = null;
    try {
      browser = await getBrowser(headerHost || undefined);
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Puppeteer konnte nicht gestartet werden', primary: err?.message || String(err) },
        { status: 500 }
      );
    }
    if (!browser) return NextResponse.json({ error: 'Kein Browser verfügbar' }, { status: 500 });

    async function attemptOnce(): Promise<NextResponse> {
      const page = await browser!.newPage();
      try {
        await page.setCacheEnabled(true);
      } catch {}
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      page.setDefaultNavigationTimeout(30000);

      // Cross-Origin blocken, nur Same-Origin zulassen (verhindert unnötige Delays)
      try {
        await page.setRequestInterception(true);
        const allowedHost = headerHost;
        page.on('request', req => {
          try {
            const u = new URL(req.url());
            const isSameOrigin = u.host === allowedHost;
            if (!isSameOrigin) return req.abort();
          } catch {}
          return req.continue();
        });
      } catch {}

      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = resp?.status() ?? 0;
      if (status >= 400) {
        try {
          await page.close();
        } catch {}
        throw new Error(`Print-Seite lieferte HTTP ${status}`);
      }
      await page.waitForSelector('.invoice-print-content [data-quote-template]', {
        timeout: 20000,
      });
      await page.waitForFunction(
        () => {
          const el = document.querySelector(
            '.invoice-print-content [data-quote-template]'
          ) as HTMLElement | null;
          if (!el) return false;
          const cs = getComputedStyle(el);
          const visible = cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0;
          return visible && el.offsetHeight > 200;
        },
        { timeout: 20000 }
      );

      try {
        await page.evaluate(() =>
          (document as any).fonts && (document as any).fonts.ready
            ? (document as any).fonts.ready
            : null
        );
      } catch {}

      await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map(img => {
            if ((img as any).complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise<void>(resolve => {
              const done = () => resolve();
              const to = setTimeout(done, 2500);
              img.addEventListener(
                'load',
                () => {
                  clearTimeout(to);
                  done();
                },
                { once: true }
              );
              img.addEventListener(
                'error',
                () => {
                  clearTimeout(to);
                  done();
                },
                { once: true }
              );
            });
          })
        );
      });
      await page.evaluate(() => {
        document.body.classList.add('print-page');
        const container = document.querySelector('.invoice-print-content') as HTMLElement | null;
        if (container) {
          container.style.margin = '0';
          container.style.padding = '0';
          container.style.background = '#fff';
          container.style.width = '794px';
          (container.style as any)['-webkit-print-color-adjust'] = 'exact';
        }
      });
      await page.emulateMediaType('print');

      const heuristics = await page.evaluate(() => {
        const el = document.querySelector(
          '.invoice-print-content [data-quote-template]'
        ) as HTMLElement | null;
        const textLen = el ? (el.innerText || '').trim().length : 0;
        const rect = el ? { w: el.offsetWidth, h: el.offsetHeight } : { w: 0, h: 0 };
        return { textLen, rect };
      });

      try {
        await (page as any).waitForTimeout?.(150);
      } catch {}
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      if (!pdfBuffer || pdfBuffer.byteLength < 5000 || (heuristics?.textLen ?? 0) < 20) {
        try {
          const handle = await page.$('.invoice-print-content [data-quote-template]');
          let png: Buffer | null = null;
          if (handle) png = (await handle.screenshot({ type: 'png' })) as Buffer;
          if (!png) png = (await page.screenshot({ fullPage: true, type: 'png' })) as Buffer;
          const { default: PDFDocument } = await import('pdfkit');
          const doc = new PDFDocument({ size: 'A4', margin: 0 });
          const chunks: Buffer[] = [];
          const done = new Promise<Buffer>((resolve, reject) => {
            doc
              .on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
              .on('end', () => resolve(Buffer.concat(chunks)))
              .on('error', reject);
          });
          doc.image(png, 0, 0, { width: 595.28, height: 841.89 });
          doc.end();
          const outBuf = await done;
          try {
            await page.close();
          } catch {}
          return new NextResponse(outBuf as any, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'inline; filename="angebot.pdf"',
            },
          });
        } catch {}
      }

      const arrayBuffer = pdfBuffer.buffer.slice(
        pdfBuffer.byteOffset,
        pdfBuffer.byteOffset + pdfBuffer.byteLength
      );
      try {
        await page.close();
      } catch {}
      return new NextResponse(arrayBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="angebot.pdf"',
        },
      });
    }

    // bis zu zwei Versuche (Hot-Reload/Timing-Fehler abfedern)
    try {
      return await attemptOnce();
    } catch (e1: any) {
      // kurzer Backoff und zweiter Versuch mit frischer Seite
      try {
        await new Promise(r => setTimeout(r, 400));
      } catch {}
      try {
        return await attemptOnce();
      } catch (e2: any) {
        return NextResponse.json(
          { error: e2?.message || e1?.message || 'PDF-Renderfehler' },
          { status: 500 }
        );
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'PDF-Renderfehler' }, { status: 500 });
  }
}

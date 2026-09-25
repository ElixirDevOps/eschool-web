import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PICTURES_DIR = resolve(process.cwd(), '.constat', 'pictures');

/**
 * The same slug rule Constat's check-report script uses to find a picture: the check's full
 * `describe > it` name, lower-cased, every run of non-alphanumerics folded to one dash.
 */
export function pictureSlug(checkName: string): string {
  return checkName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Drives the real browser on the runner and writes `.constat/pictures/<slug>.png`. */
export function takePicture(
  checkName: string,
  target: string,
  options: { width?: number; height?: number; extraArgs?: string[] } = {},
): string {
  mkdirSync(PICTURES_DIR, { recursive: true });
  const out = join(PICTURES_DIR, `${pictureSlug(checkName)}.png`);
  const profile = mkdtempSync(join(tmpdir(), 'constat-chrome-'));
  execFileSync(
    process.env.CHROME_BIN ?? 'google-chrome',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      `--user-data-dir=${profile}`,
      `--window-size=${options.width ?? 1100},${options.height ?? 760}`,
      ...(options.extraArgs ?? []),
      `--screenshot=${out}`,
      target,
    ],
    { stdio: 'ignore', timeout: 90_000 },
  );
  return out;
}

/** Writes an HTML document to a temporary file and photographs it. */
export function takePictureOfHtml(
  checkName: string,
  html: string,
  options: { width?: number; height?: number } = {},
): string {
  const dir = mkdtempSync(join(tmpdir(), 'constat-screen-'));
  const file = join(dir, 'screen.html');
  writeFileSync(file, html, 'utf8');
  return takePicture(checkName, `file://${file}`, options);
}

/** Wraps rendered markup in a plain document so the picture shows the app's own styling. */
export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
${STYLE}</head><body>${body}</body></html>`;
}

export const STYLE = `<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 40px; background: #f4f5f7; color: #16181d;
         font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main, section.card { max-width: 460px; margin: 0 auto 24px; background: #fff; padding: 28px 32px;
         border: 1px solid #dfe2e8; border-radius: 12px; box-shadow: 0 1px 3px rgba(16,18,29,.06); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; }
  p { margin: 0 0 16px; color: #4b5563; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 9px 11px; font-size: 15px;
          border: 1px solid #cbd2dc; border-radius: 7px; background: #fff; }
  button { margin-top: 18px; width: 100%; padding: 10px; font-size: 15px; font-weight: 600;
           color: #fff; background: #1f2937; border: 0; border-radius: 7px; }
  .error { margin: 0 0 4px; padding: 11px 13px; border-radius: 8px; background: #fdecec;
           border: 1px solid #f3b6b6; color: #8c1c1c; font-size: 14px; }
  .notice { padding: 11px 13px; border-radius: 8px; background: #eef6ff; border: 1px solid #bcd9f5;
            color: #1b4b7a; font-size: 14px; }
  dl { margin: 0; display: grid; grid-template-columns: 34% 1fr; gap: 8px 12px; font-size: 15px; }
  dt { color: #6b7280; } dd { margin: 0; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  td { border-top: 1px solid #e6e9ee; padding: 6px 8px; vertical-align: top;
       font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  td:first-child { color: #6b7280; white-space: nowrap; }
  .lock { font-size: 13px; color: #6b7280; margin: 0; }
</style>`;

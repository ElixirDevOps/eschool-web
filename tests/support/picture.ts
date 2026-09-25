import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { APP_STYLE } from '../../app/styles';

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

/** Wraps rendered markup in the app's own document, so a picture shows the real screen. */
export function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>${APP_STYLE}</style></head><body>${body}</body></html>`;
}

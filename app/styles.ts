/** The app's own styling. The checks that take pictures render it too, so a picture shows the
 *  screen a person would actually see rather than unstyled markup. */
export const APP_STYLE = `
  :root { color-scheme: light; }
  body { margin: 0; padding: 40px; background: #f4f5f7; color: #16181d;
         font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main, section.card { max-width: 460px; margin: 0 auto 24px; background: #fff; padding: 28px 32px;
         border: 1px solid #dfe2e8; border-radius: 12px; box-shadow: 0 1px 3px rgba(16,18,29,.06); }
  h1 { font-size: 22px; margin: 0 0 6px; }
  h2 { font-size: 13px; margin: 0 0 14px; text-transform: uppercase; letter-spacing: .07em; color: #6b7280; }
  p { margin: 0 0 16px; color: #4b5563; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 6px; color: #16181d; }
  input { width: 100%; box-sizing: border-box; padding: 9px 11px; font-size: 15px;
          border: 1px solid #cbd2dc; border-radius: 7px; background: #fff; }
  button { margin-top: 20px; width: 100%; padding: 10px; font-size: 15px; font-weight: 600;
           color: #fff; background: #1f2937; border: 0; border-radius: 7px; }
  .error { margin: 0 0 4px; padding: 11px 13px; border-radius: 8px; background: #fdecec;
           border: 1px solid #f3b6b6; color: #8c1c1c; font-size: 14px; }
  .notice { padding: 11px 13px; border-radius: 8px; background: #eef6ff; border: 1px solid #bcd9f5;
            color: #1b4b7a; font-size: 14px; margin: 14px 0 0; }
  dl { margin: 0; display: grid; grid-template-columns: 34% 1fr; gap: 9px 12px; font-size: 15px; }
  dt { color: #6b7280; } dd { margin: 0; font-weight: 600; }
  table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
  td { border-top: 1px solid #e6e9ee; padding: 6px 8px; vertical-align: top;
       font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  td:first-child { color: #6b7280; white-space: nowrap; }
  .lock { font-size: 13px; color: #6b7280; margin: 16px 0 0; }
`;

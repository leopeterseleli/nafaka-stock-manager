export type Row = Record<string, string | number | null | undefined>;

/** Excel-friendly CSV download (opens directly in Excel). */
export function exportToExcel(filename: string, rows: Row[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens the browser print dialog — users choose "Save as PDF". */
export function printDocument(title: string, innerHtml: string) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;color:#1c2b22;padding:28px;max-width:760px;margin:auto}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.08em;color:#4c6b58}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{border-bottom:1px solid #e2e6e0;padding:8px 6px;text-align:left}
  th{background:#f4f6f1;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
  td.num,th.num{text-align:right}
  .muted{color:#6b7d72;font-size:12px}
  .total{font-weight:700}
</style></head><body>${innerHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

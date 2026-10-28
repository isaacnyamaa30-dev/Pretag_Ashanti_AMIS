"use client";

import { useEffect } from "react";

/**
 * Screen-only controls for a printable report. With `autoPrint` the browser's
 * own print dialogue opens once the page has rendered - from there the user
 * picks a printer, paper size, orientation or "Save as PDF".
 */
export function PrintToolbar({ autoPrint = false, backHref }: { autoPrint?: boolean; backHref: string }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="no-print mb-5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="font-mono text-xs font-bold uppercase tracking-wide btn-3d px-4 py-2"
      >
        <span aria-hidden>&#9113; </span>Print / Save as PDF
      </button>
      <a
        href={backHref}
        className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-2"
      >
        &larr; Back to Zonal Membership Export
      </a>
      <span className="font-mono text-[11px] text-ink-3">
        In the print window choose your printer, or &ldquo;Save as PDF&rdquo;, and the paper size / orientation.
      </span>
    </div>
  );
}

/** Page set-up for a printable report: A4, margins, running footer with page
 *  numbers (Chrome / Edge page-margin boxes), and the app shell collapsed so
 *  only the report prints. `footer` must be plain text. */
export function PrintPageStyle({ landscape, footer }: { landscape: boolean; footer: string }) {
  const safe = footer.replace(/["\\]/g, "");
  const css = `
@page {
  size: A4 ${landscape ? "landscape" : "portrait"};
  margin: 12mm 11mm 15mm 11mm;
  @bottom-left { content: "${safe}"; font: 8pt Arial, sans-serif; color: #555; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, sans-serif; color: #555; }
}
@media print {
  .app-shell { display: block !important; min-height: 0 !important; }
  .print-doc { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .print-doc table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .print-doc thead { display: table-header-group; }
  .print-doc th { background: #c4161c !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-doc tr { break-inside: avoid; page-break-inside: avoid; }
  .print-doc .keep { break-inside: avoid; page-break-inside: avoid; }
  .print-doc .total-row td { background: #f7efd5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

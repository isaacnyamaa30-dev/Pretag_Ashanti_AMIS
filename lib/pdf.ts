/**
 * A small cursor-based PDF builder on top of pdf-lib - enough to lay out the
 * kind of structured report PRETAG tables at a REC / NEC meeting: a title, a
 * few headings, wrapped paragraphs and simple tables, with automatic page
 * breaks. pdf-lib is pure JS (no native binaries, no headless browser), so it
 * runs inside a normal serverless function.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.08, 0.07, 0.05);
const MUTED = rgb(0.38, 0.34, 0.28);
const BRAND = rgb(0.77, 0.09, 0.11);
const HEAD_FILL = rgb(0.96, 0.93, 0.86);
const RULE = rgb(0.8, 0.74, 0.55);

export type PdfColumn = { header: string; width: number; align?: "left" | "right" };

export class PdfReport {
  private doc!: PDFDocument;
  private font!: PDFFont;
  private bold!: PDFFont;
  private italic!: PDFFont;
  private page!: PDFPage;
  private y = 0;

  static async create() {
    const r = new PdfReport();
    r.doc = await PDFDocument.create();
    r.font = await r.doc.embedFont(StandardFonts.Helvetica);
    r.bold = await r.doc.embedFont(StandardFonts.HelveticaBold);
    r.italic = await r.doc.embedFont(StandardFonts.HelveticaOblique);
    r.newPage();
    return r;
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  private ensure(space: number) {
    if (this.y - space < MARGIN) this.newPage();
  }

  private draw(text: string, size: number, font: PDFFont, color = INK, x = MARGIN) {
    this.page.drawText(text, { x, y: this.y - size, size, font, color });
  }

  private wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const wordRaw of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${wordRaw}` : wordRaw;
        if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
          lines.push(line);
          line = wordRaw;
        } else {
          line = next;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  private clip(text: string, font: PDFFont, size: number, maxWidth: number): string {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
  }

  spacer(h = 10) {
    this.y -= h;
  }

  title(main: string, kicker?: string) {
    if (kicker) {
      this.ensure(14);
      this.draw(kicker.toUpperCase(), 8, this.bold, BRAND);
      this.y -= 14;
    }
    for (const line of this.wrap(main, this.bold, 18, CONTENT_W)) {
      this.ensure(24);
      this.draw(line, 18, this.bold);
      this.y -= 24;
    }
    this.y -= 4;
  }

  heading(text: string) {
    this.ensure(28);
    this.y -= 10;
    this.draw(text.toUpperCase(), 11, this.bold);
    this.y -= 16;
  }

  paragraph(text: string, opts: { size?: number; color?: typeof INK; italic?: boolean } = {}) {
    const size = opts.size ?? 10;
    const color = opts.color ?? INK;
    const font = opts.italic ? this.italic : this.font;
    for (const line of this.wrap(text, font, size, CONTENT_W)) {
      this.ensure(size * 1.5);
      this.draw(line, size, font, color);
      this.y -= size * 1.5;
    }
    this.y -= 4;
  }

  rule() {
    this.ensure(8);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 1,
      color: BRAND,
    });
    this.y -= 12;
  }

  table(columns: PdfColumn[], rows: string[][]) {
    const size = 9;
    const rowH = 16;
    const xs: number[] = [];
    let acc = MARGIN;
    for (const c of columns) {
      xs.push(acc);
      acc += c.width;
    }
    const totalW = acc - MARGIN;

    const drawRow = (cells: string[], font: PDFFont, fill?: boolean) => {
      this.ensure(rowH);
      if (fill) {
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - rowH + 3,
          width: totalW,
          height: rowH,
          color: HEAD_FILL,
        });
      }
      cells.forEach((cell, i) => {
        const col = columns[i];
        const text = this.clip(cell ?? "", font, size, col.width - 8);
        const w = font.widthOfTextAtSize(text, size);
        const x = col.align === "right" ? xs[i] + col.width - 8 - w : xs[i] + 4;
        this.page.drawText(text, { x, y: this.y - size - 1, size, font, color: INK });
      });
      this.y -= rowH;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y + 3 },
        end: { x: MARGIN + totalW, y: this.y + 3 },
        thickness: 0.5,
        color: RULE,
      });
    };

    drawRow(columns.map((c) => c.header), this.bold, true);
    for (const r of rows) drawRow(r, this.font);
    this.y -= 6;
  }

  footnote(text: string) {
    this.y -= 8;
    this.ensure(20);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.5,
      color: RULE,
    });
    this.y -= 12;
    for (const line of this.wrap(text, this.font, 7.5, CONTENT_W)) {
      this.ensure(11);
      this.draw(line, 7.5, this.font, MUTED);
      this.y -= 11;
    }
  }

  /** Page x of y, centred, on every page. Call last. */
  private paginate() {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const label = `Page ${i + 1} of ${pages.length}`;
      const w = this.font.widthOfTextAtSize(label, 7.5);
      p.drawText(label, { x: (PAGE_W - w) / 2, y: MARGIN - 20, size: 7.5, font: this.font, color: MUTED });
    });
  }

  async toBuffer(): Promise<Buffer> {
    this.paginate();
    return Buffer.from(await this.doc.save());
  }
}

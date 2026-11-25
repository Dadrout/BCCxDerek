"use client";
import { useEffect, useRef, useState } from "react";

export type Highlight = { needle: string; color: "red" | "green" | "amber" };

const COLORS = {
  red: "rgba(179,38,30,0.22)",
  green: "rgba(18,104,79,0.22)",
  amber: "rgba(214,140,20,0.26)",
};
const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();

export default function PdfView({ src, highlights, emptyText }: { src: string | null; highlights: Highlight[]; emptyText: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boxes, setBoxes] = useState<{ x: number; y: number; w: number; h: number; color: string }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const key = JSON.stringify(highlights);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument(src).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = 640 / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = "100%";
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
      setSize({ w: viewport.width, h: viewport.height });
      const content = await page.getTextContent();
      const found: typeof boxes = [];
      for (const h of JSON.parse(key) as Highlight[]) {
        const needle = norm(h.needle);
        if (needle.length < 6) continue;
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const s = norm(item.str);
          if (!s || !(s.includes(needle) || (needle.includes(s) && s.length > 12))) continue;
          const tx = pdfjs.Util.transform(viewport.transform, item.transform);
          const fh = Math.hypot(tx[2], tx[3]);
          found.push({ x: tx[4] - 3, y: tx[5] - fh - 2, w: item.width * scale + 6, h: fh + 6, color: COLORS[h.color] });
          break;
        }
      }
      setBoxes(found);
    })().catch(() => setBoxes([]));
    return () => { cancelled = true; };
  }, [src, key]);

  if (!src) return <div className="flex aspect-[1/1.414] w-full items-center justify-center rounded-[4px] border border-dashed border-ink-3/50 px-6 text-center text-[14px] text-ink-3">{emptyText}</div>;
  return (
    <div className="relative overflow-hidden rounded-[4px] bg-white shadow-[0_1px_2px_rgba(21,32,43,0.1),0_10px_30px_-14px_rgba(21,32,43,0.3)]">
      <canvas ref={canvasRef} className="block" />
      {size.w > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none">
          {boxes.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={b.color} stroke={b.color.replace(/0\.2\d/, "0.9")} strokeWidth={1.5} />
          ))}
        </svg>
      )}
    </div>
  );
}

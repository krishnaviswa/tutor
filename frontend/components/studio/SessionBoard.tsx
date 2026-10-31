"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { api } from "@/lib/api";
import "./studio.css";

type Tool = "pencil" | "eraser" | "text" | "pointer" | "crop";

type Stroke = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

type TextBox = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  face: "sans";
  size: 18;
};

type Placement = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src?: string;
  storage_path?: string;
  content_id?: string;
  crop?: { x: number; y: number; w: number; h: number };
  file_name?: string;
};

type BoardDoc = {
  strokes: Stroke[];
  texts: TextBox[];
  placements: Placement[];
  erases: { id: string; x: number; y: number }[];
  updated_at?: string;
};

const VIEW_W = 1600;
const VIEW_H = 1000;
const POLL_MS = 4000;
const TEXT_FACE = "sans" as const;
const TEXT_SIZE = 18;

const COLORS = [
  { name: "black", hex: "#1d1d1f" },
  { name: "white", hex: "#f5f5f7" },
  { name: "red", hex: "#ff3b30" },
  { name: "orange", hex: "#ff9500" },
  { name: "yellow", hex: "#ffcc00" },
  { name: "green", hex: "#34c759" },
  { name: "blue", hex: "#0071e3" },
  { name: "purple", hex: "#af52de" },
  { name: "brown", hex: "#8d6e63" },
  { name: "gray", hex: "#8e8e93" },
] as const;

const emptyDoc = (): BoardDoc => ({ strokes: [], texts: [], placements: [], erases: [] });

function boardPath(sessionId: string) {
  return `/api/v1/sessions/${encodeURIComponent(sessionId)}/board`;
}

function paint(color: string) {
  return COLORS.find((c) => c.name === color)?.hex || color || "#1d1d1f";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function asDoc(body: unknown): BoardDoc {
  const raw = isRecord(body) ? body : {};
  const strokes = Array.isArray(raw.strokes) ? (raw.strokes.filter(isRecord) as Stroke[]) : [];
  const texts = Array.isArray(raw.texts) ? (raw.texts.filter(isRecord) as TextBox[]) : [];
  const placements = Array.isArray(raw.placements) ? (raw.placements.filter(isRecord) as Placement[]) : [];
  const erases = Array.isArray(raw.erases) ? (raw.erases.filter(isRecord) as BoardDoc["erases"]) : [];
  return { strokes, texts, placements, erases, updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined };
}

function pointOf(event: PointerEvent<SVGSVGElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
  return { x: Math.max(0, Math.min(VIEW_W, x)), y: Math.max(0, Math.min(VIEW_H, y)) };
}

function nearStroke(stroke: Stroke, x: number, y: number) {
  const dx = stroke.x2 - stroke.x1;
  const dy = stroke.y2 - stroke.y1;
  const len = Math.hypot(dx, dy) || 1;
  const t = Math.max(0, Math.min(1, ((x - stroke.x1) * dx + (y - stroke.y1) * dy) / (len * len)));
  const px = stroke.x1 + t * dx;
  const py = stroke.y1 + t * dy;
  return Math.hypot(px - x, py - y) < 18;
}

export function SessionBoard({ sessionId }: { sessionId: string }) {
  const [doc, setDoc] = useState<BoardDoc>(emptyDoc);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState<string>("black");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const docRef = useRef(doc);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const selectedRef = useRef(selected);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  docRef.current = doc;
  toolRef.current = tool;
  colorRef.current = color;
  selectedRef.current = selected;

  useEffect(() => {
    let stop = false;
    async function pull() {
      if (dirty.current || drawing.current) return;
      try {
        const body = await api(boardPath(sessionId));
        if (!stop && !dirty.current) setDoc(asDoc(body));
      } catch (err) {
        if (!stop) setStatus(err instanceof Error ? err.message : String(err));
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  function update(next: BoardDoc) {
    dirty.current = true;
    docRef.current = next;
    setDoc(next);
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    const p = pointOf(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (toolRef.current === "pointer") {
      const hit = [...docRef.current.placements].reverse().find(
        (item) => p.x >= item.x && p.x <= item.x + item.w && p.y >= item.y && p.y <= item.y + item.h,
      );
      if (hit) {
        setSelected(hit.id);
        drag.current = { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y };
      } else {
        setSelected(null);
      }
      return;
    }
    if (toolRef.current === "text") {
      const text = window.prompt("Text");
      if (!text) return;
      update({
        ...docRef.current,
        texts: [
          ...docRef.current.texts,
          { id: crypto.randomUUID(), x: p.x, y: p.y, text, color: colorRef.current, face: TEXT_FACE, size: TEXT_SIZE },
        ],
      });
      return;
    }
    if (toolRef.current === "crop") {
      const hit = docRef.current.placements.find((item) => item.id === selectedRef.current);
      if (!hit) return;
      const crop = {
        x: Math.max(0, Math.min(1, (p.x - hit.x) / hit.w)),
        y: Math.max(0, Math.min(1, (p.y - hit.y) / hit.h)),
        w: 0.5,
        h: 0.5,
      };
      update({
        ...docRef.current,
        placements: docRef.current.placements.map((item) => (item.id === hit.id ? { ...item, crop } : item)),
      });
      return;
    }
    drawing.current = true;
    last.current = p;
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const p = pointOf(event);
    if (drag.current && toolRef.current === "pointer") {
      const { id, dx, dy } = drag.current;
      update({
        ...docRef.current,
        placements: docRef.current.placements.map((item) =>
          item.id === id ? { ...item, x: p.x - dx, y: p.y - dy } : item,
        ),
      });
      return;
    }
    if (!drawing.current || !last.current) return;
    if (toolRef.current === "eraser") {
      update({
        ...docRef.current,
        strokes: docRef.current.strokes.filter((stroke) => !nearStroke(stroke, p.x, p.y)),
        texts: docRef.current.texts.filter((box) => Math.hypot(box.x - p.x, box.y - p.y) > 28),
        erases: [...docRef.current.erases, { id: crypto.randomUUID(), x: p.x, y: p.y }],
      });
      last.current = p;
      return;
    }
    if (toolRef.current !== "pencil") return;
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      x1: last.current.x,
      y1: last.current.y,
      x2: p.x,
      y2: p.y,
      color: colorRef.current,
    };
    last.current = p;
    update({ ...docRef.current, strokes: [...docRef.current.strokes, stroke] });
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    drawing.current = false;
    last.current = null;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const id = crypto.randomUUID();
    let src: string | undefined;
    if (file.type.startsWith("image/") && file.size < 1_500_000) {
      src = await file.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        bytes.forEach((b) => {
          binary += String.fromCharCode(b);
        });
        return `data:${file.type};base64,${btoa(binary)}`;
      });
    }
    update({
      ...docRef.current,
      placements: [
        ...docRef.current.placements,
        {
          id,
          name: file.name,
          kind: file.type || "file",
          x: 80,
          y: 80,
          w: 720,
          h: 480,
          src,
          file_name: file.name,
        },
      ],
    });
    setSelected(id);
    setTool("pointer");
  }

  function removeSelected() {
    if (!selected) return;
    update({
      ...docRef.current,
      placements: docRef.current.placements.filter((item) => item.id !== selected),
    });
    setSelected(null);
  }

  async function saveBoard() {
    const snapshot = docRef.current;
    setSaving(true);
    setStatus("");
    try {
      const saved = asDoc(
        await api(boardPath(sessionId), {
          method: "PUT",
          body: JSON.stringify({
            strokes: snapshot.strokes,
            texts: snapshot.texts,
            placements: snapshot.placements,
            erases: snapshot.erases,
          }),
        }),
      );
      setDoc(saved);
      dirty.current = false;
      setStatus("Saved");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio-board">
      <div className="studio-toolbar" role="toolbar" aria-label="Board tools">
        {(["pencil", "eraser", "text", "pointer", "crop"] as Tool[]).map((name) => (
          <button
            key={name}
            type="button"
            className="studio-btn"
            aria-pressed={tool === name}
            onClick={() => setTool(name)}
          >
            {name}
          </button>
        ))}
        <div className="studio-pens">
          {COLORS.map((pen) => (
            <button
              key={pen.name}
              type="button"
              className="studio-pen"
              style={{ background: pen.hex }}
              aria-label={pen.name}
              aria-pressed={color === pen.name}
              onClick={() => setColor(pen.name)}
            />
          ))}
        </div>
        <label className="studio-btn">
          Upload
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.svg"
            hidden
            onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" className="studio-btn" onClick={removeSelected} disabled={!selected}>
          Remove file
        </button>
        <button type="button" className="studio-btn studio-btn--primary" onClick={() => void saveBoard()} disabled={saving}>
          Save
        </button>
        <p className="studio-status" role="status">
          {status}
        </p>
      </div>
      <div className="studio-surface">
        <svg
          className="studio-surface__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Class whiteboard"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <rect width={VIEW_W} height={VIEW_H} fill="var(--surface)" />
          {doc.placements.map((item) => {
            const crop = item.crop;
            return (
              <g key={item.id} transform={`translate(${item.x} ${item.y})`}>
                <rect
                  width={item.w}
                  height={item.h}
                  fill="var(--sunk)"
                  stroke={selected === item.id ? "var(--accent)" : "var(--line)"}
                  strokeWidth={selected === item.id ? 4 : 1}
                />
                {item.src ? (
                  <image
                    href={item.src}
                    width={item.w}
                    height={item.h}
                    preserveAspectRatio="xMidYMid slice"
                    style={
                      crop
                        ? { clipPath: `inset(${crop.y * 100}% ${(1 - crop.x - crop.w) * 100}% ${(1 - crop.y - crop.h) * 100}% ${crop.x * 100}%)` }
                        : undefined
                    }
                  />
                ) : (
                  <text x={16} y={36} fill="var(--ink)" fontSize={28} fontFamily="sans-serif">
                    {item.name}
                  </text>
                )}
              </g>
            );
          })}
          {doc.strokes.map((stroke) => (
            <line
              key={stroke.id}
              x1={stroke.x1}
              y1={stroke.y1}
              x2={stroke.x2}
              y2={stroke.y2}
              stroke={paint(stroke.color)}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
          {doc.texts.map((box) => (
            <text
              key={box.id}
              x={box.x}
              y={box.y}
              fill={paint(box.color)}
              fontSize={TEXT_SIZE}
              fontFamily="sans-serif"
            >
              {box.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

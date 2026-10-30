"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import "./studio.css";

export type Stroke = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

export type SessionBoardProps = {
  sessionId: string;
};

type BoardPayload = {
  strokes?: unknown;
  updated_at?: string;
};

type Point = { x: number; y: number };

const VIEW_W = 1600;
const VIEW_H = 1000;
const POLL_MS = 4000;

const PENS = [
  { id: "ink", label: "Ink", color: "var(--ink)" },
  { id: "blue", label: "Blue", color: "#0071E3" },
  { id: "red", label: "Red", color: "#FF3B30" },
] as const;

function boardPath(sessionId: string) {
  return `/api/v1/sessions/${encodeURIComponent(sessionId)}/board`;
}

function errText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function isStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Stroke;
  return (
    typeof stroke.id === "string" &&
    typeof stroke.x1 === "number" &&
    typeof stroke.y1 === "number" &&
    typeof stroke.x2 === "number" &&
    typeof stroke.y2 === "number" &&
    typeof stroke.color === "string"
  );
}

function normalizeStrokes(body: unknown): Stroke[] {
  const strokes = (body as BoardPayload | null)?.strokes;
  if (!Array.isArray(strokes)) return [];
  return strokes.filter(isStroke);
}

function sameStrokeIds(a: Stroke[], b: Stroke[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, max: number) {
  return Math.max(0, Math.min(max, n));
}

export function SessionBoard({ sessionId }: SessionBoardProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState<string>(PENS[0].color);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const strokesRef = useRef<Stroke[]>([]);
  const colorRef = useRef(color);
  const drawingRef = useRef(false);
  const dirtyRef = useRef(false);
  const movedRef = useRef(false);
  const lastRef = useRef<Point | null>(null);
  const syncGen = useRef(0);

  colorRef.current = color;

  useEffect(() => {
    let cancelled = false;
    drawingRef.current = false;
    dirtyRef.current = false;
    lastRef.current = null;
    strokesRef.current = [];
    setStrokes([]);
    setStatus("");

    async function pull() {
      const genAtStart = syncGen.current;
      try {
        const body = await api(boardPath(sessionId));
        if (cancelled || genAtStart !== syncGen.current) return;
        // A poll must not cut through an in-progress stroke or unsaved marks.
        if (drawingRef.current || dirtyRef.current) return;
        const next = normalizeStrokes(body);
        if (!sameStrokeIds(strokesRef.current, next)) {
          strokesRef.current = next;
          setStrokes(next);
        }
        setStatus((prev) => (prev && prev !== "Saved" ? "" : prev));
      } catch (err) {
        if (!cancelled && genAtStart === syncGen.current) setStatus(errText(err));
      }
    }

    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  function commitLocal(next: Stroke[]) {
    strokesRef.current = next;
    dirtyRef.current = true;
    setStrokes(next);
    setStatus("");
  }

  function pointFromEvent(event: React.PointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width ? ((event.clientX - rect.left) / rect.width) * VIEW_W : 0;
    const y = rect.height ? ((event.clientY - rect.top) / rect.height) * VIEW_H : 0;
    return { x: clamp(x, VIEW_W), y: clamp(y, VIEW_H) };
  }

  function appendStroke(from: Point, to: Point) {
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      x1: round(from.x),
      y1: round(from.y),
      x2: round(to.x),
      y2: round(to.y),
      color: colorRef.current,
    };
    commitLocal(strokesRef.current.concat(stroke));
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    movedRef.current = false;
    lastRef.current = pointFromEvent(event);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current || !lastRef.current) return;
    const next = pointFromEvent(event);
    const last = lastRef.current;
    const dx = next.x - last.x;
    const dy = next.y - last.y;
    if (dx * dx + dy * dy < 1) return;
    movedRef.current = true;
    appendStroke(last, next);
    lastRef.current = next;
  }

  function onPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return;
    const last = lastRef.current;
    if (last && !movedRef.current) {
      const x2 = last.x > VIEW_W - 0.8 ? last.x - 0.8 : last.x + 0.8;
      const y2 = last.y > VIEW_H - 0.8 ? last.y - 0.8 : last.y + 0.8;
      appendStroke(last, { x: x2, y: y2 });
    }
    drawingRef.current = false;
    lastRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clearBoard() {
    drawingRef.current = false;
    lastRef.current = null;
    commitLocal([]);
  }

  async function saveBoard() {
    const snapshot = strokesRef.current.slice();
    syncGen.current += 1;
    setSaving(true);
    setStatus("");
    try {
      await api(boardPath(sessionId), {
        method: "PUT",
        body: JSON.stringify({ strokes: snapshot }),
      });
      // Drop a poll that left before this PUT and would paint the previous snapshot.
      syncGen.current += 1;
      if (sameStrokeIds(strokesRef.current, snapshot)) dirtyRef.current = false;
      setStatus("Saved");
    } catch (err) {
      setStatus(errText(err));
    } finally {
      setSaving(false);
    }
  }

  const saved = status === "Saved";

  return (
    <div className="studio-board">
      <div className="studio-toolbar" role="toolbar" aria-label="Board tools">
        <div className="studio-pens">
          {PENS.map((pen) => (
            <button
              key={pen.id}
              type="button"
              className={`studio-pen studio-pen--${pen.id}`}
              aria-label={pen.label}
              aria-pressed={color === pen.color}
              onClick={() => setColor(pen.color)}
            />
          ))}
        </div>
        <p
          className={saved ? "studio-status studio-status--ok" : "studio-status"}
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
        <div className="studio-actions">
          <button type="button" className="studio-btn" aria-label="Clear board" onClick={clearBoard}>
            Clear
          </button>
          <button
            type="button"
            className="studio-btn studio-btn--primary"
            aria-label="Save board"
            onClick={() => void saveBoard()}
            disabled={saving}
          >
            Save
          </button>
        </div>
      </div>
      <div className="studio-surface">
        <svg
          className="studio-surface__svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Class whiteboard"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <rect width={VIEW_W} height={VIEW_H} fill="var(--surface)" />
          {strokes.map((stroke) => (
            <line
              key={stroke.id}
              x1={stroke.x1}
              y1={stroke.y1}
              x2={stroke.x2}
              y2={stroke.y2}
              strokeWidth={2.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: stroke.color }}
            />
          ))}
        </svg>
        {strokes.length === 0 ? (
          <p className="studio-hint">Draw on the board. It stays with this class.</p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
import { api } from "@/lib/api";
import "./studio.css";

type Tool = "pen" | "eraser" | "text" | "laser" | "crop";
type StageMode = "blank" | "material";
type DocKind = "image" | "pdf" | "pptx" | "text" | "office" | "empty";

type Crop = { x: number; y: number; w: number; h: number };

type Stroke = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  group?: string;
  surface?: string;
};

type TextBox = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  face: "sans";
  size: 18;
  surface?: string;
};

type Placement = {
  id: string;
  name: string;
  kind: string;
  content_id?: string;
  file_kind?: string;
  file_name?: string;
  filename?: string;
  body?: string;
  notes?: string[];
  mode?: StageMode;
  blank_crop?: Crop;
  material_crop?: Crop;
  storage_path?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

type BoardDoc = {
  strokes: Stroke[];
  texts: TextBox[];
  placements: Placement[];
  erases: { id: string; x: number; y: number }[];
  updated_at?: string;
};

type LibraryRow = { id: string; title: string; file_kind?: string; filename?: string };

type OpenedFile = {
  url: string;
  mime: string;
  filename: string;
  fileKind: string;
  title: string;
  body: string;
  notes: string[];
  text: string;
};

const POLL_MS = 4000;
const TEXT_SIZE = 18;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MARKUP_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "pdf", "ppt", "pptx"]);

const TOOLS: { id: Tool; label: string }[] = [
  { id: "pen", label: "Pen" },
  { id: "eraser", label: "Eraser" },
  { id: "text", label: "Text" },
  { id: "laser", label: "Pointer" },
  { id: "crop", label: "Crop" },
];

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

type SlidePage = { number: number; texts: string[]; images: { mime: string; data_base64: string }[] };
const CLASS_LOCK = "Only the assigned teacher or the owner can change this class.";

const emptyDoc = (): BoardDoc => ({ strokes: [], texts: [], placements: [], erases: [] });

function boardPath(sessionId: string) {
  return `/api/v1/sessions/${encodeURIComponent(sessionId)}/board`;
}

function paint(color: string) {
  return COLORS.find((c) => c.name === color)?.hex || "#1d1d1f";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unit(value: unknown, span: number) {
  const n = num(value, 0);
  if (n < 0) return 0;
  if (n > 1) return Math.min(1, n / span);
  return n;
}

function asCrop(value: unknown): Crop | undefined {
  if (!isRecord(value)) return undefined;
  const x = num(value.x, Number.NaN);
  const y = num(value.y, Number.NaN);
  const w = num(value.w, Number.NaN);
  const h = num(value.h, Number.NaN);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return undefined;
  const x0 = Math.min(1, Math.max(0, x));
  const y0 = Math.min(1, Math.max(0, y));
  const w0 = Math.min(1 - x0, w);
  const h0 = Math.min(1 - y0, h);
  if (w0 < 0.08 || h0 < 0.08) return undefined;
  return { x: x0, y: y0, w: w0, h: h0 };
}

function extensionOf(name: string) {
  const base = name.trim().toLowerCase().split(/[/\\]/).pop() || "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1) : "";
}

function mimeFor(ext: string, claimed: string) {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
    gif: "image/gif",
    pdf: "application/pdf",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
  };
  return map[ext] || claimed || "application/octet-stream";
}

function blobFromBase64(b64: string, mime: string) {
  const clean = (b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64).replace(/\s/g, "");
  const binary = atob(clean);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) view[i] = binary.charCodeAt(i);
  return new Blob([buffer], { type: mime || "application/octet-stream" });
}

function textFromBase64(b64: string) {
  try {
    const clean = (b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64).replace(/\s/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

function classify(filename: string, mime: string, kind: string): DocKind {
  const ext = extensionOf(filename) || kind.toLowerCase().replace(/^\./, "");
  const media = mime.toLowerCase();
  if (ext === "ppt" || ext === "pptx" || media.includes("powerpoint") || media.includes("presentationml")) return "pptx";
  if (media.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "image";
  if (ext === "pdf" || media === "application/pdf") return "pdf";
  if (ext === "txt" || media.startsWith("text/")) return "text";
  if (["doc", "docx", "xls", "xlsx", "odt", "odp", "ods", "office", "drawio"].includes(ext)) return "office";
  if (ext === "notes" || ext === "library" || ext === "video" || kind === "notes" || kind === "library") return "text";
  return "empty";
}

function asStroke(raw: Record<string, unknown>): Stroke | null {
  const id = raw.id != null ? String(raw.id) : "";
  if (!id) return null;
  if (Array.isArray(raw.points) && raw.points.length >= 2) {
    const a = raw.points[0] as number[];
    const b = raw.points[raw.points.length - 1] as number[];
    if (Array.isArray(a) && Array.isArray(b)) {
      return {
        id,
        x1: unit(a[0], 1600),
        y1: unit(a[1], 1000),
        x2: unit(b[0], 1600),
        y2: unit(b[1], 1000),
        color: typeof raw.color === "string" ? raw.color : "black",
        group: typeof raw.group === "string" ? raw.group : undefined,
        surface: typeof raw.surface === "string" ? raw.surface : undefined,
      };
    }
  }
  return {
    id,
    x1: unit(raw.x1, 1600),
    y1: unit(raw.y1, 1000),
    x2: unit(raw.x2, 1600),
    y2: unit(raw.y2, 1000),
    color: typeof raw.color === "string" ? raw.color : "black",
    group: typeof raw.group === "string" ? raw.group : undefined,
    surface: typeof raw.surface === "string" ? raw.surface : undefined,
  };
}

function asPlacement(raw: Record<string, unknown>): Placement | null {
  const id = raw.id != null ? String(raw.id) : "";
  if (!id) return null;
  const notes = Array.isArray(raw.notes) ? raw.notes.map((note) => String(note)) : undefined;
  const mode = raw.mode === "blank" || raw.mode === "material" ? raw.mode : undefined;
  return {
    id,
    name: String(raw.name || raw.file_name || raw.filename || "File"),
    kind: String(raw.kind || raw.file_kind || "file"),
    content_id: typeof raw.content_id === "string" ? raw.content_id : undefined,
    file_kind: typeof raw.file_kind === "string" ? raw.file_kind : undefined,
    file_name: typeof raw.file_name === "string" ? raw.file_name : undefined,
    filename: typeof raw.filename === "string" ? raw.filename : undefined,
    body: typeof raw.body === "string" ? raw.body : undefined,
    notes,
    mode,
    blank_crop: asCrop(raw.blank_crop),
    material_crop: asCrop(raw.material_crop),
    storage_path: typeof raw.storage_path === "string" ? raw.storage_path : undefined,
    x: typeof raw.x === "number" ? raw.x : undefined,
    y: typeof raw.y === "number" ? raw.y : undefined,
    w: typeof raw.w === "number" ? raw.w : undefined,
    h: typeof raw.h === "number" ? raw.h : undefined,
  };
}

function asDoc(body: unknown): BoardDoc {
  const raw = isRecord(body) ? body : {};
  return {
    strokes: Array.isArray(raw.strokes) ? raw.strokes.filter(isRecord).map(asStroke).filter((row): row is Stroke => Boolean(row)) : [],
    texts: Array.isArray(raw.texts)
      ? raw.texts.filter(isRecord).map((row) => ({
          id: String(row.id || ""),
          x: unit(row.x, 1600),
          y: unit(row.y, 1000),
          text: String(row.text || ""),
          color: typeof row.color === "string" ? row.color : "black",
          face: "sans" as const,
          size: TEXT_SIZE as 18,
          surface: typeof row.surface === "string" ? row.surface : undefined,
        })).filter((row) => row.id)
      : [],
    placements: Array.isArray(raw.placements)
      ? raw.placements.filter(isRecord).map(asPlacement).filter((row): row is Placement => Boolean(row))
      : [],
    erases: Array.isArray(raw.erases)
      ? raw.erases.filter(isRecord).map((row) => ({ id: String(row.id || ""), x: num(row.x), y: num(row.y) })).filter((row) => row.id)
      : [],
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
  };
}

function forSave(item: Placement) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (value === undefined) continue;
    if (key === "file_name" || key === "file_body" || key === "src" || key === "data_base64") continue;
    next[key] = value;
  }
  return next;
}

function activeMaterial(doc: BoardDoc) {
  const items = doc.placements.filter((item) => item.kind !== "stage" && item.id !== "stage-mode" && (item.content_id || item.kind === "library"));
  return items.length ? items[items.length - 1] : null;
}

function stageOf(doc: BoardDoc) {
  return doc.placements.find((item) => item.id === "stage-mode" || item.kind === "stage");
}

function modeFrom(doc: BoardDoc): StageMode {
  const stage = stageOf(doc);
  if (stage?.mode === "blank" || stage?.mode === "material") return stage.mode;
  return activeMaterial(doc) ? "material" : "blank";
}

function cropFor(doc: BoardDoc, mode: StageMode) {
  const stage = stageOf(doc);
  if (!stage) return null;
  return (mode === "blank" ? stage.blank_crop : stage.material_crop) || null;
}

function withView(doc: BoardDoc, mode: StageMode, which?: StageMode, crop?: Crop | null): BoardDoc {
  const prev = stageOf(doc);
  const blank = which === "blank" ? crop || undefined : prev?.blank_crop;
  const material = which === "material" ? crop || undefined : prev?.material_crop;
  const stage: Placement = { id: "stage-mode", kind: "stage", name: "Stage", mode };
  if (blank) stage.blank_crop = blank;
  if (material) stage.material_crop = material;
  return {
    ...doc,
    placements: [...doc.placements.filter((item) => item.id !== "stage-mode" && item.kind !== "stage"), stage],
  };
}

function surfaceOf(mode: StageMode, material: Placement | null) {
  if (mode === "blank") return "blank";
  return material?.content_id || material?.id || "material";
}

function onSurface(surface: string | undefined, expected: string) {
  return (surface || "blank") === expected;
}

function toolLine(tool: Tool) {
  return `${TOOLS.find((item) => item.id === tool)?.label || "Pen"} is the active tool.`;
}

function viewStyle(crop: Crop | null): CSSProperties {
  if (!crop) return { inset: 0 };
  return {
    width: `${100 / crop.w}%`,
    height: `${100 / crop.h}%`,
    left: `${(-crop.x * 100) / crop.w}%`,
    top: `${(-crop.y * 100) / crop.h}%`,
  };
}

export function SessionBoard({
  sessionId,
  library = false,
  readOnly = false,
}: {
  sessionId: string;
  library?: boolean;
  readOnly?: boolean;
}) {
  const [doc, setDoc] = useState<BoardDoc>(emptyDoc);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("black");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [libraryRows, setLibraryRows] = useState<LibraryRow[]>([]);
  const [opened, setOpened] = useState<OpenedFile | null>(null);
  const [fileReady, setFileReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [laser, setLaser] = useState<{ x: number; y: number } | null>(null);
  const [cropDrag, setCropDrag] = useState<Crop | null>(null);
  const [canUndoCrop, setCanUndoCrop] = useState(false);
  const [slides, setSlides] = useState<SlidePage[]>([]);
  const [slideAt, setSlideAt] = useState(0);
  const docRef = useRef(doc);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const lock = useRef(0);
  const dirty = useRef(false);
  const drawing = useRef(false);
  const cropping = useRef(false);
  const gesture = useRef("");
  const moved = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const cropUndo = useRef<{ mode: StageMode; crop: Crop | null }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const notesRef = useRef<HTMLElement>(null);
  const drawRef = useRef<() => void>(() => undefined);

  docRef.current = doc;
  toolRef.current = tool;
  colorRef.current = color;

  const material = activeMaterial(doc);
  const mode = modeFrom(doc);
  const crop = cropFor(doc, mode);
  const contentKey = material?.content_id || "";
  const surface = surfaceOf(mode, material);

  const filename = opened?.filename || material?.filename || material?.file_name || material?.name || "";
  const classified: DocKind = material
    ? classify(filename, opened?.mime || "", String(opened?.fileKind || material.file_kind || material.kind || ""))
    : "empty";
  const hasWriting = Boolean(
    material?.body?.trim() || material?.notes?.length || opened?.body?.trim() || opened?.text?.trim() || opened?.notes?.length,
  );
  const docKind: DocKind = classified === "empty" && hasWriting ? "text" : classified;
  const showInk = mode === "blank" || docKind === "image" || docKind === "pdf" || docKind === "text" || (docKind === "pptx" && slides.length > 0);
  const prose = [
    opened?.text || "",
    opened?.body || material?.body || "",
    ...((opened?.notes?.length ? opened.notes : material?.notes) || []),
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");

  useEffect(() => {
    if (docKind !== "pptx" || !contentKey) {
      setSlides([]);
      return;
    }
    let cancel = false;
    api(`/api/v1/content/${encodeURIComponent(contentKey)}/slides`)
      .then((data) => {
        if (cancel) return;
        const pages = (data as { slides?: SlidePage[] }).slides || [];
        setSlides(pages);
        setSlideAt(0);
      })
      .catch(() => {
        if (!cancel) setSlides([]);
      });
    return () => {
      cancel = true;
    };
  }, [docKind, contentKey]);

  useEffect(() => {
    if (!library) return;
    let stop = false;
    api("/api/v1/content")
      .then((rows) => {
        if (stop || !Array.isArray(rows)) return;
        const list = (rows as LibraryRow[]).filter((row) => row && row.id && row.title);
        list.sort((a, b) => a.title.localeCompare(b.title));
        setLibraryRows(list);
      })
      .catch(() => {
        if (!stop) setLibraryRows([]);
      });
    return () => {
      stop = true;
    };
  }, [library]);

  useEffect(() => {
    let stop = false;
    dirty.current = false;
    lock.current = 0;
    cropUndo.current = [];
    setCanUndoCrop(false);
    const blank = emptyDoc();
    docRef.current = blank;
    setDoc(blank);
    setOpened(null);
    async function pull() {
      if (stop || dirty.current || lock.current > 0) return;
      const ticket = lock.current;
      try {
        const body = await api(boardPath(sessionId));
        if (stop || dirty.current || lock.current !== ticket) return;
        const next = asDoc(body);
        docRef.current = next;
        setDoc(next);
      } catch (err) {
        if (!stop) setNote(err instanceof Error ? err.message : String(err));
      }
    }
    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    let cancel = false;
    let url = "";
    setFileReady(false);
    setImageFailed(false);
    setOpened(null);
    if (!contentKey) {
      setFileReady(true);
      return;
    }
    api(`/api/v1/content/${encodeURIComponent(contentKey)}`)
      .then((row) => {
        if (cancel || !isRecord(row)) return;
        const mime = typeof row.mime === "string" ? row.mime : "";
        const name = String(row.filename || row.title || "");
        const fileKind = String(row.file_kind || "");
        const encoded = typeof row.data_base64 === "string" ? row.data_base64 : "";
        const kind = classify(name, mime, fileKind);
        let objectUrl = "";
        let text = "";
        if (encoded && kind !== "text") {
          const blob = blobFromBase64(encoded, mime || mimeFor(extensionOf(name) || fileKind, mime));
          objectUrl = URL.createObjectURL(blob);
          url = objectUrl;
        } else if (encoded && kind === "text") {
          text = textFromBase64(encoded);
        }
        if (cancel) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return;
        }
        setOpened({
          url: objectUrl,
          mime,
          filename: name,
          fileKind,
          title: String(row.title || name || "Notes"),
          body: typeof row.body === "string" ? row.body : "",
          notes: Array.isArray(row.notes) ? row.notes.map((note) => String(note)) : [],
          text,
        });
        setFileReady(true);
      })
      .catch((err) => {
        if (!cancel) {
          setFileReady(true);
          setNote(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [contentKey]);

  function remember(next: BoardDoc, ink: boolean) {
    docRef.current = next;
    setDoc(next);
    if (ink) dirty.current = true;
  }

  async function persistView(next: BoardDoc) {
    lock.current += 1;
    try {
      await api(boardPath(sessionId), {
        method: "PUT",
        body: JSON.stringify({ placements: next.placements.map(forSave) }),
      });
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      lock.current -= 1;
    }
  }

  function selectMode(next: StageMode) {
    const updated = withView(docRef.current, next);
    remember(updated, false);
    void persistView(updated);
    setNote("");
  }

  function applyCrop(nextMode: StageMode, nextCrop: Crop | null) {
    const updated = withView(docRef.current, modeFrom(docRef.current), nextMode, nextCrop);
    remember(updated, false);
    setCanUndoCrop(cropUndo.current.length > 0 || Boolean(nextCrop));
    void persistView(updated);
  }

  function visiblePoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const vx = rect.width ? (event.clientX - rect.left) / rect.width : 0;
    const vy = rect.height ? (event.clientY - rect.top) / rect.height : 0;
    return {
      vx: Math.min(1, Math.max(0, vx)),
      vy: Math.min(1, Math.max(0, vy)),
    };
  }

  function documentPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const view = cropFor(docRef.current, modeFrom(docRef.current)) || { x: 0, y: 0, w: 1, h: 1 };
    const { vx, vy } = visiblePoint(event);
    return { x: view.x + vx * view.w, y: view.y + vy * view.h };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (readOnly || !showInk) return;
    const point = documentPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (toolRef.current === "laser") {
      const spot = visiblePoint(event);
      setLaser({ x: spot.vx, y: spot.vy });
      return;
    }
    if (toolRef.current === "text") {
      const text = window.prompt("Text");
      if (!text?.trim()) return;
      const box: TextBox = {
        id: crypto.randomUUID(),
        x: point.x,
        y: point.y,
        text: text.trim().slice(0, 500),
        color: colorRef.current,
        face: "sans",
        size: 18,
        surface,
      };
      remember({ ...docRef.current, texts: [...docRef.current.texts, box] }, true);
      return;
    }
    if (toolRef.current === "crop") {
      const spot = visiblePoint(event);
      cropping.current = true;
      setCropDrag({ x: spot.vx, y: spot.vy, w: 0, h: 0 });
      last.current = { x: spot.vx, y: spot.vy };
      return;
    }
    drawing.current = true;
    moved.current = false;
    gesture.current = crypto.randomUUID();
    last.current = point;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (toolRef.current === "laser") {
      const spot = visiblePoint(event);
      setLaser({ x: spot.vx, y: spot.vy });
      return;
    }
    if (toolRef.current === "crop" && cropping.current && last.current) {
      const spot = visiblePoint(event);
      const x = Math.min(last.current.x, spot.vx);
      const y = Math.min(last.current.y, spot.vy);
      setCropDrag({ x, y, w: Math.abs(spot.vx - last.current.x), h: Math.abs(spot.vy - last.current.y) });
      return;
    }
    if (!drawing.current || !last.current) return;
    const point = documentPoint(event);
    moved.current = true;
    if (toolRef.current === "eraser") {
      const canvas = canvasRef.current;
      const width = canvas?.clientWidth || 1;
      const height = canvas?.clientHeight || 1;
      const view = cropFor(docRef.current, modeFrom(docRef.current)) || { x: 0, y: 0, w: 1, h: 1 };
      const reach = (18 / Math.min(width, height)) * Math.max(view.w, view.h);
      const current = docRef.current;
      const expected = surfaceOf(modeFrom(current), activeMaterial(current));
      remember(
        {
          ...current,
          strokes: current.strokes.filter((stroke) => {
            if (!onSurface(stroke.surface, expected)) return true;
            return !nearStroke(stroke, point.x, point.y, reach);
          }),
          texts: current.texts.filter((box) => {
            if (!onSurface(box.surface, expected)) return true;
            return Math.hypot(box.x - point.x, box.y - point.y) > reach * 2.2;
          }),
          erases: [...current.erases, { id: crypto.randomUUID(), x: point.x, y: point.y }],
        },
        true,
      );
      last.current = point;
      return;
    }
    if (toolRef.current !== "pen") return;
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      x1: last.current.x,
      y1: last.current.y,
      x2: point.x,
      y2: point.y,
      color: colorRef.current,
      group: gesture.current,
      surface,
    };
    last.current = point;
    remember({ ...docRef.current, strokes: [...docRef.current.strokes, stroke] }, true);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (toolRef.current === "crop" && cropping.current && last.current) {
      cropping.current = false;
      const spot = visiblePoint(event);
      const rect = {
        x: Math.min(last.current.x, spot.vx),
        y: Math.min(last.current.y, spot.vy),
        w: Math.abs(spot.vx - last.current.x),
        h: Math.abs(spot.vy - last.current.y),
      };
      setCropDrag(null);
      if (rect.w >= 0.08 && rect.h >= 0.08) {
        const view = cropFor(docRef.current, modeFrom(docRef.current)) || { x: 0, y: 0, w: 1, h: 1 };
        const nextCrop = asCrop({
          x: view.x + rect.x * view.w,
          y: view.y + rect.y * view.h,
          w: rect.w * view.w,
          h: rect.h * view.h,
        });
        if (nextCrop) {
          cropUndo.current.push({ mode: modeFrom(docRef.current), crop: view.w === 1 && view.h === 1 && view.x === 0 && view.y === 0 ? null : view });
          setCanUndoCrop(true);
          applyCrop(modeFrom(docRef.current), nextCrop);
          setNote("The view is cropped. The file is unchanged.");
        }
      }
    }
    if (drawing.current && !moved.current && last.current && toolRef.current === "pen") {
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        x1: last.current.x,
        y1: last.current.y,
        x2: last.current.x + 0.0008,
        y2: last.current.y + 0.0008,
        color: colorRef.current,
        group: gesture.current,
        surface,
      };
      remember({ ...docRef.current, strokes: [...docRef.current.strokes, stroke] }, true);
    }
    drawing.current = false;
    last.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function undoStroke() {
    const current = docRef.current;
    const expected = surfaceOf(modeFrom(current), activeMaterial(current));
    let index = -1;
    for (let i = current.strokes.length - 1; i >= 0; i -= 1) {
      if (onSurface(current.strokes[i].surface, expected)) {
        index = i;
        break;
      }
    }
    if (index < 0) return;
    const group = current.strokes[index].group;
    const strokes = group
      ? current.strokes.filter((stroke) => !(onSurface(stroke.surface, expected) && stroke.group === group))
      : current.strokes.filter((_, i) => i !== index);
    remember({ ...current, strokes }, true);
    setNote("Last stroke removed.");
  }

  function undoCrop() {
    const stack = cropUndo.current;
    if (stack.length) {
      const prev = stack.pop()!;
      setCanUndoCrop(stack.length > 0 || Boolean(prev.crop));
      applyCrop(prev.mode, prev.crop);
      setNote("Crop undone. The file is unchanged.");
      return;
    }
    if (crop) {
      applyCrop(mode, null);
      setCanUndoCrop(false);
      setNote("Crop undone. The file is unchanged.");
    }
  }

  function clearInk() {
    const current = docRef.current;
    const expected = surfaceOf(modeFrom(current), activeMaterial(current));
    remember(
      {
        ...current,
        strokes: current.strokes.filter((stroke) => !onSurface(stroke.surface, expected)),
        texts: current.texts.filter((box) => !onSurface(box.surface, expected)),
      },
      true,
    );
    setNote("Ink cleared. The file is still unchanged.");
  }

  async function saveBoard(quiet = false) {
    if (readOnly) return false;
    const snapshot = docRef.current;
    setSaving(true);
    if (!quiet) setNote("Saving.");
    lock.current += 1;
    try {
      const saved = asDoc(
        await api(boardPath(sessionId), {
          method: "PUT",
          body: JSON.stringify({
            strokes: snapshot.strokes,
            texts: snapshot.texts.map((box) => ({ ...box, face: "sans", size: 18 })),
            placements: snapshot.placements.map(forSave),
            erases: snapshot.erases,
          }),
        }),
      );
      docRef.current = saved;
      dirty.current = false;
      setDoc(saved);
      if (!quiet) setNote("Saved.");
      return true;
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setSaving(false);
      lock.current -= 1;
    }
  }

  async function placeContent(contentId: string) {
    if (readOnly) return;
    lock.current += 1;
    setBusy(true);
    setNote("Opening that file.");
    try {
      if (dirty.current && !(await saveBoard(true))) return;
      const saved = asDoc(
        await api(`${boardPath(sessionId)}/library`, {
          method: "POST",
          body: JSON.stringify({ content_id: contentId }),
        }),
      );
      const next = withView(saved, "material");
      remember(next, false);
      dirty.current = false;
      await api(boardPath(sessionId), {
        method: "PUT",
        body: JSON.stringify({ placements: next.placements.map(forSave) }),
      });
      setNote("That file is the page.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      lock.current -= 1;
    }
  }

  async function onFile(file: File | null) {
    if (readOnly || !file) return;
    const ext = extensionOf(file.name);
    if (!MARKUP_EXT.has(ext)) {
      setNote("Choose a png, jpg, webp, gif, svg, pdf, ppt, or pptx file.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      setNote(file.size <= 0 ? "That file is empty." : "That file is larger than 50 MB.");
      return;
    }
    lock.current += 1;
    setBusy(true);
    setNote("Opening that file.");
    try {
      if (dirty.current && !(await saveBoard(true))) return;
      const dataBase64 = await readBase64(file);
      const created = (await api("/api/v1/content", {
        method: "POST",
        body: JSON.stringify({
          title: file.name.slice(0, 200),
          filename: file.name,
          mime: mimeFor(ext, file.type),
          data_base64: dataBase64,
          file_kind: ext === "jpeg" ? "jpg" : ext,
          session_id: sessionId,
        }),
      })) as { id?: string };
      if (!created.id) throw new Error("The file did not save.");
      const saved = asDoc(
        await api(`${boardPath(sessionId)}/library`, {
          method: "POST",
          body: JSON.stringify({ content_id: created.id }),
        }),
      );
      const next = withView(saved, "material");
      remember(next, false);
      dirty.current = false;
      await api(boardPath(sessionId), {
        method: "PUT",
        body: JSON.stringify({ placements: next.placements.map(forSave) }),
      });
      setLibraryRows((rows) => {
        if (rows.some((row) => row.id === created.id)) return rows;
        return [...rows, { id: created.id || "", title: file.name, file_kind: ext, filename: file.name }].sort((a, b) =>
          a.title.localeCompare(b.title),
        );
      });
      setNote(ext === "ppt" || ext === "pptx" ? "Opening the slides." : "That file is the page.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      lock.current -= 1;
    }
  }

  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas || !showInk) return;
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    const nextW = Math.round(cssW * dpr);
    const nextH = Math.round(cssH * dpr);
    if (canvas.width !== nextW) canvas.width = nextW;
    if (canvas.height !== nextH) canvas.height = nextH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const view = crop || { x: 0, y: 0, w: 1, h: 1 };
    const expected = surface;
    for (const stroke of doc.strokes) {
      if (!onSurface(stroke.surface, expected)) continue;
      const x1 = ((stroke.x1 - view.x) / view.w) * cssW;
      const y1 = ((stroke.y1 - view.y) / view.h) * cssH;
      const x2 = ((stroke.x2 - view.x) / view.w) * cssW;
      const y2 = ((stroke.y2 - view.y) / view.h) * cssH;
      ctx.strokeStyle = paint(stroke.color);
      ctx.fillStyle = paint(stroke.color);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.font = `${TEXT_SIZE}px sans-serif`;
    ctx.textBaseline = "alphabetic";
    for (const box of doc.texts) {
      if (!onSurface(box.surface, expected)) continue;
      ctx.fillStyle = paint(box.color);
      ctx.fillText(box.text, ((box.x - view.x) / view.w) * cssW, ((box.y - view.y) / view.h) * cssH);
    }
    if (cropDrag && cropDrag.w > 0 && cropDrag.h > 0) {
      const x = cropDrag.x * cssW;
      const y = cropDrag.y * cssH;
      const w = cropDrag.w * cssW;
      const h = cropDrag.h * cssH;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.rect(0, 0, cssW, cssH);
      ctx.rect(x, y, w, h);
      ctx.fill("evenodd");
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "#1d1d1f";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }
  };

  useEffect(() => {
    drawRef.current();
  }, [doc, mode, crop, cropDrag, showInk, opened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [showInk, contentKey, mode]);

  function onWheel(event: WheelEvent<HTMLCanvasElement>) {
    if (notesRef.current) notesRef.current.scrollTop += event.deltaY;
  }

  const inkCursor = tool === "text" ? "text" : tool === "laser" ? "none" : "crosshair";
  const hasStroke = doc.strokes.some((stroke) => onSurface(stroke.surface, surface));

  return (
    <div className="studio-board">
      {readOnly ? (
        <p className="studio-status" role="status">
          {CLASS_LOCK}
        </p>
      ) : null}
      <div
        className="studio-toolbar"
        role="toolbar"
        aria-label="Board tools"
        style={readOnly ? { pointerEvents: "none", opacity: 0.55 } : undefined}
      >
        <div className="studio-modes" role="group" aria-label="Board mode">
          <button type="button" aria-pressed={mode === "blank"} onClick={() => selectMode("blank")}>
            Blank board
          </button>
          <button type="button" aria-pressed={mode === "material"} onClick={() => selectMode("material")}>
            This material
          </button>
        </div>
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="studio-btn"
            aria-pressed={tool === item.id}
            onClick={() => {
              setTool(item.id);
              setLaser(null);
              setNote("");
            }}
          >
            {item.label}
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
        {library ? (
          <label className="studio-library">
            <select
              aria-label="Library file"
              value={contentKey}
              disabled={busy}
              onChange={(event) => {
                const id = event.target.value;
                if (id) void placeContent(id);
              }}
            >
              <option value="">Library</option>
              {libraryRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {library ? (
          <label className="studio-btn studio-file">
            Upload
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg,.gif,.pdf,.ppt,.pptx,image/png,image/jpeg,image/webp,image/svg+xml,image/gif,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              aria-label="Upload png, jpg, webp, gif, svg, pdf, ppt, or pptx"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                void onFile(file);
              }}
            />
          </label>
        ) : null}
        <button type="button" className="studio-btn" onClick={undoStroke} disabled={!hasStroke}>
          Undo
        </button>
        <button type="button" className="studio-btn" onClick={undoCrop} disabled={!canUndoCrop && !crop}>
          Undo crop
        </button>
        <button type="button" className="studio-btn" onClick={clearInk} disabled={!showInk}>
          Clear ink
        </button>
        <button type="button" className="studio-btn studio-btn--primary" onClick={() => void saveBoard()} disabled={saving}>
          {saving ? "Saving" : "Save"}
        </button>
        <p className={note === "Saved." ? "studio-status studio-status--ok" : "studio-status"} role="status">
          {toolLine(tool)}
          {note ? ` ${note}` : ""}
        </p>
      </div>
      <div className="doc-stage" data-mode={mode} data-kind={mode === "material" ? docKind : "blank"}>
        <div className="doc-stage__view" style={viewStyle(showInk ? crop : null)}>
          {mode === "blank" ? <div className="doc-stage__paper" /> : null}
          {mode === "material" && docKind === "image" && opened?.url && !imageFailed ? (
            <img className="doc-stage__img" src={opened.url} alt={filename || "Page"} onError={() => setImageFailed(true)} />
          ) : null}
          {mode === "material" && docKind === "pdf" && opened?.url ? (
            <iframe className="doc-stage__pdf" src={opened.url} title={filename || "PDF"} />
          ) : null}
          {mode === "material" && docKind === "text" ? (
            <article className="doc-stage__notes" ref={notesRef}>
              <h3>{opened?.title || material?.name || "Notes"}</h3>
              <p>{prose || "This item has no written notes."}</p>
            </article>
          ) : null}
          {mode === "material" && docKind === "pptx" ? (
            <article className="doc-stage__notes">
              <div className="sb" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{filename || "PowerPoint"}</h3>
                {slides.length > 1 ? (
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn--sm" disabled={slideAt === 0} onClick={() => setSlideAt((n) => Math.max(0, n - 1))}>
                      Previous slide
                    </button>
                    <span className="muted">
                      {slideAt + 1} / {slides.length}
                    </span>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={slideAt >= slides.length - 1}
                      onClick={() => setSlideAt((n) => Math.min(slides.length - 1, n + 1))}
                    >
                      Next slide
                    </button>
                  </div>
                ) : null}
              </div>
              {slides[slideAt] ? (
                <>
                  {(slides[slideAt].images || []).map((image, index) => (
                    <img
                      key={`${image.mime}-${index}`}
                      className="doc-stage__img"
                      alt=""
                      src={`data:${image.mime};base64,${image.data_base64}`}
                    />
                  ))}
                  {(slides[slideAt].texts || []).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {!slides[slideAt].texts?.length && !slides[slideAt].images?.length ? (
                    <p className="muted">This slide has no text or picture to show.</p>
                  ) : null}
                </>
              ) : (
                <p className="muted">Opening the slides.</p>
              )}
            </article>
          ) : null}
          {mode === "material" && docKind === "office" ? (
            <div className="doc-stage__notice">
              <h3>{filename || "File"}</h3>
              <p>This file cannot be opened for markup here. Upload a PDF or an image of the page to mark it up.</p>
              {opened?.url ? (
                <a className="btn btn--sm" href={opened.url} download={filename || "file"}>
                  Download
                </a>
              ) : null}
            </div>
          ) : null}
          {mode === "material" && docKind === "empty" ? (
            <div className="doc-stage__notice">
              <p>Choose a library file or upload a PDF or an image.</p>
            </div>
          ) : null}
          {mode === "material" && (docKind === "image" || docKind === "pdf") && (!fileReady || !opened?.url || imageFailed) ? (
            <div className="doc-stage__notice">
              <h3>{filename || "File"}</h3>
              <p>
                {!fileReady
                  ? "Opening that file."
                  : imageFailed
                    ? "This image could not be opened."
                    : "This file has no stored bytes to open. The original was not rewritten."}
              </p>
            </div>
          ) : null}
        </div>
        {showInk ? (
          <canvas
            ref={canvasRef}
            className="doc-stage__ink"
            style={{ cursor: inkCursor, pointerEvents: readOnly ? "none" : undefined }}
            aria-label="Class whiteboard"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => {
              if (tool === "laser") setLaser(null);
            }}
            onWheel={onWheel}
          />
        ) : null}
        {laser && tool === "laser" && showInk ? (
          <span className="doc-laser" style={{ left: `${laser.x * 100}%`, top: `${laser.y * 100}%` }} />
        ) : null}
      </div>
    </div>
  );
}

function nearStroke(stroke: Stroke, x: number, y: number, reach: number) {
  const dx = stroke.x2 - stroke.x1;
  const dy = stroke.y2 - stroke.y1;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - stroke.x1) * dx + (y - stroke.y1) * dy) / len));
  const px = stroke.x1 + t * dx;
  const py = stroke.y1 + t * dy;
  return Math.hypot(px - x, py - y) < reach;
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type Item = {
  id: string;
  title: string;
  body?: string;
  topic_id?: string | null;
  kind?: string;
  duration_label?: string;
  progress_pct?: number;
  playlist_ids?: string[];
  drip_at?: string | null;
  views?: number;
  board_label?: string;
  subject_label?: string;
  unit_label?: string;
  file_kind?: string;
  filename?: string;
  mime?: string;
  size_bytes?: number;
  has_file?: boolean;
  data_base64?: string;
};

type TopicRow = {
  id: string;
  name?: string;
  title?: string;
};

type Preview = {
  title: string;
  filename: string;
  url: string;
  mode: "image" | "file";
};

const BOARD_OPTIONS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board", "General"] as const;

const SUBJECT_OPTIONS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Computer Science",
] as const;

const PRESET_UNITS = [
  "Unit 1 · Foundations",
  "Unit 2 · Core Concepts",
  "Unit 3 · Problem Solving",
  "Unit 4 · Exam Revision",
  "Formula Sheet & Reference",
] as const;

const FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,.svg,.gif,.pdf,.ppt,.pptx,.doc,.docx,.txt";

const FILE_EXTS = new Set(FILE_ACCEPT.split(",").map((ext) => ext.slice(1)));

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif"]);

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024);

function extensionOf(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeFor(ext: string, claimed: string): string {
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
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
  };
  return map[ext] || claimed || "application/octet-stream";
}

function isImageFile(mime: string, filename: string): boolean {
  if (mime.toLowerCase().startsWith("image/")) return true;
  return IMAGE_EXTS.has(extensionOf(filename));
}

function kindLabel(it: Item): string {
  const fileKind = (it.file_kind || "").toLowerCase();
  if (fileKind && fileKind !== "notes") return fileKind;
  return (it.kind || "notes").toLowerCase();
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function blobFromBase64(b64: string, mime: string): Blob {
  const clean = (b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64).replace(/\s/g, "");
  const binary = atob(clean);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) view[i] = binary.charCodeAt(i);
  return new Blob([buffer], { type: mime || "application/octet-stream" });
}

export function LibraryScreen() {
  const [rows, setRows] = useState<Item[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<File | null>(null);
  const [autoTitle, setAutoTitle] = useState("");
  const [board, setBoard] = useState<string>("CBSE");
  const [subjectChoice, setSubjectChoice] = useState<string>("Physics");
  const [customSubject, setCustomSubject] = useState("");
  const [unitChoice, setUnitChoice] = useState<string>(PRESET_UNITS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<string>("student");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [openingId, setOpeningId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const heldUrls = useRef<string[]>([]);

  function load() {
    Promise.all([
      api("/api/v1/content") as Promise<Item[]>,
      api("/api/v1/topics").catch(() => []) as Promise<TopicRow[]>,
    ])
      .then(([data, topicRows]) => {
        setRows(Array.isArray(data) ? data : []);
        const validTopics = Array.isArray(topicRows) ? topicRows : [];
        setTopics(validTopics);
        if (validTopics[0]) {
          const firstLabel = validTopics[0].title || validTopics[0].name;
          if (firstLabel) setUnitChoice(firstLabel);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoaded(true));
  }

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role ?? "student"))
      .catch(() => undefined);
    load();
    const urls = heldUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const canWrite = role === "teacher" || role === "owner";

  const unitOptions = useMemo(() => {
    const topicLabels = topics
      .map((t) => (t.title || t.name || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...topicLabels, ...PRESET_UNITS]));
  }, [topics]);

  const kinds = useMemo(() => {
    const set = new Set(rows.map((r) => kindLabel(r)));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const shown = rows.filter((r) => filter === "all" || kindLabel(r) === filter);

  const resolvedSubject = subjectChoice === "__custom__" ? customSubject.trim() : subjectChoice;
  const resolvedUnit = unitChoice === "__custom__" ? customUnit.trim() : unitChoice;

  function onPick(file: File | null) {
    setError("");
    if (!file) {
      setPicked(null);
      return;
    }
    const ext = extensionOf(file.name);
    if (!FILE_EXTS.has(ext)) {
      setPicked(null);
      if (fileRef.current) fileRef.current.value = "";
      setError("Choose a png, jpg, jpeg, webp, svg, gif, pdf, ppt, pptx, doc, docx, or txt file.");
      return;
    }
    if (file.size <= 0) {
      setPicked(null);
      if (fileRef.current) fileRef.current.value = "";
      setError("That file is empty.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setPicked(null);
      if (fileRef.current) fileRef.current.value = "";
      setError(`That file is larger than ${MAX_FILE_MB} MB.`);
      return;
    }
    setPicked(file);
    setTitle((current) => {
      if (!current.trim() || current === autoTitle) return file.name.slice(0, 200);
      return current;
    });
    setAutoTitle(file.name.slice(0, 200));
  }

  function clearPicked() {
    setPicked(null);
    setAutoTitle("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function create() {
    if (!picked) {
      setError("Choose a file from this computer before saving.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ext = extensionOf(picked.name);
      const dataBase64 = await readAsBase64(picked);
      await api("/api/v1/content", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || picked.name.slice(0, 200),
          body,
          filename: picked.name,
          mime: mimeFor(ext, picked.type),
          data_base64: dataBase64,
          file_kind: ext,
          board,
          subject: resolvedSubject,
          unit: resolvedUnit,
        }),
      });
      setTitle("");
      setBody("");
      setCustomSubject("");
      setCustomUnit("");
      clearPicked();
      setShowUpload(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function closePreview() {
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    setImageFailed(false);
  }

  async function openItem(it: Item) {
    const filename = it.filename || it.title || "file";
    const hintedMime = it.mime || "";
    const image = isImageFile(hintedMime, filename);
    const ext = extensionOf(filename);
    const openInTab = !image && (ext === "pdf" || ext === "txt" || hintedMime === "application/pdf" || hintedMime.startsWith("text/"));
    const tab = openInTab ? window.open("about:blank", "_blank") : null;
    setOpeningId(it.id);
    setError("");
    try {
      const detail = (await api(`/api/v1/content/${it.id}`)) as Item;
      const encoded = detail.data_base64 || "";
      if (!encoded) {
        tab?.close();
        setError("This item has no stored file.");
        return;
      }
      const mime = detail.mime || hintedMime || "application/octet-stream";
      const storedName = detail.filename || filename;
      const blob = blobFromBase64(encoded, mime);
      const url = URL.createObjectURL(blob);
      heldUrls.current.push(url);
      const actualImage = isImageFile(mime, storedName);
      if (actualImage) {
        tab?.close();
        setImageFailed(false);
        setPreview({ title: detail.title || storedName, filename: storedName, url, mode: "image" });
        return;
      }
      const storedExt = extensionOf(storedName);
      const showInTab = storedExt === "pdf" || storedExt === "txt" || mime === "application/pdf" || mime.startsWith("text/");
      if (showInTab && tab) {
        const tabUrl = URL.createObjectURL(blob);
        heldUrls.current.push(tabUrl);
        tab.location.href = tabUrl;
      } else if (tab) {
        tab.close();
      }
      if (!showInTab) {
        const link = document.createElement("a");
        const downloadUrl = URL.createObjectURL(blob);
        heldUrls.current.push(downloadUrl);
        link.href = downloadUrl;
        link.download = storedName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setPreview({ title: detail.title || storedName, filename: storedName, url, mode: "file" });
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpeningId("");
    }
  }

  const list = (
    <>
      <Err message={error} />
      {canWrite && showUpload ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>Upload study material</h3>
          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Electrostatics Formula Sheet"
              />
            </label>
            <label className="field" htmlFor="library-file">
              <span>Choose file from this computer</span>
              <input
                id="library-file"
                ref={fileRef}
                className="field__in"
                type="file"
                accept={FILE_ACCEPT}
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
              {picked ? (
                <span className="muted" style={{ display: "block", marginTop: 8 }}>
                  {picked.name} · {formatBytes(picked.size)}
                </span>
              ) : null}
            </label>
          </div>

          <label className="field">
            <span>Summary / Notes</span>
            <textarea
              className="field__in"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Key concepts covered in this material…"
            />
          </label>

          <div className="grid g3" style={{ gap: 10 }}>
            <label className="field">
              <span>Board</span>
              <select className="field__in" value={board} onChange={(e) => setBoard(e.target.value)}>
                {BOARD_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Subject</span>
              <select
                className="field__in"
                value={subjectChoice}
                onChange={(e) => setSubjectChoice(e.target.value)}
              >
                {SUBJECT_OPTIONS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
                <option value="__custom__">Custom subject…</option>
              </select>
            </label>

            <label className="field">
              <span>Unit / Topic</span>
              <select
                className="field__in"
                value={unitChoice}
                onChange={(e) => setUnitChoice(e.target.value)}
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="__custom__">Custom unit…</option>
              </select>
            </label>
          </div>

          {subjectChoice === "__custom__" ? (
            <label className="field">
              <span>Custom subject</span>
              <input
                className="field__in"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Enter subject name"
              />
            </label>
          ) : null}

          {unitChoice === "__custom__" ? (
            <label className="field">
              <span>Custom unit</span>
              <input
                className="field__in"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="Enter unit or topic title"
              />
            </label>
          ) : null}

          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button
              className="hot hot--btn"
              type="button"
              style={{ width: "auto", margin: 0 }}
              disabled={busy || !title.trim() || !picked}
              onClick={() => void create()}
            >
              {busy ? "Uploading…" : "Save material"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => {
                setShowUpload(false);
                clearPicked();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="chips" style={{ marginBottom: 12 }}>
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            className={`chip${filter === k ? " on" : ""}`}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "All" : k.toUpperCase()}
          </button>
        ))}
      </div>

      {!loaded ? null : shown.length === 0 ? (
        <Empty>
          {rows.length === 0
            ? "This list is empty until a file is chosen from this computer."
            : "Nothing in this filter."}
        </Empty>
      ) : (
        <div className="lesson-grid">
          {shown.map((it) => {
            const pct = it.progress_pct ?? 0;
            const kind = kindLabel(it);
            const dur = it.duration_label || (it.has_file ? "File" : "Lesson");
            return (
              <article key={it.id} className="lesson-card">
                <span className="k">{kind}</span>
                <strong>{it.title}</strong>
                <span className="muted">
                  {dur}
                  {it.board_label ? ` · ${it.board_label}` : ""}
                  {it.subject_label ? ` · ${it.subject_label}` : ""}
                  {it.unit_label ? ` · ${it.unit_label}` : ""}
                </span>
                {it.filename ? (
                  <span className="muted">
                    {it.filename}
                    {it.size_bytes ? ` · ${formatBytes(it.size_bytes)}` : ""}
                  </span>
                ) : null}
                <span className="bar" aria-hidden="true">
                  <b style={{ width: `${Math.min(pct, 100)}%` }} />
                </span>
                {it.has_file ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={openingId === it.id}
                    onClick={() => void openItem(it)}
                  >
                    {openingId === it.id ? "Opening…" : "Open"}
                  </button>
                ) : (
                  <Link href={`${catalogRoute("lesson")}?id=${it.id}`} className="btn btn--sm">
                    View lesson
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}

      {preview ? (
        <Dialog title={preview.title} onClose={closePreview}>
          {preview.mode === "image" && !imageFailed ? (
            <img
              src={preview.url}
              alt={preview.filename}
              onError={() => setImageFailed(true)}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "60vh",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                background: "#fff",
              }}
            />
          ) : (
            <p className="muted" style={{ marginTop: 0 }}>
              {preview.filename} is stored for this workspace. Open it from the link below.
            </p>
          )}
          <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
            <a className="hot hot--btn" href={preview.url} download={preview.filename}>
              Download {preview.filename}
            </a>
            {preview.mode === "file" ? (
              <a className="btn btn--sm" href={preview.url} target="_blank" rel="noopener noreferrer">
                Open in a new tab
              </a>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );

  if (role === "student" || role === "parent") {
    return (
      <>
        <AppBar title="Content" />
        <div className="appwrap">{list}</div>
      </>
    );
  }

  return (
    <>
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Content library</h2>
          <span className="k">Materials hang off tenant topics</span>
        </div>
        {canWrite ? (
          <button
            type="button"
            className={showUpload ? "btn btn--sm" : "hot hot--btn"}
            style={{ width: "auto", margin: 0, cursor: "pointer" }}
            onClick={() => setShowUpload((prev) => !prev)}
          >
            {showUpload ? "Close upload" : "+ Upload Material"}
          </button>
        ) : null}
      </div>
      {list}
    </>
  );
}

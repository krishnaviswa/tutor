"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** Profile photos are data URLs. The library cap is for content files, so an avatar stops at 2 MB. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const TITLES = new Set(["dr", "prof", "professor", "mr", "mrs", "ms", "miss", "sir", "pandit", "shri", "smt"]);
const PALETTE = ["#0071E3", "#5E5CE6", "#FF9F0A", "#FF375F", "#64D2FF", "#30B0C7", "#8E8E93"];
const IDENTITY_EVENT = "tutor:identity";

export function personInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/\./g, ""))
    .filter((part) => part && !TITLES.has(part.toLowerCase()));
  const letters = parts.slice(0, 2).map((part) => part[0]!.toUpperCase());
  return letters.join("") || "?";
}

function avColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0];
}

export function safePhoto(photo: string | null | undefined): string {
  const value = (photo || "").trim();
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value) ? value : "";
}

export function PersonAvatar({
  name,
  photo,
  large = false,
}: {
  name: string;
  photo?: string;
  large?: boolean;
}) {
  const src = safePhoto(photo);
  const cls = large ? "av av--lg" : "av";
  if (src) {
    return <img className={cls} src={src} alt="" />;
  }
  if (!name) {
    return <span className={`${cls} who__wait`} aria-hidden="true" />;
  }
  return (
    <span className={cls} style={{ background: avColor(name) }} aria-hidden="true">
      {personInitials(name)}
    </span>
  );
}

export function publishIdentity(next: { name?: string; photo?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(IDENTITY_EVENT, { detail: next }));
}

export function useSignedInIdentity() {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    let cancelled = false;
    api("/api/v1/auth/me")
      .then((me) => {
        if (cancelled) return;
        const next = String((me as { display_name?: string }).display_name || "").trim();
        if (next) setName((current) => current || next);
      })
      .catch(() => undefined);
    api("/api/v1/profile")
      .then((row) => {
        if (cancelled) return;
        const profile = row as { display_name?: string; photo?: string };
        const next = String(profile.display_name || "").trim();
        if (next) setName(next);
        if (typeof profile.photo === "string") setPhoto(safePhoto(profile.photo));
      })
      .catch(() => undefined);

    function onIdentity(event: Event) {
      const detail = (event as CustomEvent<{ name?: string; photo?: string }>).detail;
      if (!detail) return;
      const next = detail.name?.trim() || "";
      if (next) setName(next);
      if (typeof detail.photo === "string") setPhoto(safePhoto(detail.photo));
    }
    window.addEventListener(IDENTITY_EVENT, onIdentity);
    return () => {
      cancelled = true;
      window.removeEventListener(IDENTITY_EVENT, onIdentity);
    };
  }, []);

  return { name, photo };
}

export function BrandLockup({
  href,
  mark,
  className,
}: {
  href: string;
  mark?: string;
  className?: string;
}) {
  const { name, photo } = useSignedInIdentity();
  return (
    <Link href={href} className={["who", className].filter(Boolean).join(" ")}>
      <PersonAvatar name={name} photo={photo} />
      <span className="who__copy">
        {name ? <span className="who__name">{name}</span> : null}
        <span className="who__brand">
          TutorOS
          {mark ? <i>{mark}</i> : null}
        </span>
      </span>
    </Link>
  );
}

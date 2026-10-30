"use client";

import { useEffect, useId, type ReactNode } from "react";

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="dlg" role="presentation" onMouseDown={onClose}>
      <div
        className="dlg__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dlg__bar">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="dlg__x" onClick={onClose}>
            Close
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

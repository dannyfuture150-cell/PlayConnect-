"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { RetryVideo } from "@/components/shared/RetryVideo";

/** Full-screen viewer for one photo or video. Tap outside, the X, or Escape to close. */
export function MediaLightbox({ url, type, onClose }: { url: string; type: "image" | "video"; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black" onClick={onClose}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <X className="h-5 w-5" />
      </button>
      {type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      ) : (
        <RetryVideo
          src={url}
          controls
          autoPlay
          playsInline
          className="max-h-full max-w-full bg-black"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

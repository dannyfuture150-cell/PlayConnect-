"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_VOICE_SECONDS = 60;
const MIN_VOICE_MS = 800;

// Chrome/Android record WebM/Opus, Safari/iPhone records MP4/AAC. Pick whatever this browser supports.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function extFor(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export interface VoiceResult {
  file: File;
  seconds: number;
}

/** Records a short voice note from the microphone. Everything is cleaned up (mic released) on stop, cancel or unmount. */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const resolveRef = useRef<((r: VoiceResult | null) => void) | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  /** Starts recording. Returns an error message to show the person, or null when recording has started. */
  const start = useCallback(async (): Promise<string | null> => {
    if (!voiceSupported()) return "Voice notes aren't supported in this browser. Try Chrome.";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const elapsed = Date.now() - startedAt.current;
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const resolve = resolveRef.current;
        resolveRef.current = null;
        const cancelled = cancelledRef.current;
        cleanup();
        if (!resolve) return;
        if (cancelled || elapsed < MIN_VOICE_MS || blob.size < 500) {
          resolve(null);
          return;
        }
        resolve({
          file: new File([blob], `voice-${Date.now()}.${extFor(type)}`, { type }),
          seconds: Math.min(MAX_VOICE_SECONDS, Math.max(1, Math.round(elapsed / 1000))),
        });
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      rec.start(250);
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds(Math.min(MAX_VOICE_SECONDS, Math.floor((Date.now() - startedAt.current) / 1000)));
      }, 250);
      return null;
    } catch (e: any) {
      cleanup();
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        return "Microphone is blocked. Allow it for this site in your browser settings, then try again.";
      }
      if (e?.name === "NotFoundError") return "No microphone found on this device.";
      return "Couldn't start recording. Try again.";
    }
  }, [cleanup]);

  /** Stops and returns the recording (null if it was too short or cancelled). */
  const stop = useCallback((): Promise<VoiceResult | null> => {
    return new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      try {
        rec.stop();
      } catch {
        resolveRef.current = null;
        cleanup();
        resolve(null);
      }
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        cleanup();
      }
    } else {
      cleanup();
    }
  }, [cleanup]);

  // Leaving the page must never leave the microphone on.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { recording, seconds, start, stop, cancel };
}

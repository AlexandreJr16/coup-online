"use client";

import { useMemo, useSyncExternalStore } from "react";

import { type AudioPrefs, getAudio, readPrefs, savePrefs, subscribePrefs } from "./engine";

const raw = () => {
  try {
    return localStorage.getItem("coup:audio") ?? "";
  } catch {
    return "";
  }
};

/** Preferências de áudio sem divergir do HTML do servidor (servidor = padrão). */
export function usePrefs(): [AudioPrefs, (p: Partial<AudioPrefs>) => void] {
  const snapshot = useSyncExternalStore(subscribePrefs, raw, () => "");
  const prefs = useMemo(() => (snapshot === "" ? { muted: false, volume: 0.7, music: true } : readPrefs()), [snapshot]);
  const update = (p: Partial<AudioPrefs>) => {
    const next = { ...prefs, ...p };
    savePrefs(next);
    getAudio().setPrefs(next);
  };
  return [prefs, update];
}

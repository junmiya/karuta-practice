/**
 * 表示設定（設定画面で決める各ページの初期値）
 *
 * - 端末ごとに localStorage へ保存する（ログイン不要）
 * - ページ上の切替ボタンはその場だけの一時的な変更で、ここには書き戻さない
 */
import { useCallback, useSyncExternalStore } from 'react';

export type FlipStart = 'tori' | 'yomi';
export type TenaraiCount = 1 | 12 | 100;

export interface CardDisplaySettings {
  /** 読札（上の句）をかなで表示 */
  yomiKana: boolean;
  /** 取札（下の句）をかなで表示 */
  toriKana: boolean;
  /** 決まり字を表示 */
  kimariji: boolean;
}

export interface TenaraiSettings extends CardDisplaySettings {
  /** 最初に表示する面 */
  flipStart: FlipStart;
  /** 表示枚数（PC・タブレット） */
  count: TenaraiCount;
  /** 表示枚数（スマホ） */
  countMobile: TenaraiCount;
  /** スマホで検索・表示切替・絞り込み欄を最初から開いておく */
  panelMobile: boolean;
}

export interface DisplaySettings {
  tenarai: TenaraiSettings;
  keiko: CardDisplaySettings;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  tenarai: {
    yomiKana: true,
    toriKana: true,
    kimariji: true,
    flipStart: 'tori',
    count: 12,
    countMobile: 1,
    panelMobile: false,
  },
  keiko: { yomiKana: true, toriKana: true, kimariji: false },
};

const STORAGE_KEY = 'display_settings_v1';
/**
 * 保存形式の版。2: 稽古の読札・取札も かな を既定にした（2026-11-17）。
 * 版が古い保存値の稽古のかな設定は旧既定（漢字）のまま保存されていただけなので、新しい既定に置き換える。
 */
const SETTINGS_VERSION = 2;

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isCount = (v: unknown): v is TenaraiCount => v === 1 || v === 12 || v === 100;

/** スマホ判定（下部メニューと同じ 640px 未満） */
export const MOBILE_QUERY = '(max-width: 639px)';
export function isMobileViewport(): boolean {
  try {
    return window.matchMedia(MOBILE_QUERY).matches;
  } catch {
    return false;
  }
}

/** 保存値を検証し、欠けている・壊れている項目は既定値で補う */
function normalize(raw: unknown): DisplaySettings {
  const d = DEFAULT_DISPLAY_SETTINGS;
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof DisplaySettings, Record<string, unknown>>>;
  const t = r.tenarai ?? {};
  const k = r.keiko ?? {};
  const isCurrent = (r as { v?: unknown }).v === SETTINGS_VERSION;
  return {
    tenarai: {
      yomiKana: isBool(t.yomiKana) ? t.yomiKana : d.tenarai.yomiKana,
      toriKana: isBool(t.toriKana) ? t.toriKana : d.tenarai.toriKana,
      kimariji: isBool(t.kimariji) ? t.kimariji : d.tenarai.kimariji,
      flipStart: t.flipStart === 'tori' || t.flipStart === 'yomi' ? t.flipStart : d.tenarai.flipStart,
      count: isCount(t.count) ? t.count : d.tenarai.count,
      countMobile: isCount(t.countMobile) ? t.countMobile : d.tenarai.countMobile,
      panelMobile: isBool(t.panelMobile) ? t.panelMobile : d.tenarai.panelMobile,
    },
    keiko: {
      yomiKana: isCurrent && isBool(k.yomiKana) ? k.yomiKana : d.keiko.yomiKana,
      toriKana: isCurrent && isBool(k.toriKana) ? k.toriKana : d.keiko.toriKana,
      kimariji: isBool(k.kimariji) ? k.kimariji : d.keiko.kimariji,
    },
  };
}

let cache: DisplaySettings | null = null;
const listeners = new Set<() => void>();

/** 現在の表示設定を取得（ページの初期値に使う） */
export function getDisplaySettings(): DisplaySettings {
  if (cache) return cache;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    cache = normalize(stored ? JSON.parse(stored) : null);
  } catch {
    // プライベートモード等で読めない場合は既定値
    cache = DEFAULT_DISPLAY_SETTINGS;
  }
  return cache;
}

function saveDisplaySettings(next: DisplaySettings) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, v: SETTINGS_VERSION }));
  } catch {
    // 保存できなくてもこの画面を開いている間は反映される
  }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 別タブでの変更も反映
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** 設定画面用: 表示設定の読み書き */
export function useDisplaySettings() {
  const settings = useSyncExternalStore(subscribe, getDisplaySettings, () => DEFAULT_DISPLAY_SETTINGS);

  const updateTenarai = useCallback((patch: Partial<TenaraiSettings>) => {
    const cur = getDisplaySettings();
    saveDisplaySettings({ ...cur, tenarai: { ...cur.tenarai, ...patch } });
  }, []);

  const updateKeiko = useCallback((patch: Partial<CardDisplaySettings>) => {
    const cur = getDisplaySettings();
    saveDisplaySettings({ ...cur, keiko: { ...cur.keiko, ...patch } });
  }, []);

  const resetAll = useCallback(() => saveDisplaySettings(DEFAULT_DISPLAY_SETTINGS), []);

  return { settings, updateTenarai, updateKeiko, resetAll };
}

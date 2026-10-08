export const TEXT_SIZE_STEPS = [90, 100, 115, 130, 150, 175] as const;
export const DEFAULT_TEXT_SIZE = 100;
export const TEXT_SIZE_KEY = "lexicon:text-size";

export function normalizeTextSize(value: unknown): number {
  const n = Number(value);
  return (TEXT_SIZE_STEPS as readonly number[]).includes(n) ? n : DEFAULT_TEXT_SIZE;
}

export function stepTextSize(current: number, dir: 1 | -1): number {
  const i = TEXT_SIZE_STEPS.indexOf(normalizeTextSize(current) as (typeof TEXT_SIZE_STEPS)[number]);
  const next = Math.min(TEXT_SIZE_STEPS.length - 1, Math.max(0, i + dir));
  return TEXT_SIZE_STEPS[next];
}

/** Runs in <head> before first paint so the page never flashes at the default size. */
export const TEXT_SIZE_BOOT_SCRIPT = `(function(){try{var v=Number(localStorage.getItem(${JSON.stringify(
  TEXT_SIZE_KEY,
)}));if([${TEXT_SIZE_STEPS.join(",")}].indexOf(v)>-1){document.documentElement.style.setProperty('--root-scale',v+'%')}}catch(e){}})();`;

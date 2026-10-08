import { useEffect, useState, useSyncExternalStore } from "react";
import { Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_TEXT_SIZE,
  TEXT_SIZE_KEY,
  TEXT_SIZE_STEPS,
  normalizeTextSize,
  stepTextSize,
} from "@/lib/text-size";

const listeners = new Set<() => void>();
let current = DEFAULT_TEXT_SIZE;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    current = normalizeTextSize(localStorage.getItem(TEXT_SIZE_KEY));
  } catch {
    current = DEFAULT_TEXT_SIZE;
  }
}

function setSize(value: number) {
  current = normalizeTextSize(value);
  document.documentElement.style.setProperty("--root-scale", `${current}%`);
  try {
    localStorage.setItem(TEXT_SIZE_KEY, String(current));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  listeners.forEach((l) => l());
}

function useTextSize() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return current;
    },
    () => DEFAULT_TEXT_SIZE,
  );
}

export function TextSizeControls() {
  const size = useTextSize();
  const [announce, setAnnounce] = useState("");
  const min = TEXT_SIZE_STEPS[0] ?? 90;
  const max = TEXT_SIZE_STEPS[TEXT_SIZE_STEPS.length - 1] ?? 175;

  function change(value: number) {
    setSize(value);
    setAnnounce(`Text size ${normalizeTextSize(value)} percent`);
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Text size">
      <Button
        variant="ghost"
        className="size-11 min-h-11 p-0 font-display text-base"
        aria-label="Decrease text size"
        disabled={size <= min}
        onClick={() => change(stepTextSize(size, -1))}
      >
        A−
      </Button>
      <span className="min-w-12 text-center text-sm tabular-nums" aria-hidden>
        {size}%
      </span>
      <Button
        variant="ghost"
        className="size-11 min-h-11 p-0 font-display text-lg"
        aria-label="Increase text size"
        disabled={size >= max}
        onClick={() => change(stepTextSize(size, 1))}
      >
        A+
      </Button>
      <Button
        variant="ghost"
        className="min-h-11 whitespace-nowrap px-3 text-xs"
        aria-label="Reset text size to 100 percent"
        disabled={size === DEFAULT_TEXT_SIZE}
        onClick={() => change(DEFAULT_TEXT_SIZE)}
      >
        Reset
      </Button>
      <span className="sr-only" aria-live="polite" role="status">
        {announce}
      </span>
    </div>
  );
}

export function TextSizeFab() {
  const size = useTextSize();
  useEffect(() => load(), []);
  return (
    <div className="fixed bottom-4 right-4 z-40 md:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            className="size-12 min-h-12 rounded-full p-0 shadow-lg"
            aria-label={`Text size, currently ${size} percent`}
          >
            <Type className="size-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-auto max-w-[calc(100vw-2rem)] p-2">
          <TextSizeControls />
        </PopoverContent>
      </Popover>
    </div>
  );
}

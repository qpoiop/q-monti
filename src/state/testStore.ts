import { useSyncExternalStore } from "react";
import { momontyGame } from "@shared/games/momonty/logic";
import type { MomontyAction, MomontyState, MomontyView } from "@shared/games/momonty/logic";
import { makeRng, type Seat } from "@shared/engine";

/**
 * Test-mode store.
 *
 * Runs the shared Momonty engine in the browser. No transport / DO.
 * The single host is every seat — they take turns from a "spy view"
 * that reveals whichever seat is currently acting. Purpose is to smoke
 * test the full game flow client-side without infra.
 *
 * IMPORTANT: the shared reducer mutates state in place for efficiency
 * (it's a server-side hot path). React's `useSyncExternalStore` compares
 * snapshots with `Object.is` — a mutated-but-same-reference state does
 * NOT trigger re-render. We therefore shallow-copy the returned state
 * on every dispatch so consumers see a new reference on every tick.
 */

const SEAT_COUNT = 4;
const NAMES = ["나 (호스트)", "봇 A", "봇 B", "봇 C", "봇 D", "봇 E", "봇 F", "봇 G"];

export interface TestState {
  state: MomontyState;
  events: unknown[];
  version: number;
  actingSeatId: string;
  seatNames: Record<string, string>;
}

let current: TestState | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Boot a fresh 4-seat local match. */
export function initTest(): void {
  const seatIds = Array.from({ length: SEAT_COUNT }, (_, i) => `s${i + 1}`);
  const seats: Seat[] = seatIds.map((id, i) => ({
    seatId: id,
    userId: id,
    displayName: NAMES[i] ?? id,
    ready: true,
    online: true,
    isHost: i === 0,
  }));
  const rng = makeRng(`test:${Date.now()}`);
  const config = { ...momontyGame.defaultConfig(), playerCount: SEAT_COUNT };
  const state = momontyGame.init({ seats, config, rng });
  current = {
    state: { ...state },
    events: [],
    version: 1,
    actingSeatId: state.seatOrder[0],
    seatNames: Object.fromEntries(seats.map((s) => [s.seatId, s.displayName])),
  };
  notify();
}

export function testDispatch(
  action: MomontyAction
): { ok: true } | { ok: false; error: string } {
  if (!current) return { ok: false, error: "not initialised" };
  const rng = makeRng(`test:${current.version}:${current.actingSeatId}`);
  try {
    const { state, events } = momontyGame.reduce({
      state: current.state,
      seatId: current.actingSeatId,
      action,
      rng,
    });
    // Auto-advance the acting seat when the phase makes it obvious
    // (e.g. PLAYING follows `currentSeatIdx`).
    const nextActing =
      state.phase === "PLAYING"
        ? state.seatOrder[state.currentSeatIdx]
        : state.phase === "DRAWING_RANK"
        ? // Prefer any seat that hasn't drawn yet, else stay.
          state.seatOrder.find((s) => state.drawRank?.picks?.[s] == null) ??
          current.actingSeatId
        : state.phase === "TAXATION"
        ? // Prefer any seat still owing tax.
          state.seatOrder.find(
            (s) =>
              (state.taxation.pendingUploads[s] ?? 0) > 0 ||
              (state.taxation.pendingReturns[s] ?? 0) > 0
          ) ?? current.actingSeatId
        : current.actingSeatId;

    // Shallow copy state so React notices the change.
    current = {
      ...current,
      state: { ...state },
      events,
      version: current.version + 1,
      actingSeatId: nextActing,
    };
    notify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function setActingSeat(seatId: string): void {
  if (!current) return;
  current = { ...current, actingSeatId: seatId };
  notify();
}

export function useTest<T>(sel: (s: TestState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(current ?? emptyState()),
    () => sel(emptyState())
  );
}

export function getTestState(): TestState | null {
  return current;
}

/**
 * Build a view for a specific seat with display names baked in so the
 * phase views can render "봇 A" instead of raw "s2".
 */
export function viewForSeat(seatId: string | null): MomontyView | null {
  if (!current) return null;
  const view = momontyGame.view(current.state, seatId) as MomontyView;
  return { ...view, seatNames: current.seatNames } as MomontyView & {
    seatNames: Record<string, string>;
  };
}

function emptyState(): TestState {
  return {
    state: null as unknown as MomontyState,
    events: [],
    version: 0,
    actingSeatId: "",
    seatNames: {},
  };
}

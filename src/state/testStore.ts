import { useSyncExternalStore } from "react";
import { momontyGame } from "@shared/games/momonty/logic";
import type { MomontyAction, MomontyState, MomontyView } from "@shared/games/momonty/logic";
import { makeRng, type Seat } from "@shared/engine";

/**
 * Test-mode store.
 *
 * Runs the shared Momonty engine entirely in-browser. No WebSocket, no
 * Durable Object — the local host is every seat, taking turns from a
 * "spy view" that reveals all hands. Purpose is to smoke-test the full
 * game flow end-to-end from the client without infra.
 *
 * The store re-uses the same reducer that ships to production, so a
 * successful flow here proves the engine + views on the whole match
 * loop (rank draw → tax → play → round-end → next round → match end).
 */

const SEAT_COUNT = 4;

export interface TestState {
  state: MomontyState;
  events: unknown[];
  version: number;
  /** Which seat we're currently acting as (defaults to state.currentSeatId). */
  actingSeatId: string;
  /** Seat display names for the UI. */
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
    state,
    events: [],
    version: 1,
    actingSeatId: state.seatOrder[0],
    seatNames: Object.fromEntries(seats.map((s) => [s.seatId, s.displayName])),
  };
  notify();
}

const NAMES = ["나 (호스트)", "봇 A", "봇 B", "봇 C", "봇 D", "봇 E", "봇 F", "봇 G"];

export function testDispatch(action: MomontyAction): { ok: true } | { ok: false; error: string } {
  if (!current) return { ok: false, error: "not initialised" };
  const rng = makeRng(`test:${current.version}:${current.actingSeatId}`);
  try {
    const { state, events } = momontyGame.reduce({
      state: current.state,
      seatId: current.actingSeatId,
      action,
      rng,
    });
    current = {
      ...current,
      state,
      events,
      version: current.version + 1,
      actingSeatId: state.phase === "PLAYING" ? state.seatOrder[state.currentSeatIdx] : current.actingSeatId,
    };
    notify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** In test mode we let the host jump to any seat (e.g. tax phase). */
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

export function viewForSeat(seatId: string | null): MomontyView | null {
  if (!current) return null;
  return momontyGame.view(current.state, seatId) as MomontyView;
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

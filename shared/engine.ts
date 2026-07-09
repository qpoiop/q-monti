/**
 * Data-driven game engine — the same module runs authoritatively on the DO
 * server, and drives client-side state prediction.
 *
 * A game is a self-contained triple (Config, State, Action) with reducers.
 * `view(state, seat)` produces a per-seat public projection that hides secret
 * information (hands, hidden cards, deck values) for other seats.
 *
 * Because Server and Client share this file, both can:
 *   - validate actions symmetrically,
 *   - client can optimistically replay to reduce perceived latency,
 *   - server has the single source of truth (seed + action log).
 *
 * Config is JSON — the room stores it verbatim and forwards it back to all
 * seats. New games register a `GameModule` and everything else (lobby, room,
 * transport, screens) is fed by this contract.
 */

export interface Seat {
  seatId: string;
  userId: string;
  displayName: string;
  ready: boolean;
  online: boolean;
  isHost: boolean;
}

/** Random source for deterministic replay. */
export interface Rng {
  nextInt(max: number): number; // [0, max)
  shuffle<T>(arr: T[]): T[];
}

/**
 * A game engine authors a module of type GameModule<Config, State, Action, View>.
 * The web and worker both import the same module by id.
 */
export interface GameModule<Cfg = unknown, State = unknown, Action = unknown, View = unknown> {
  id: string;
  displayName: string;
  koreanName: string;
  tagline: string;
  accent: string; // matches [data-accent] key in tokens.css
  minPlayers: number;
  maxPlayers: number;

  /** Default config shown in the room settings UI. */
  defaultConfig(): Cfg;

  /** Server-only: given seats + config + rng, produce initial state. */
  init(args: { seats: Seat[]; config: Cfg; rng: Rng }): State;

  /**
   * Reducer. Applies action for a given seat.
   * Returns { state, events } — events go to the history log and clients.
   * Throws if action invalid.
   */
  reduce(args: {
    state: State;
    seatId: string;
    action: Action;
    rng: Rng;
  }): { state: State; events: GameEvent[] };

  /** Server-only helper: has the round/match ended? */
  isTerminal(state: State): boolean;

  /**
   * Server-only helper: censor state for a specific seat.
   * Any seat receiving the room state gets `view(state, mySeat)`.
   */
  view(state: State, seatId: string | null): View;
}

/**
 * Broadcasted event. Useful for animation / history — separate from state
 * because state alone loses the "who did what just now" signal.
 */
export interface GameEvent {
  type: string;
  payload?: unknown;
  actorSeatId?: string;
}

/** Every registered game module exposes this shape to registries. */
export interface GameMeta {
  id: string;
  displayName: string;
  koreanName: string;
  tagline: string;
  accent: string;
  minPlayers: number;
  maxPlayers: number;
}

/* -------------------------- Deterministic RNG -------------------------- */

/** xoshiro128** seeded PRNG — deterministic replay. */
export function makeRng(seedStr: string): Rng {
  let s0 = 0,
    s1 = 0,
    s2 = 0,
    s3 = 0;
  // Simple hash to 4 32-bit lanes
  for (let i = 0; i < seedStr.length; i++) {
    const c = seedStr.charCodeAt(i);
    s0 = (s0 ^ c) * 0x9e3779b1 | 0;
    s1 = (s1 ^ (c + 0x85ebca6b)) * 0xc2b2ae35 | 0;
    s2 = (s2 ^ (c + 0x27d4eb2f)) * 0x165667b1 | 0;
    s3 = (s3 ^ (c + 0xd3a2646c)) * 0xd1b54a32 | 0;
  }
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1;

  function rotl(x: number, k: number) {
    return (x << k) | (x >>> (32 - k));
  }
  function next(): number {
    const result = rotl(s1 * 5, 7) * 9;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11);
    return result >>> 0;
  }

  return {
    nextInt(max) {
      if (max <= 0) return 0;
      return next() % max;
    },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = this.nextInt(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

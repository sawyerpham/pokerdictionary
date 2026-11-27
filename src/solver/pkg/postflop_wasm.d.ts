/* tslint:disable */
/* eslint-disable */

export class River {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * For the acting player: EV of each action for each hand, action-major ([a0h0, a0h1, ..., a1h0, ...]).
     */
    action_evs(): Float32Array;
    /**
     * The actions here as "Check,Bet:50,AllIn:300" (amounts are each player's total for the street).
     */
    actions(): string;
    /**
     * Chips each player has put in on the river so far.
     */
    bets(): Int32Array;
    /**
     * Showdown equity of each hand against the other player's range at this node.
     */
    equity(player: number): Float32Array;
    /**
     * EV of each hand in chips: what it expects to take from the pot, net of chips it puts in from here.
     */
    ev(player: number): Float32Array;
    /**
     * Moves to the node reached by these action indices from the root.
     */
    go(history: Uint32Array | number[]): void;
    /**
     * The player's hands, two card ids each: [a0, b0, a1, b1, ...]. Later per-hand arrays follow this order.
     */
    hands(player: number): Uint8Array;
    /**
     * Builds the tree. Bet and raise sizes use the solver's syntax, e.g. "50%, 100%" and "2.5x".
     */
    constructor(oop_range: Float32Array | number[], ip_range: Float32Array | number[], board: Uint8Array | number[], pot: number, stack: number, oop_bets: string, oop_raises: string, ip_bets: string, ip_raises: string);
    /**
     * Who acts here: 0 OOP, 1 IP, -1 at the end of the hand.
     */
    player(): number;
    /**
     * Runs CFR until `iterations` or the exploitability (in chips) drops to `target`. Returns the exploitability.
     */
    solve(iterations: number, target: number): number;
    /**
     * For the acting player: how often each hand takes each action, action-major.
     */
    strategy(): Float32Array;
    /**
     * How many combos of each hand reach this node.
     */
    weights(player: number): Float32Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_river_free: (a: number, b: number) => void;
    readonly river_action_evs: (a: number) => [number, number];
    readonly river_actions: (a: number) => [number, number];
    readonly river_bets: (a: number) => [number, number];
    readonly river_equity: (a: number, b: number) => [number, number];
    readonly river_ev: (a: number, b: number) => [number, number];
    readonly river_go: (a: number, b: number, c: number) => void;
    readonly river_hands: (a: number, b: number) => [number, number];
    readonly river_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => [number, number, number];
    readonly river_player: (a: number) => number;
    readonly river_solve: (a: number, b: number, c: number) => number;
    readonly river_strategy: (a: number) => [number, number];
    readonly river_weights: (a: number, b: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

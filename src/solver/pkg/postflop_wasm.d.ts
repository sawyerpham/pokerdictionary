/* tslint:disable */
/* eslint-disable */

export class Spot {
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
     * Chips each player has put in since the start of the spot.
     */
    bets(): Int32Array;
    /**
     * The board so far (4 or 5 cards).
     */
    board(): Uint8Array;
    /**
     * At a chance node, the cards that can come.
     */
    cards(): Uint8Array;
    /**
     * Showdown equity of each hand against the other player's range at this node.
     */
    equity(player: number): Float32Array;
    /**
     * EV of each hand in chips: what it expects to take from the pot, net of chips it puts in from here.
     */
    ev(player: number): Float32Array;
    /**
     * How many chips a perfect opponent could win from the current strategy, on average.
     */
    exploitability(): number;
    /**
     * Stops solving and makes the results readable.
     */
    finish(): void;
    /**
     * Moves to the node reached from the root by these steps: action indices, or a card id at a chance node.
     */
    go(history: Uint32Array | number[]): void;
    /**
     * The player's hands, two card ids each: [a0, b0, a1, b1, ...]. Later per-hand arrays follow this order.
     */
    hands(player: number): Uint8Array;
    /**
     * Memory the tree uses, in MB.
     */
    memory_mb(): number;
    /**
     * Builds the tree from a 4-card (turn) or 5-card (river) board. Each player's sizes apply on every street
     * and use the solver's syntax, e.g. "33%, 75%" and "2.5x".
     */
    constructor(oop_range: Float32Array | number[], ip_range: Float32Array | number[], board: Uint8Array | number[], pot: number, stack: number, oop_bets: string, oop_raises: string, ip_bets: string, ip_raises: string);
    /**
     * Who acts here: 0 OOP, 1 IP, 2 a card is dealt, -1 the hand is over.
     */
    player(): number;
    /**
     * One CFR iteration; `iteration` counts from 0.
     */
    step(iteration: number): void;
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
    readonly __wbg_spot_free: (a: number, b: number) => void;
    readonly spot_action_evs: (a: number) => [number, number];
    readonly spot_actions: (a: number) => [number, number];
    readonly spot_bets: (a: number) => [number, number];
    readonly spot_board: (a: number) => [number, number];
    readonly spot_cards: (a: number) => [number, number];
    readonly spot_equity: (a: number, b: number) => [number, number];
    readonly spot_ev: (a: number, b: number) => [number, number];
    readonly spot_exploitability: (a: number) => number;
    readonly spot_finish: (a: number) => void;
    readonly spot_go: (a: number, b: number, c: number) => void;
    readonly spot_hands: (a: number, b: number) => [number, number];
    readonly spot_memory_mb: (a: number) => number;
    readonly spot_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number) => [number, number, number];
    readonly spot_player: (a: number) => number;
    readonly spot_step: (a: number, b: number) => void;
    readonly spot_strategy: (a: number) => [number, number];
    readonly spot_weights: (a: number, b: number) => [number, number];
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

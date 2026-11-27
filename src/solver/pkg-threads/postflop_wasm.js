/* @ts-self-types="./postflop_wasm.d.ts" */
import { startWorkers } from './snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js';


export class Spot {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SpotFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_spot_free(ptr, 0);
    }
    /**
     * For the acting player: EV of each action for each hand, action-major ([a0h0, a0h1, ..., a1h0, ...]).
     * @returns {Float32Array}
     */
    action_evs() {
        const ret = wasm.spot_action_evs(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * The actions here as "Check,Bet:50,AllIn:300" (amounts are each player's total for the street).
     * @returns {string}
     */
    actions() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.spot_actions(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Chips each player has put in since the start of the spot.
     * @returns {Int32Array}
     */
    bets() {
        const ret = wasm.spot_bets(this.__wbg_ptr);
        var v1 = getArrayI32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * The board so far (3 to 5 cards).
     * @returns {Uint8Array}
     */
    board() {
        const ret = wasm.spot_board(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * At a chance node, the cards that can come.
     * @returns {Uint8Array}
     */
    cards() {
        const ret = wasm.spot_cards(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Showdown equity of each hand against the other player's range at this node.
     * @param {number} player
     * @returns {Float32Array}
     */
    equity(player) {
        const ret = wasm.spot_equity(this.__wbg_ptr, player);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * EV of each hand in chips: what it expects to take from the pot, net of chips it puts in from here.
     * @param {number} player
     * @returns {Float32Array}
     */
    ev(player) {
        const ret = wasm.spot_ev(this.__wbg_ptr, player);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * How many chips a perfect opponent could win from the current strategy, on average.
     * @returns {number}
     */
    exploitability() {
        const ret = wasm.spot_exploitability(this.__wbg_ptr);
        return ret;
    }
    /**
     * Stops solving and makes the results readable.
     */
    finish() {
        wasm.spot_finish(this.__wbg_ptr);
    }
    /**
     * Moves to the node reached from the root by these steps: action indices, or a card id at a chance node.
     * @param {Uint32Array | number[]} history
     */
    go(history) {
        const ptr0 = passArray32ToWasm0(history, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.spot_go(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * The player's hands, two card ids each: [a0, b0, a1, b1, ...]. Later per-hand arrays follow this order.
     * @param {number} player
     * @returns {Uint8Array}
     */
    hands(player) {
        const ret = wasm.spot_hands(this.__wbg_ptr, player);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Fixes the acting player's strategy at the node reached by `history` (action-major, like `strategy()`), so
     * solving again shows how the other player should exploit it. Call before solving.
     * @param {Uint32Array | number[]} history
     * @param {Float32Array | number[]} strategy
     */
    lock(history, strategy) {
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passArray32ToWasm0(history, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passArrayF32ToWasm0(strategy, wasm.__wbindgen_malloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 4, 4); }
            throw e;
        }
        const ret = wasm.spot_lock(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Memory the tree uses, in MB.
     * @returns {number}
     */
    memory_mb() {
        const ret = wasm.spot_memory_mb(this.__wbg_ptr);
        return ret;
    }
    /**
     * Builds the tree from a 3-card (flop), 4-card (turn) or 5-card (river) board. Sizes use the solver's syntax,
     * e.g. "33%, 75%" and "2.5x"; give one per street as "flop|turn|river" (a missing street repeats the last).
     * @param {Float32Array | number[]} oop_range
     * @param {Float32Array | number[]} ip_range
     * @param {Uint8Array | number[]} board
     * @param {number} pot
     * @param {number} stack
     * @param {string} oop_bets
     * @param {string} oop_raises
     * @param {string} ip_bets
     * @param {string} ip_raises
     */
    constructor(oop_range, ip_range, board, pot, stack, oop_bets, oop_raises, ip_bets, ip_raises) {
        const val8 = +pot;
        const val9 = +stack;
        let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6;
        try {
            ptr0 = passArrayF32ToWasm0(oop_range, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passArrayF32ToWasm0(ip_range, wasm.__wbindgen_malloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = passArray8ToWasm0(board, wasm.__wbindgen_malloc);
            len2 = WASM_VECTOR_LEN;
            ptr3 = passStringToWasm0(oop_bets, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len3 = WASM_VECTOR_LEN;
            ptr4 = passStringToWasm0(oop_raises, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len4 = WASM_VECTOR_LEN;
            ptr5 = passStringToWasm0(ip_bets, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len5 = WASM_VECTOR_LEN;
            ptr6 = passStringToWasm0(ip_raises, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len6 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr6) { wasm.__wbindgen_free(ptr6, len6 * 1, 1); }
            if (ptr5) { wasm.__wbindgen_free(ptr5, len5 * 1, 1); }
            if (ptr4) { wasm.__wbindgen_free(ptr4, len4 * 1, 1); }
            if (ptr3) { wasm.__wbindgen_free(ptr3, len3 * 1, 1); }
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 4, 4); }
            throw e;
        }
        const ret = wasm.spot_new(ptr0, len0, ptr1, len1, ptr2, len2, val8, val9, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        SpotFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Who acts here: 0 OOP, 1 IP, 2 a card is dealt, -1 the hand is over.
     * @returns {number}
     */
    player() {
        const ret = wasm.spot_player(this.__wbg_ptr);
        return ret;
    }
    /**
     * One CFR iteration; `iteration` counts from 0.
     * @param {number} iteration
     */
    step(iteration) {
        wasm.spot_step(this.__wbg_ptr, iteration);
    }
    /**
     * For the acting player: how often each hand takes each action, action-major.
     * @returns {Float32Array}
     */
    strategy() {
        const ret = wasm.spot_strategy(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * How many combos of each hand reach this node.
     * @param {number} player
     * @returns {Float32Array}
     */
    weights(player) {
        const ret = wasm.spot_weights(this.__wbg_ptr, player);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) Spot.prototype[Symbol.dispose] = Spot.prototype.free;

/**
 * @param {number} num_threads
 * @returns {Promise<any>}
 */
export function initThreadPool(num_threads) {
    const ret = wasm.initThreadPool(num_threads);
    return ret;
}

export class wbg_rayon_PoolBuilder {
    static __wrap(ptr) {
        const obj = Object.create(wbg_rayon_PoolBuilder.prototype);
        obj.__wbg_ptr = ptr;
        wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        wbg_rayon_PoolBuilderFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
    }
    build() {
        wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
    }
    /**
     * @returns {number}
     */
    numThreads() {
        const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    receiver() {
        const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;

/**
 * @param {number} receiver
 */
export function wbg_rayon_start_worker(receiver) {
    wasm.wbg_rayon_start_worker(receiver);
}
function __wbg_get_imports(memory) {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_undefined_be5b34249ff1fc15: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_memory_17a1178bc3328ea3: function() {
            const ret = wasm.memory;
            return ret;
        },
        __wbg___wbindgen_module_2e98e71e8e96b4ac: function() {
            const ret = wasmModule;
            return ret;
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_instanceof_Window_5cf453f5639aa1a2: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_startWorkers_8b582d57e92bd2d4: function(arg0, arg1, arg2) {
            const ret = startWorkers(arg0, arg1, wbg_rayon_PoolBuilder.__wrap(arg2));
            return ret;
        },
        __wbg_static_accessor_GLOBAL_THIS_003ee833af9699fc: function() {
            const ret = typeof globalThis === 'undefined' ? undefined : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_e4293fb22cbe77da: function() {
            const ret = typeof global === 'undefined' ? undefined : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_53bb20457401453d: function() {
            const ret = typeof self === 'undefined' ? undefined : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_b5e0810bfecb7feb: function() {
            const ret = typeof window === 'undefined' ? undefined : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
        memory: memory || new WebAssembly.Memory({initial:18,maximum:65536,shared:true}),
    };
    return {
        __proto__: null,
        "./postflop_wasm_bg.js": import0,
    };
}

const SpotFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_spot_free(ptr, 1));
const wbg_rayon_PoolBuilderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayI32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getInt32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedInt32ArrayMemory0 = null;
function getInt32ArrayMemory0() {
    if (cachedInt32ArrayMemory0 === null || cachedInt32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedInt32ArrayMemory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true }) : undefined);
if (cachedTextDecoder) cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes.slice());
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined);

if (cachedTextEncoder) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module, thread_stack_size) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedInt32ArrayMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    if (typeof thread_stack_size !== 'undefined' && (typeof thread_stack_size !== 'number' || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
        throw new Error('invalid stack size');
    }

    wasm.__wbindgen_start(thread_stack_size);
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module, memory, thread_stack_size} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports(memory);
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module, thread_stack_size);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path, memory) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path, memory);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path, memory) {
    let thread_stack_size
    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path, memory, thread_stack_size} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('postflop_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports(memory);

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module, thread_stack_size);
}

export { initSync, __wbg_init as default };

//! flopsolve: solves one heads-up spot and prints every node of its first street as JSON (the format of
//! public/flops/*/*.json). Reads the job as JSON on stdin. Threads: RAYON_NUM_THREADS. Progress goes to stderr as
//! "progress <iteration> <exploitability as % of the pot>".
//!
//!   {"oop": [1326 weights], "ip": [...], "board": [3 card ids], "pot": 55, "stack": 975,
//!    "oopBets": "|66%|75%", "oopRaises": "3x||", "ipBets": "33%|66%|75%", "ipRaises": "3x||",
//!    "target": 0.01, "maxIterations": 400, "estimate": false}
//!
//! With "estimate": true it only prints {"mb": memory the tree needs}.
use base64::{engine::general_purpose::STANDARD, Engine};
use postflop_solver::*;
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::{Read, Write};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Job {
    oop: Vec<f32>,
    ip: Vec<f32>,
    board: Vec<u8>,
    pot: i32,
    stack: i32,
    oop_bets: String,
    oop_raises: String,
    ip_bets: String,
    ip_raises: String,
    #[serde(default = "target")]
    target: f32,
    #[serde(default = "max_iterations")]
    max_iterations: u32,
    #[serde(default)]
    estimate: bool,
}
fn target() -> f32 {
    0.01
}
fn max_iterations() -> u32 {
    400
}

/// Above this the tree is stored as 16-bit integers (about half the memory, slightly slower).
const PLAIN: u64 = 2 << 30;

fn street(s: &str, k: usize) -> String {
    let parts: Vec<&str> = s.split('|').collect();
    parts[k.min(parts.len() - 1)].to_string()
}

fn build(job: &Job) -> Result<PostFlopGame, String> {
    let card_config = CardConfig {
        range: [Range::from_raw_data(&job.oop)?, Range::from_raw_data(&job.ip)?],
        flop: [job.board[0], job.board[1], job.board[2]],
        turn: job.board.get(3).copied().unwrap_or(NOT_DEALT),
        river: job.board.get(4).copied().unwrap_or(NOT_DEALT),
    };
    let first = job.board.len() - 3;
    let sizes = |k: usize| -> Result<[BetSizeOptions; 2], String> {
        let k = k.saturating_sub(first);
        Ok([
            BetSizeOptions::try_from((street(&job.oop_bets, k).as_str(), street(&job.oop_raises, k).as_str()))?,
            BetSizeOptions::try_from((street(&job.ip_bets, k).as_str(), street(&job.ip_raises, k).as_str()))?,
        ])
    };
    let tree_config = TreeConfig {
        initial_state: [BoardState::Flop, BoardState::Turn, BoardState::River][first],
        starting_pot: job.pot,
        effective_stack: job.stack,
        flop_bet_sizes: sizes(0)?,
        turn_bet_sizes: sizes(1)?,
        river_bet_sizes: sizes(2)?,
        add_allin_threshold: 1.5,
        force_allin_threshold: 0.15,
        merging_threshold: 0.1,
        ..Default::default()
    };
    PostFlopGame::with_config(card_config, ActionTree::new(tree_config)?)
}

fn b64(bytes: &[u8]) -> String {
    STANDARD.encode(bytes)
}
fn i16s(xs: &[f32], scale: f32) -> String {
    b64(&xs.iter().flat_map(|&x| ((x * scale).round().clamp(-32768.0, 32767.0) as i16).to_le_bytes()).collect::<Vec<u8>>())
}
fn u8s(xs: &[f32]) -> String {
    b64(&xs.iter().map(|&x| (x * 255.0).round().clamp(0.0, 255.0) as u8).collect::<Vec<u8>>())
}

fn actions(game: &PostFlopGame) -> String {
    game.available_actions()
        .iter()
        .map(|a| match a {
            Action::Fold => "Fold".to_string(),
            Action::Check => "Check".to_string(),
            Action::Call => "Call".to_string(),
            Action::Bet(n) => format!("Bet:{n}"),
            Action::Raise(n) => format!("Raise:{n}"),
            Action::AllIn(n) => format!("AllIn:{n}"),
            _ => "?".to_string(),
        })
        .collect::<Vec<_>>()
        .join(",")
}

/// Every node of the first street, depth first.
fn walk(game: &mut PostFlopGame, history: &mut Vec<usize>, street: usize, out: &mut Vec<Value>) {
    game.apply_history(history);
    game.cache_normalized_weights();
    let bets = game.total_bet_amount();
    let p = if game.is_terminal_node() {
        -1
    } else if game.is_chance_node() {
        2
    } else {
        game.current_player() as i32
    };
    if (p == 0 || p == 1) && game.current_board().len() == street {
        let n = game.available_actions().len();
        out.push(json!({
            "h": history, "p": p, "a": actions(game), "b": bets,
            "s": u8s(&game.strategy()),
            "e": i16s(&game.expected_values_detail(p as usize), 10.0),
        }));
        for a in 0..n {
            history.push(a);
            walk(game, history, street, out);
            history.pop();
        }
    } else {
        out.push(json!({ "h": history, "p": p, "b": bets }));
    }
}

fn fail(msg: impl std::fmt::Display) -> ! {
    eprintln!("{msg}");
    std::process::exit(2);
}

fn main() {
    let mut input = String::new();
    std::io::stdin().read_to_string(&mut input).unwrap_or_else(|e| fail(e));
    let job: Job = serde_json::from_str(&input).unwrap_or_else(|e| fail(format!("bad job: {e}")));
    let mut game = build(&job).unwrap_or_else(|e| fail(e));
    let (plain, compressed) = game.memory_usage();
    let compress = plain > PLAIN;
    let mb = (if compress { compressed } else { plain }) >> 20;
    if job.estimate {
        println!("{}", json!({ "mb": mb, "plainMb": plain >> 20, "compressedMb": compressed >> 20 }));
        return;
    }
    game.allocate_memory(compress);

    let goal = job.pot as f32 * job.target;
    let mut e = compute_exploitability(&game);
    let mut it = 0;
    let mut err = std::io::stderr();
    while e > goal && it < job.max_iterations {
        solve_step(&game, it);
        it += 1;
        if it % 10 == 0 {
            e = compute_exploitability(&game);
            let _ = writeln!(err, "progress {it} {:.3}", e / job.pot as f32 * 100.0);
        }
    }
    finalize(&mut game);

    let street = job.board.len();
    let mut nodes = Vec::new();
    walk(&mut game, &mut Vec::new(), street, &mut nodes);
    game.apply_history(&[]);
    game.cache_normalized_weights();
    let hands: Vec<String> = (0..2).map(|p| b64(&game.private_cards(p).iter().flat_map(|&(a, b)| [a, b]).collect::<Vec<u8>>())).collect();
    let weights: Vec<String> = (0..2).map(|p| u8s(game.normalized_weights(p))).collect();
    // Each hand's EV at the start (chips x10) and its raw equity: how much of its equity it turns into chips.
    let ev: Vec<String> = (0..2).map(|p| i16s(&game.expected_values(p), 10.0)).collect();
    let equity: Vec<String> = (0..2).map(|p| u8s(&game.equity(p))).collect();
    let out = json!({
        "board": job.board, "hands": hands, "weights": weights, "nodes": nodes, "rootEv": ev, "rootEquity": equity,
        "exploitability": (e / job.pot as f32 * 10000.0).round() / 100.0, "iterations": it, "mb": mb,
    });
    println!("{out}");
}

//! A heads-up turn or river spot solved by postflop-solver, exposed to JavaScript.
//!
//! Cards use the solver's ids: 4 * rank + suit, rank 0 = deuce .. 12 = ace, suit c d h s = 0..3.
//! Ranges are 1326 weights in the solver's card-pair order (see `Range::from_raw_data`).
//! Player 0 is out of position (acts first on each street), 1 is in position.

use postflop_solver::*;
use wasm_bindgen::prelude::*;

/// Largest tree we allocate, in bytes. Above `PLAIN` values are stored as 16-bit integers.
const PLAIN: u64 = 600 << 20;
const MAX: u64 = 1200 << 20;

#[wasm_bindgen]
pub struct Spot {
    game: PostFlopGame,
}

#[wasm_bindgen]
impl Spot {
    /// Builds the tree from a 4-card (turn) or 5-card (river) board. Each player's sizes apply on every street
    /// and use the solver's syntax, e.g. "33%, 75%" and "2.5x".
    #[wasm_bindgen(constructor)]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        oop_range: &[f32],
        ip_range: &[f32],
        board: &[u8],
        pot: i32,
        stack: i32,
        oop_bets: &str,
        oop_raises: &str,
        ip_bets: &str,
        ip_raises: &str,
    ) -> Result<Spot, String> {
        if board.len() != 4 && board.len() != 5 {
            return Err("Pick four board cards for a turn spot or five for a river spot".into());
        }
        let card_config = CardConfig {
            range: [Range::from_raw_data(oop_range)?, Range::from_raw_data(ip_range)?],
            flop: [board[0], board[1], board[2]],
            turn: board[3],
            river: board.get(4).copied().unwrap_or(NOT_DEALT),
        };
        let sizes = [BetSizeOptions::try_from((oop_bets, oop_raises))?, BetSizeOptions::try_from((ip_bets, ip_raises))?];
        let tree_config = TreeConfig {
            initial_state: if board.len() == 4 { BoardState::Turn } else { BoardState::River },
            starting_pot: pot,
            effective_stack: stack,
            turn_bet_sizes: sizes.clone(),
            river_bet_sizes: sizes,
            add_allin_threshold: 1.5,
            force_allin_threshold: 0.15,
            merging_threshold: 0.1,
            ..Default::default()
        };
        let mut game = PostFlopGame::with_config(card_config, ActionTree::new(tree_config)?)?;
        let (plain, compressed) = game.memory_usage();
        if compressed > MAX {
            return Err(format!("This tree needs {} MB, over the {} MB limit. Use fewer bet sizes.", compressed >> 20, MAX >> 20));
        }
        game.allocate_memory(plain > PLAIN);
        Ok(Spot { game })
    }

    /// Memory the tree uses, in MB.
    pub fn memory_mb(&self) -> f64 {
        let (plain, compressed) = self.game.memory_usage();
        (if plain > PLAIN { compressed } else { plain }) as f64 / (1 << 20) as f64
    }

    /// One CFR iteration; `iteration` counts from 0.
    pub fn step(&self, iteration: u32) {
        solve_step(&self.game, iteration);
    }

    /// How many chips a perfect opponent could win from the current strategy, on average.
    pub fn exploitability(&self) -> f32 {
        compute_exploitability(&self.game)
    }

    /// Stops solving and makes the results readable.
    pub fn finish(&mut self) {
        finalize(&mut self.game);
        self.game.cache_normalized_weights();
    }

    /// Moves to the node reached from the root by these steps: action indices, or a card id at a chance node.
    pub fn go(&mut self, history: &[u32]) {
        let h: Vec<usize> = history.iter().map(|&a| a as usize).collect();
        self.game.apply_history(&h);
        self.game.cache_normalized_weights();
    }

    /// Who acts here: 0 OOP, 1 IP, 2 a card is dealt, -1 the hand is over.
    pub fn player(&self) -> i32 {
        if self.game.is_terminal_node() {
            -1
        } else if self.game.is_chance_node() {
            2
        } else {
            self.game.current_player() as i32
        }
    }

    /// The actions here as "Check,Bet:50,AllIn:300" (amounts are each player's total for the street).
    pub fn actions(&self) -> String {
        if self.game.is_chance_node() {
            return String::new();
        }
        self.game
            .available_actions()
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

    /// At a chance node, the cards that can come.
    pub fn cards(&self) -> Vec<u8> {
        let mask = self.game.possible_cards();
        (0..52u8).filter(|&c| mask & (1 << c) != 0).collect()
    }

    /// The board so far (4 or 5 cards).
    pub fn board(&self) -> Vec<u8> {
        self.game.current_board()
    }

    /// Chips each player has put in since the start of the spot.
    pub fn bets(&self) -> Vec<i32> {
        self.game.total_bet_amount().to_vec()
    }

    /// The player's hands, two card ids each: [a0, b0, a1, b1, ...]. Later per-hand arrays follow this order.
    pub fn hands(&self, player: usize) -> Vec<u8> {
        self.game.private_cards(player).iter().flat_map(|&(a, b)| [a, b]).collect()
    }

    /// How many combos of each hand reach this node.
    pub fn weights(&self, player: usize) -> Vec<f32> {
        self.game.normalized_weights(player).to_vec()
    }

    /// Showdown equity of each hand against the other player's range at this node.
    pub fn equity(&self, player: usize) -> Vec<f32> {
        self.game.equity(player)
    }

    /// EV of each hand in chips: what it expects to take from the pot, net of chips it puts in from here.
    pub fn ev(&self, player: usize) -> Vec<f32> {
        self.game.expected_values(player)
    }

    /// For the acting player: EV of each action for each hand, action-major ([a0h0, a0h1, ..., a1h0, ...]).
    pub fn action_evs(&self) -> Vec<f32> {
        self.game.expected_values_detail(self.game.current_player())
    }

    /// For the acting player: how often each hand takes each action, action-major.
    pub fn strategy(&self) -> Vec<f32> {
        self.game.strategy()
    }
}

//! A heads-up river spot solved by postflop-solver, exposed to JavaScript.
//!
//! Cards use the solver's ids: 4 * rank + suit, rank 0 = deuce .. 12 = ace, suit c d h s = 0..3.
//! Ranges are 1326 weights in the solver's card-pair order (see `Range::from_raw_data`).
//! Player 0 is out of position (acts first), 1 is in position.

use postflop_solver::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct River {
    game: PostFlopGame,
}

#[wasm_bindgen]
impl River {
    /// Builds the tree. Bet and raise sizes use the solver's syntax, e.g. "50%, 100%" and "2.5x".
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
    ) -> Result<River, String> {
        if board.len() != 5 {
            return Err("A river spot needs five board cards".into());
        }
        let card_config = CardConfig {
            range: [Range::from_raw_data(oop_range)?, Range::from_raw_data(ip_range)?],
            flop: [board[0], board[1], board[2]],
            turn: board[3],
            river: board[4],
        };
        let tree_config = TreeConfig {
            initial_state: BoardState::River,
            starting_pot: pot,
            effective_stack: stack,
            river_bet_sizes: [
                BetSizeOptions::try_from((oop_bets, oop_raises))?,
                BetSizeOptions::try_from((ip_bets, ip_raises))?,
            ],
            add_allin_threshold: 1.5,
            force_allin_threshold: 0.15,
            merging_threshold: 0.1,
            ..Default::default()
        };
        let mut game = PostFlopGame::with_config(card_config, ActionTree::new(tree_config)?)?;
        game.allocate_memory(false);
        Ok(River { game })
    }

    /// Runs CFR until `iterations` or the exploitability (in chips) drops to `target`. Returns the exploitability.
    pub fn solve(&mut self, iterations: u32, target: f32) -> f32 {
        let e = solve(&mut self.game, iterations, target, false);
        self.game.cache_normalized_weights();
        e
    }

    /// Moves to the node reached by these action indices from the root.
    pub fn go(&mut self, history: &[u32]) {
        let h: Vec<usize> = history.iter().map(|&a| a as usize).collect();
        self.game.apply_history(&h);
        self.game.cache_normalized_weights();
    }

    /// Who acts here: 0 OOP, 1 IP, -1 at the end of the hand.
    pub fn player(&self) -> i32 {
        if self.game.is_terminal_node() { -1 } else { self.game.current_player() as i32 }
    }

    /// The actions here as "Check,Bet:50,AllIn:300" (amounts are each player's total for the street).
    pub fn actions(&self) -> String {
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

    /// Chips each player has put in on the river so far.
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

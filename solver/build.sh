#!/bin/sh
# Rebuilds src/solver/pkg (committed) from this crate. Needs only Docker; runs on x86_64 or arm64.
set -e
cd "$(dirname "$0")/.."
docker run --rm -e OWNER="$(id -u):$(id -g)" -v "$PWD":/w -w /w/solver rust:1 sh -ec '
  rustup target add wasm32-unknown-unknown
  RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown
  V=$(grep -A1 "^name = \"wasm-bindgen\"$" Cargo.lock | sed -n "s/^version = \"\(.*\)\"/\1/p")
  T=wasm-bindgen-$V-$(uname -m)-unknown-linux-gnu
  curl -fsSL https://github.com/wasm-bindgen/wasm-bindgen/releases/download/$V/$T.tar.gz | tar xz -C /tmp
  /tmp/$T/wasm-bindgen --target web --out-dir ../src/solver/pkg target/wasm32-unknown-unknown/release/postflop_wasm.wasm
  rm -f ../src/solver/pkg/.gitignore
  chown -R "$OWNER" ../src/solver/pkg target Cargo.lock'

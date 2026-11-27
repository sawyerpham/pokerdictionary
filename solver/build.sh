#!/bin/sh
# Rebuilds src/solver/pkg (single-threaded) and src/solver/pkg-threads (every core; nightly Rust with atomics), both
# committed, from this crate. Needs only Docker; runs on x86_64 or arm64.
set -e
cd "$(dirname "$0")/.."
docker run --rm -e OWNER="$(id -u):$(id -g)" -v "$PWD":/w -w /w/solver rust:1 sh -ec '
  rustup target add wasm32-unknown-unknown
  rustup toolchain install nightly --profile minimal --component rust-src --target wasm32-unknown-unknown
  V=$(tr -d "\r" < Cargo.lock | grep -A1 "^name = \"wasm-bindgen\"$" | sed -n "s/^version = \"\(.*\)\"/\1/p")
  T=wasm-bindgen-$V-$(uname -m)-unknown-linux-gnu
  curl -fsSL https://github.com/wasm-bindgen/wasm-bindgen/releases/download/$V/$T.tar.gz | tar xz -C /tmp
  RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown
  /tmp/$T/wasm-bindgen --target web --out-dir ../src/solver/pkg target/wasm32-unknown-unknown/release/postflop_wasm.wasm
  RUSTFLAGS="-C target-feature=+atomics,+bulk-memory,+mutable-globals,+simd128 -C link-arg=--shared-memory -C link-arg=--import-memory -C link-arg=--max-memory=4294967296 -C link-arg=--export=__wasm_init_tls -C link-arg=--export=__tls_size -C link-arg=--export=__tls_align -C link-arg=--export=__tls_base" \
    cargo +nightly build --release --target wasm32-unknown-unknown --features threads --target-dir target-threads -Z build-std=panic_abort,std
  /tmp/$T/wasm-bindgen --target web --out-dir ../src/solver/pkg-threads target-threads/wasm32-unknown-unknown/release/postflop_wasm.wasm
  # The thread helper imports its package by folder, which needs a package.json; point it at the file instead.
  sed -i "s#await import(.\.\./\.\./\.\..);#await import(\x27../../../postflop_wasm.js\x27);#" ../src/solver/pkg-threads/snippets/*/src/workerHelpers.js
  rm -f ../src/solver/pkg/.gitignore ../src/solver/pkg-threads/.gitignore
  chown -R "$OWNER" ../src/solver/pkg ../src/solver/pkg-threads target target-threads Cargo.lock'

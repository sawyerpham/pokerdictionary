#!/bin/sh
# Builds solver/native/bin/flopsolve.exe (Windows, x86-64 with AVX2) with Docker. Runs on x86_64 or arm64 Linux.
set -e
cd "$(dirname "$0")"
docker run --rm -e OWNER="$(id -u):$(id -g)" -v "$PWD":/w -w /w rust:1 sh -ec '
  apt-get update -qq && apt-get install -y -qq gcc-mingw-w64-x86-64 >/dev/null
  rustup target add x86_64-pc-windows-gnu
  RUSTFLAGS="-C target-cpu=x86-64-v3 -C link-arg=-static" CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER=x86_64-w64-mingw32-gcc \
    cargo build --release --target x86_64-pc-windows-gnu
  mkdir -p bin && cp target/x86_64-pc-windows-gnu/release/flopsolve.exe bin/
  chown -R "$OWNER" bin target Cargo.lock'

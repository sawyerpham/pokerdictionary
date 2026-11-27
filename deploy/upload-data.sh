#!/bin/sh
# Copies the computed study data that isn't in git (public/flops, public/reports: flop libraries and board reports,
# made by scripts/compute.ts) to the server, where compose.yml mounts it read-only. Run from the repo after computing.
# Replaces the server copy in one step, so the site never sees a half-uploaded library.
set -eu
cd "$(dirname "$0")/.."
tar czf - -C public flops reports | ssh ubuntu@64.181.220.49 '
  set -e
  rm -rf ~/poker-data.new && mkdir -p ~/poker-data.new && tar xzf - -C ~/poker-data.new
  rm -rf ~/poker-data.old && { [ -d ~/poker-data ] && mv ~/poker-data ~/poker-data.old || true; } && mv ~/poker-data.new ~/poker-data
  rm -rf ~/poker-data.old && du -sh ~/poker-data'

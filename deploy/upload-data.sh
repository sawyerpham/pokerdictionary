#!/bin/sh
# Copies the computed study data that isn't in git (public/flops, public/reports: flop libraries and board reports,
# made by scripts/compute.ts) to ~/poker-data on the server, which compose.yml mounts read-only. Run from the repo after
# computing. Each folder is swapped in one step, so the site never sees a half-uploaded library; ~/poker-data itself
# stays put, since the running container is bound to it.
set -eu
cd "$(dirname "$0")/.."
tar czf - -C public flops reports | ssh ubuntu@64.181.220.49 '
  set -e
  cd ~/poker-data
  rm -rf .new && mkdir .new && tar xzf - -C .new
  for d in flops reports; do rm -rf ".old-$d"; [ -d "$d" ] && mv "$d" ".old-$d"; mv ".new/$d" "$d"; rm -rf ".old-$d"; done
  rmdir .new && du -sh ~/poker-data'

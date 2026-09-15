#!/usr/bin/env bash
#
# nproc-census.sh — what is using this account's NPROC budget, right now.
#
# CloudLinux counts every THREAD against NPROC (limit: 100 on this account), not
# just processes. `ps` shows 9 processes and looks harmless while those 9 hold
# 100 threads between them, which is how this was misdiagnosed for a month.
#
# Written with bash builtins only — no ps, no wc, no pipes, no $( ) — because the
# moment you most need it is when the account is at its limit and any command
# that forks fails with "Resource temporarily unavailable".
#
# Usage:
#   bash ~/scripts/nproc-census.sh            # print a report
#   bash ~/scripts/nproc-census.sh --log      # append one line to the log
#
# For a history, cron the --log form every 10 minutes (cPanel -> Cron Jobs):
#   */10 * * * * bash $HOME/scripts/nproc-census.sh --log
# Then, after the next 503, the log shows which process grew and when.

LOG="$HOME/logs/nproc-census.log"
LIMIT=100

total=0
rows=()

for proc in /proc/[0-9]*; do
  pid=${proc#/proc/}
  # stderr redirect must come first: redirections apply left to right, so a
  # process that exits mid-scan would otherwise print an error on the `<`.
  read -r comm 2>/dev/null < "$proc/comm" || continue

  # Thread count: one entry per task directory.
  threads=0
  for _ in "$proc"/task/*; do threads=$((threads + 1)); done
  total=$((total + threads))

  # Full command line, NUL-separated in /proc; builtins-only conversion.
  cmd=""
  if read -r -d '' first 2>/dev/null < "$proc/cmdline"; then cmd=$first; fi
  label=$comm
  case $cmd in
    *frontend*) label="$comm (frontend)" ;;
    *cms.beaconarabia.com*) label="$comm (cms)" ;;
  esac

  rows+=("$threads|$pid|$label")
done

if [[ $1 == "--log" ]]; then
  mkdir -p "${LOG%/*}" 2>/dev/null
  printf -v stamp '%(%Y-%m-%d %H:%M)T' -1
  line="$stamp total=$total/$LIMIT"
  for r in "${rows[@]}"; do
    IFS='|' read -r t p l <<< "$r"
    # Only processes worth a column: anything with more than one thread.
    (( t > 1 )) && line+=" | $l pid=$p threads=$t"
  done
  echo "$line" >> "$LOG"
  exit 0
fi

echo
echo "  NPROC (threads) in use: $total / $LIMIT"
if   (( total >= LIMIT ));      then echo "  STATUS: AT LIMIT — new processes cannot start; expect 503s"
elif (( total >= LIMIT * 8 / 10 )); then echo "  STATUS: WARNING — a deploy or restart will likely hit the limit"
else                                 echo "  STATUS: OK"
fi
echo
echo "  THREADS  PID      PROCESS"

# Crude insertion sort by thread count, descending — builtins only.
sorted=()
for r in "${rows[@]}"; do
  t=${r%%|*}
  placed=0
  new=()
  for s in "${sorted[@]}"; do
    if (( ! placed && t > ${s%%|*} )); then new+=("$r"); placed=1; fi
    new+=("$s")
  done
  (( placed )) || new+=("$r")
  sorted=("${new[@]}")
done

node_frontend=0
node_cms=0
for r in "${sorted[@]}"; do
  IFS='|' read -r t p l <<< "$r"
  printf "  %7s  %-7s  %s\n" "$t" "$p" "$l"
  [[ $l == *"(frontend)"* ]] && node_frontend=$((node_frontend + 1))
  [[ $l == *"(cms)"* ]] && node_cms=$((node_cms + 1))
done

echo
# More than one instance per app is the known failure on this host: Passenger
# fails to reap the old process after a restart, and each leftover keeps its
# full thread pool.
(( node_frontend > 1 )) && echo "  !! $node_frontend frontend processes — likely leftovers from a graceful restart"
(( node_cms > 1 ))      && echo "  !! $node_cms CMS processes — likely leftovers from a graceful restart"
echo "  (healthy: exactly one lsnode process per app)"
echo

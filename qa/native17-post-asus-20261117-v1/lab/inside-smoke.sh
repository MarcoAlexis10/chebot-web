#!/bin/sh
# REVIEW ONLY: dormant recipe. No environment flag can activate this artifact.
printf '%s\n' 'HELD: separately authorized materialization required'
exit 78

# Proposed inside-namespace controller, NOT executed in this batch.
set -eu
umask 077
PG=/usr/lib/postgresql/17/bin
export PGHOST=/socket PGPORT=6543 PGUSER=pgqa PGDATABASE=postgres
test "$(id -u)" = 65534
test ! -e /mnt/c
test ! -e /var/run/docker.sock
grep -Eq '^CapEff:[[:space:]]*0+$' /proc/self/status
grep -Eq '^NoNewPrivs:[[:space:]]*1$' /proc/self/status
grep -Eq '^Seccomp:[[:space:]]*2$' /proc/self/status
case "$("$PG/postgres" --version)" in
  'postgres (PostgreSQL) 17.11'|'postgres (PostgreSQL) 17.11 ('*')') ;;
  *) exit 65 ;;
esac
test -w /data && test -w /socket && test -w /tmp
# Outer observer must verify effective systemd limits and namespace/mount cuts.
printf '%s\n' LAB_PREPARED
IFS= read -r release
test "$release" = RELEASE_SMOKE
started=0
finish() {
  rc=$?
  trap - EXIT HUP INT TERM
  if test "$started" = 1; then
    if ! "$PG/pg_ctl" -D /data -m fast -w -t 15 stop; then
      printf '%s\n' UNKNOWN_STOP_UNCONFIRMED
      exit 70
    fi
  fi
  exit "$rc"
}
trap finish EXIT HUP INT TERM
# No --no-sync, fsync=off or synchronous_commit=off; data is still volatile tmpfs.
"$PG/initdb" -D /data -U pgqa --auth-local=peer --auth-host=reject --locale=C --encoding=UTF8 --data-checksums
started=1
"$PG/pg_ctl" -D /data -l /tmp/postgres.log -w -t 15 \
  -o "-c listen_addresses='' -c unix_socket_directories=/socket -c unix_socket_permissions=0700 -c port=6543 -c fsync=on -c synchronous_commit=on -c full_page_writes=on -c max_connections=8 -c shared_buffers=32MB -c log_statement=none -c log_min_error_statement=panic" start
observed=$("$PG/psql" -X -v ON_ERROR_STOP=1 -At \
  -c "select current_setting('server_version_num'),current_setting('listen_addresses'),current_user,current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes');")
test "$observed" = '170011||pgqa|on|on|on'
printf '%s\n' "$observed"
"$PG/pg_ctl" -D /data -m fast -w -t 15 stop
started=0
printf '%s\n' SMOKE_STOP_CONFIRMED_NOT_A_NATIVE_SUITE_PASS

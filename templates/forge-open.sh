# SlashForge — open a generated document in the user's browser.
#
# Installed verbatim alongside the guide files. Every command that writes an HTML
# artefact calls this rather than carrying its own copy of the platform
# detection, so the behaviour cannot drift between them.
#
# Usage:  sh <path-to-this>/forge-open.sh "docs/slashforge/specs/foo.html"
#
# Sourced with `sh`, so no executable bit is required and it works the same on a
# Git Bash shell as on macOS.
#
# It is BEST-EFFORT and deliberately timid:
#   - $SSH_CONNECTION set     -> remote session, opening a browser is useless
#   - no $DISPLAY/$WAYLAND    -> headless Linux, there is nothing to open into
#   - any failure             -> swallowed; this must never fail the run
#
# Exits 0 in every case. The caller reports the path either way.

doc="$1"
[ -n "$doc" ] || exit 0

if [ -n "$SSH_CONNECTION" ]; then
  exit 0
fi

case "$(uname -s)" in
  Darwin)
    open "$doc" 2>/dev/null || true
    ;;
  Linux)
    if grep -qi microsoft /proc/version 2>/dev/null; then
      wslview "$doc" 2>/dev/null || explorer.exe "$(wslpath -w "$doc")" 2>/dev/null || true
    elif [ -n "${DISPLAY}${WAYLAND_DISPLAY}" ]; then
      xdg-open "$doc" >/dev/null 2>&1 || true
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    start "" "$doc" 2>/dev/null || true
    ;;
esac

exit 0

# Setup git hooks for OJFlow
# Run once after cloning: pwsh scripts/setup-githooks.ps1

$hookDir = ".githooks"
if (-not (Test-Path $hookDir)) {
  Write-Error ".githooks/ directory not found. Run from project root."
  exit 1
}

git config core.hooksPath $hookDir
Write-Output "Git hooks configured. Hooks path: $hookDir"
Write-Output "Pre-commit hook will auto-run: eslint --fix + prettier --write"

# Send a task to Codex from the command line (used by Claude, or by you).
#
# Usage:
#   powershell -File tools\codex.ps1 -PromptFile docs\codex-review-request.md
#   powershell -File tools\codex.ps1 -Write -Prompt "Fix the README contradiction."
#
# By default Codex can only READ files. Pass -Write to let it edit files in this folder.
# Codex's final answer is printed and saved to -Out (default: tools\codex-last.md).
# Finds the newest codex.exe bundled with the Codex app, so it keeps working after app updates.
#
# Pick the model by job:
#   -Model gpt-6-luna   cheap, fast: format checks, timing checks, small edits
#   -Model gpt-6.2-sol  default: reviews, fact checks, normal code
#   -Model gpt-6-astra  hardest problems only (costs the most)
#   -Effort low|medium|high|xhigh   how hard it thinks (default: medium)
param(
  [string]$Prompt,
  [string]$PromptFile,   # use this for long prompts or prompts with quotes
  [switch]$Write,
  [string]$Model = 'gpt-6.2-sol',
  [ValidateSet('low', 'medium', 'high', 'xhigh', 'max')][string]$Effort = 'medium',
  [string]$Out
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $Out) { $Out = Join-Path $PSScriptRoot 'codex-last.md' }
if ($PromptFile) { $Prompt = [IO.File]::ReadAllText((Resolve-Path $PromptFile), [Text.Encoding]::UTF8) }
if (-not $Prompt) { throw 'Give -Prompt or -PromptFile.' }
# Every Codex task gets the project context first.
$rules = @'
PROJECT CONTEXT (always): Derek is a hackathon prototype (ITU Hackathon-2026, Bank CenterCredit fintech case, Kazakhstan). It checks the recipient's bank details inside a business payment screen to stop invoice IBAN substitution. All data is synthetic. Some judges are not from finance, so everything must be clear to an ordinary person. The demo must work offline. Read README.md and TASK_STATE.md first.

'@
$Prompt = $rules + $Prompt

$exe = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin') -Recurse -Filter 'codex.exe' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $exe) {
  $cmd = Get-Command codex -ErrorAction SilentlyContinue
  if ($cmd) { $exe = $cmd } else { throw 'Codex not found. Install or open the Codex app once.' }
}
$path = if ($exe.FullName) { $exe.FullName } else { $exe.Source }

$sandbox = if ($Write) { 'workspace-write' } else { 'read-only' }
# The prompt goes through stdin so quotes and new lines survive.
# Codex's full step-by-step log goes to tools\codex-log.txt; only its final answer is printed.
$log = Join-Path $PSScriptRoot 'codex-log.txt'
# Parallel runs: a custom -Out gets its own log next to it (<out>.log), so two runs don't lock one file.
if ($PSBoundParameters.ContainsKey('Out')) { $log = "$Out.log" }
# Codex writes progress to stderr; Windows PowerShell 5.1 would treat that as an error, so relax it here.
$ErrorActionPreference = 'Continue'
$Prompt | & $path exec --cd $root --sandbox $sandbox -m $Model -c "model_reasoning_effort=`"$Effort`"" --color never -o $Out - *> $log
$ErrorActionPreference = 'Stop'
if ($LASTEXITCODE -ne 0) { Get-Content $log -Tail 20; throw "Codex exited with code $LASTEXITCODE (full log: $log)" }
Get-Content $Out -Encoding UTF8

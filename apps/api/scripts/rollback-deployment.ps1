param(
  [Parameter(Mandatory = $true)]
  [string]$PreviousImage
)

$ErrorActionPreference = 'Stop'
if ($PreviousImage -notmatch '@sha256:[a-f0-9]{64}$') {
  throw 'Use a previously deployed image pinned by its sha256 digest; mutable tags are not accepted.'
}
$env:API_IMAGE = $PreviousImage
& docker compose --file (Join-Path $PSScriptRoot '..\compose.yaml') up --detach --no-deps api background-worker
if ($LASTEXITCODE -ne 0) { throw 'Application rollback failed. Do not attempt an automatic database downgrade.' }
Write-Output 'Application and worker rolled back. Database schema was not changed.'

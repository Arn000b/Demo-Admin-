param(
  [Parameter(Mandatory = $true)]
  [string]$OutputFile
)

$ErrorActionPreference = 'Stop'
if (-not $env:DATABASE_URL) { throw 'Set DATABASE_URL through the deployment secret manager.' }
if (Test-Path -LiteralPath $OutputFile) { throw 'Refusing to overwrite an existing backup file.' }
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) { throw 'pg_dump is required on PATH.' }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw 'pg_restore is required on PATH for archive verification.' }

$uri = [Uri]$env:DATABASE_URL
$credentials = [Uri]::UnescapeDataString($uri.UserInfo)
$separator = $credentials.IndexOf(':')
if ($separator -lt 1) { throw 'DATABASE_URL must contain a database user and password.' }
$env:PGHOST = $uri.Host
$env:PGPORT = if ($uri.IsDefaultPort) { '5432' } else { [string]$uri.Port }
$env:PGUSER = $credentials.Substring(0, $separator)
$env:PGPASSWORD = $credentials.Substring($separator + 1)
$env:PGDATABASE = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
$sslMode = [Uri]::UnescapeDataString(($uri.Query.TrimStart('?').Split('&') | Where-Object { $_ -like 'sslmode=*' } | Select-Object -First 1))
$env:PGSSLMODE = if ($sslMode) { $sslMode.Substring('sslmode='.Length) } elseif ($uri.Host -in @('localhost', '127.0.0.1', '::1')) { 'disable' } else { 'require' }

try {
  & pg_dump --format=custom --no-owner --no-privileges --file $OutputFile
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
  & pg_restore --list $OutputFile *> $null
  if ($LASTEXITCODE -ne 0) { throw 'The generated backup archive did not pass pg_restore verification.' }
  Write-Output "Verified PostgreSQL backup created at $OutputFile"
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

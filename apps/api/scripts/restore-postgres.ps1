param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = 'Stop'
if (-not $env:RESTORE_TARGET_DATABASE_URL) { throw 'Set RESTORE_TARGET_DATABASE_URL for a new, empty recovery database.' }
if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) { throw 'Backup file does not exist.' }
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) { throw 'pg_restore is required on PATH.' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'psql is required on PATH for target safety checks.' }

$uri = [Uri]$env:RESTORE_TARGET_DATABASE_URL
$databaseName = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
if ($env:RESTORE_CONFIRMATION -cne "RESTORE:$databaseName") {
  throw "Set RESTORE_CONFIRMATION to RESTORE:$databaseName after verifying that the target is a new, disposable recovery database."
}
$credentials = [Uri]::UnescapeDataString($uri.UserInfo)
$separator = $credentials.IndexOf(':')
if ($separator -lt 1) { throw 'RESTORE_TARGET_DATABASE_URL must contain a database user and password.' }
$env:PGHOST = $uri.Host
$env:PGPORT = if ($uri.IsDefaultPort) { '5432' } else { [string]$uri.Port }
$env:PGUSER = $credentials.Substring(0, $separator)
$env:PGPASSWORD = $credentials.Substring($separator + 1)
$env:PGDATABASE = $databaseName
$sslMode = [Uri]::UnescapeDataString(($uri.Query.TrimStart('?').Split('&') | Where-Object { $_ -like 'sslmode=*' } | Select-Object -First 1))
$env:PGSSLMODE = if ($sslMode) { $sslMode.Substring('sslmode='.Length) } elseif ($uri.Host -in @('localhost', '127.0.0.1', '::1')) { 'disable' } else { 'require' }

try {
  $tableCount = & psql --tuples-only --no-align --set ON_ERROR_STOP=1 --command "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','p','v','m','S','f') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%';"
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect restore target.' }
  if ([int]$tableCount.Trim() -ne 0) { throw 'Refusing to restore over a non-empty target. Use a new empty recovery database.' }
  & pg_restore --exit-on-error --no-owner --no-privileges --dbname $databaseName $BackupFile
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed; retain the target for inspection and recover into a fresh database.' }
  Write-Output "Restore completed to the verified empty database $databaseName"
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

param(
  [string]$DestinationRoot = "C:\Users\neytn\Documents\Codex\backups\early-shout"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop is required by the Supabase dump command. Install or start Docker first."
}

docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop is installed but not running. Start it and try again."
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$destination = Join-Path $DestinationRoot $stamp
New-Item -ItemType Directory -Force -Path $destination | Out-Null

$schemaPath = Join-Path $destination "schema.sql"
$dataPath = Join-Path $destination "data.sql"
$rolesPath = Join-Path $destination "roles.sql"

& npx.cmd --yes supabase@latest db dump --linked --file $schemaPath
if ($LASTEXITCODE -ne 0) { throw "Supabase schema backup failed." }

& npx.cmd --yes supabase@latest db dump --linked --data-only --use-copy --file $dataPath
if ($LASTEXITCODE -ne 0) { throw "Supabase data backup failed." }

& npx.cmd --yes supabase@latest db dump --linked --role-only --file $rolesPath
if ($LASTEXITCODE -ne 0) { throw "Supabase role backup failed." }

$files = Get-Item -LiteralPath $schemaPath, $dataPath, $rolesPath
if ($files.Where({ $_.Length -le 0 }).Count -gt 0) {
  throw "Backup verification failed because one or more dump files are empty."
}

$manifest = $files | ForEach-Object {
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
  [PSCustomObject]@{
    Name = $_.Name
    Bytes = $_.Length
    SHA256 = $hash.Hash
  }
}

$manifest | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $destination "manifest.json")
$manifest | Format-Table -AutoSize
Write-Host "Verified private backup created at $destination"
Write-Host "Do not commit or upload this directory. It can contain private account data."

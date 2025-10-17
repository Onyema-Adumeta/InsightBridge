# Fix-Headers.ps1 (improved)

$patterns = @{
  get      = 'headers\(\)\.get\((.*?)\)'
  entries  = 'headers\(\)\.entries\(\)'
  spread   = '\.\.\.\s*headers\(\)'
  iterate1 = 'for\s*\(\s*const\s*\[\s*([^\]]+)\s*\]\s*of\s*headers\(\)\s*\)'
  iterate2 = 'for\s*\(\s*const\s+(\w+)\s+of\s+headers\(\)\s*\)'
}

$roots = @(".\app", ".\src")
$files = Get-ChildItem -Recurse -Include *.ts, *.tsx -Path $roots `
  | Where-Object {
      $_.FullName -notmatch '\\(node_modules|\.next)\\' `
      -and $_.Name -notmatch '\[.*\]'
    }

foreach ($file in $files) {
  $content = [IO.File]::ReadAllText($file.FullName)

  # Skip client components
  if ($content -match '^\s*"use client";' -or $content -match "^\s*'use client';") {
    continue
  }

  # Skip if no offending usage
  if ($content -notmatch $patterns.get -and
      $content -notmatch $patterns.entries -and
      $content -notmatch $patterns.spread -and
      $content -notmatch $patterns.iterate1 -and
      $content -notmatch $patterns.iterate2) {
    continue
  }

  Write-Host "Fixing: $($file.FullName)"

  $original = $content
  $lines = $content -split "`r?`n"

  # 1) Ensure import { headers } from "next/headers"
  if ($content -notmatch 'from\s+["'']next/headers["'']') {
    # Insert after first import
    $firstImportIdx = ($lines | Select-String -Pattern '^\s*import\s+' | Select-Object -First 1).LineNumber
    if ($firstImportIdx) {
      $idx = $firstImportIdx
    } else {
      $idx = 1
    }
    $lines = $lines[0..($idx-1)] + 'import { headers } from "next/headers";' + $lines[$idx..($lines.Length-1)]
  }

  # Refresh content after import insert
  $content = ($lines -join "`n")

  # 2) Ensure we have an async function to host await headers()
  # Prefer route handlers / pages: export async function GET/POST or default async page
  if ($content -notmatch 'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b' `
      -and $content -notmatch 'export\s+default\s+async\s+function\b') {
    # Try to convert `export default function` to async
    if ($content -match 'export\s+default\s+function\b') {
      $content = $content -replace 'export\s+default\s+function', 'export default async function'
    } elseif ($content -match 'export\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b') {
      $content = $content -replace 'export\s+function', 'export async function'
    } else {
      # As a fallback, wrap the first export default with async if it exists later
      $content = $content -replace 'export\s+default\s+(\w*)\s*\(', 'export default async $1('
    }
  }

  # 3) Insert const hdrs = await headers(); near the top of the async function
  $lines = $content -split "`r?`n"
  $insertedHdrs = $false
  for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match 'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(' `
        -or $lines[$i] -match 'export\s+default\s+async\s+function\b') {
      # Find the next line after the function signature's opening brace
      for ($j = $i; $j -lt [Math]::Min($i+20, $lines.Length); $j++) {
        if ($lines[$j] -match '{') {
          # Insert only if not already present
          if (-not ($lines[$j+1] -match 'const\s+hdrs\s*=\s*await\s+headers\(\)')) {
            $lines = $lines[0..$j] + '  const hdrs = await headers();' + $lines[($j+1)..($lines.Length-1)]
          }
          $insertedHdrs = $true
          break
        }
      }
      break
    }
  }

  if (-not $insertedHdrs) {
    Write-Host "⚠ Could not insert 'hdrs' initializer in $($file.Name) — check function structure."
  }

  $text = ($lines -join "`n")

  # 4) Replace usages
  $text = $text -replace $patterns.get, 'hdrs.get($1)'
  $text = $text -replace $patterns.entries, 'hdrs.entries()'
  $text = $text -replace $patterns.spread, '...Object.fromEntries(hdrs.entries())'
  $text = $text -replace $patterns.iterate1, 'for (const [$1] of hdrs.entries())'
  $text = $text -replace $patterns.iterate2, 'for (const $1 of hdrs.entries())'

  if ($text -ne $original) {
    [IO.File]::WriteAllText($file.FullName, $text)
    Write-Host "✅ Updated: $($file.Name)"
  } else {
    Write-Host "No changes needed in $($file.Name)"
  }
}

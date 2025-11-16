# Define the absolute path to your project's root
$projectRoot = "C:\Users\Devops\InsightBridgeParent\frontend"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fixedFiles = @()

Write-Host "Running fixes in: $projectRoot"

# --- Fix Trends (Corrected Path) ---
$trendsFile = Join-Path $projectRoot "src\app\trend-analysis\page.tsx"
if (Test-Path $trendsFile) {
    Copy-Item $trendsFile "$trendsFile.backup-$timestamp"
    $content = Get-Content $trendsFile -Raw
    $content = $content -replace 'bg-slate-900', 'bg-gray-50'
    $content = $content -replace 'bg-slate-800', 'bg-white'
    $content = $content -replace 'bg-slate-700', 'bg-gray-100'
    $content = $content -replace 'text-white(?!\/)', 'text-gray-900'
    $content = $content -replace 'text-gray-300', 'text-gray-600'
    $content = $content -replace 'border-slate-700', 'border-gray-200'
    Set-Content $trendsFile -Value $content -NoNewline
    Write-Host "✓ Fixed Trends page" -ForegroundColor Green
    $fixedFiles += $trendsFile
} else {
    Write-Host "✗ WARN: Could not find Trends file at $trendsFile" -ForegroundColor Yellow
}


if ($fixedFiles.Count -gt 0) {
    Write-Host "`nFixed $($fixedFiles.Count) files!" -ForegroundColor Cyan
    Write-Host "`nNow committing and pushing..." -ForegroundColor Yellow

    # Git operations
    git add .
    git commit -m "Fix UI: Light theme for trends page"
    git push

    Write-Host "`n✅ DONE! Wait for Azure to build and deploy." -ForegroundColor Green
} else {
    Write-Host "`nNo files were fixed. Check paths and ensure you are in the correct directory." -ForegroundColor Red
}

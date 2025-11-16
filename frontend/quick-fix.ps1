# Quick UI Fix Script
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fixedFiles = @()

# Fix Reconciliation (Dark to Light)
$reconFile = "src\app\(app)\reconciliation\page.tsx"
if (Test-Path $reconFile) {
    Copy-Item $reconFile "$reconFile.backup-$timestamp"
    $content = Get-Content $reconFile -Raw
    $content = $content -replace 'bg-slate-900', 'bg-gray-50'
    $content = $content -replace 'bg-slate-800', 'bg-white'
    $content = $content -replace 'bg-slate-700', 'bg-gray-100'
    $content = $content -replace 'text-white(?!\/)', 'text-gray-900'
    $content = $content -replace 'text-gray-300', 'text-gray-600'
    $content = $content -replace 'text-gray-400', 'text-gray-500'
    $content = $content -replace 'border-slate-700', 'border-gray-200'
    $content = $content -replace 'border-slate-600', 'border-gray-300'
    $content = $content -replace 'bg-red-900/20 border-red-800', 'bg-red-50 border-red-200'
    $content = $content -replace 'text-red-400', 'text-red-600'
    $content = $content -replace 'bg-blue-900/20 border-blue-800', 'bg-blue-50 border-blue-200'
    $content = $content -replace 'text-blue-400', 'text-blue-600'
    Set-Content $reconFile -Value $content -NoNewline
    Write-Host "✓ Fixed Reconciliation" -ForegroundColor Green
    $fixedFiles += $reconFile
}

# Fix Upload (Center content)
$uploadFile = "src\app\(app)\upload\page.tsx"
if (Test-Path $uploadFile) {
    Copy-Item $uploadFile "$uploadFile.backup-$timestamp"
    $content = Get-Content $uploadFile -Raw
    $content = $content -replace 'className="container mx-auto px-4 py-8"', 'className="container mx-auto px-4 py-8 max-w-6xl"'
    $content = $content -replace '<h1 className="text-3xl font-bold text-gray-900 mb-2">', '<h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">'
    $content = $content -replace '<p className="text-gray-600">Upload statements', '<p className="text-gray-600 text-center">Upload statements'
    Set-Content $uploadFile -Value $content -NoNewline
    Write-Host "✓ Fixed Upload page" -ForegroundColor Green
    $fixedFiles += $uploadFile
}

# Fix Trends
$trendsFile = "src\app\(app)\trends\page.tsx"
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
}

Write-Host "`nFixed $($fixedFiles.Count) files!" -ForegroundColor Cyan
Write-Host "`nNow committing and pushing..." -ForegroundColor Yellow

# Git operations
git add .
git commit -m "Fix UI: Light theme for reconciliation/trends, center upload page"
git push

Write-Host "`n✅ DONE! Wait 10 minutes for Azure to deploy." -ForegroundColor Green

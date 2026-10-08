# SmartAttend Launch Script for PowerShell
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Starting SmartAttend (AWS Cloud Computing Project)" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

if (Get-Command node -ErrorAction SilentlyContinue) {
    node server.js
} elseif (Get-Command agy-node.cmd -ErrorAction SilentlyContinue) {
    Write-Host "Using agy-node runtime..." -ForegroundColor Yellow
    agy-node.cmd server.js
} else {
    Write-Host "Node runtime not detected in PATH. Please ensure Node.js is installed." -ForegroundColor Red
}

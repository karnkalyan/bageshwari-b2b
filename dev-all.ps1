Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting Bageshwari B2B: App + Prisma Studio" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Fullstack App: http://localhost:3000" -ForegroundColor White
Write-Host "2. Database Studio: http://localhost:5555" -ForegroundColor Yellow
Write-Host ""

npx concurrently -n "app,studio" -c "blue,green" "next dev" "npx prisma studio"

@echo off
echo ===================================================
echo  Starting Bageshwari B2B: App + Prisma DB Studio
echo ===================================================
echo.
echo 1. Next.js App: http://localhost:3000
echo 2. Prisma Database Studio: http://localhost:5555
echo.

npx concurrently -n "app,studio" -c "blue,green" "next dev" "npx prisma studio"

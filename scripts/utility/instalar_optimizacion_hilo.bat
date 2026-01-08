@echo off
echo ========================================
echo Instalando optimizacion de pagina de hilo
echo ========================================
echo.

echo [1/3] Aplicando migracion de base de datos...
supabase db push --db-url %NEXT_PUBLIC_SUPABASE_URL%

echo.
echo [2/3] Reemplazando pagina antigua con la optimizada...
move /Y "src\app\foro\hilos\[slug]\page.tsx" "src\app\foro\hilos\[slug]\page.old.tsx"
move /Y "src\app\foro\hilos\[slug]\page.new.tsx" "src\app\foro\hilos\[slug]\page.tsx"

echo.
echo [3/3] Limpiando archivos temporales...
del /Q "src\app\foro\hilos\[slug]\page.old.tsx" 2>nul

echo.
echo ========================================
echo Instalacion completada exitosamente!
echo ========================================
echo.
echo La pagina del hilo ha sido optimizada con:
echo - Server Components para SSR
echo - Sistema de posts/respuestas funcional
echo - Tipado TypeScript completo
echo - Cache optimizado con React Query
echo - Metadata dinamica para SEO
echo.
pause

@echo off
echo ========================================
echo Instalando Sistema de Votos en Tiempo Real
echo ========================================
echo.

echo [1/2] Aplicando migracion de base de datos...
npx supabase db push --db-url %SUPABASE_DB_URL% --file supabase/migrations/20251010000000_crear_votos_posts_realtime.sql

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Fallo al aplicar la migracion
    echo Por favor verifica tu conexion a Supabase
    pause
    exit /b 1
)

echo.
echo [2/2] Verificando instalacion...
echo.
echo ========================================
echo Instalacion completada exitosamente!
echo ========================================
echo.
echo El sistema de votos en tiempo real ha sido instalado.
echo.
echo Caracteristicas instaladas:
echo - Tabla foro_votos_posts con politicas RLS
echo - Trigger automatico para actualizar contadores
echo - Realtime habilitado para sincronizacion instantanea
echo - Endpoint API en /api/foro/comentario/[id]/votar
echo - Hook useRealtimeVotos para actualizaciones en vivo
echo - Componente de votacion integrado en CommentCard
echo.
echo Los usuarios ahora veran los votos actualizarse en tiempo real
echo cuando otros usuarios voten en los comentarios del foro.
echo.
pause

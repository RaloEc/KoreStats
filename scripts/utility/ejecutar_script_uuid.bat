@echo off
echo Ejecutando script SQL para resolver conflicto de tipos en funciones...
supabase db push --db-url=postgresql://postgres:postgres@localhost:54322/postgres r:/Proyectos/BitArena/Mc-Community/scripts/contar_comentarios_uuid.sql

if %ERRORLEVEL% NEQ 0 (
  echo Error al ejecutar el script SQL.
  echo Intenta ejecutarlo manualmente desde la interfaz web de Supabase.
  echo Copia el contenido del archivo scripts/contar_comentarios_uuid.sql y pegalo en el editor SQL de Supabase.
) else (
  echo Script ejecutado correctamente.
)

pause

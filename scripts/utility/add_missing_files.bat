@echo off
echo Agregando archivos faltantes al repositorio...
git add src\components\auth\AuthModal.tsx
git add src\components\auth\OAuthButtons.tsx
git add src\hooks\useAuthModal.ts
git add src\components\home\BannerPublicitario.tsx
git add src\app\admin\noticias\categorias\animations.css
git status
echo.
echo Archivos agregados. Ahora puedes hacer commit con:
echo git commit -m "Agregados archivos faltantes para corregir errores de build"
echo.

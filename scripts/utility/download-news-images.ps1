# URLs de las imágenes de ejemplo
$images = @{
    "minecraft-update.jpg" = "https://raw.githubusercontent.com/microsoft/minecraft-images/main/minecraft-caves-cliffs-update.jpg"
    "minecraft-pvp.jpg" = "https://raw.githubusercontent.com/microsoft/minecraft-images/main/minecraft-pvp.jpg"
    "minecraft-texture.jpg" = "https://raw.githubusercontent.com/microsoft/minecraft-images/main/minecraft-rtx.jpg"
}

# Crear el directorio public si no existe
if (-not (Test-Path "public")) {
    New-Item -ItemType Directory -Path "public"
}

# Descargar cada imagen
foreach ($image in $images.GetEnumerator()) {
    $outputPath = Join-Path "public" $image.Key
    Write-Host "Descargando $($image.Key)..."
    Invoke-WebRequest -Uri $image.Value -OutFile $outputPath
}

Write-Host "¡Descarga completada!"

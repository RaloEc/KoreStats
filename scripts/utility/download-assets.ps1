$urls = @{
    "logo.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/logo.png"
    "news-icon.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/news.png"
    "sword-icon.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/sword.png"
    "chest-icon.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/chest.png"
    "button-texture.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/button.png"
    "dirt-background.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/dirt.png"
    "border-image.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/border.png"
    "clouds.png" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/images/clouds.png"
    "MinecraftRegular.otf" = "https://raw.githubusercontent.com/crafatar/crafatar/master/lib/public/fonts/minecraft.otf"
}

foreach ($file in $urls.Keys) {
    $url = $urls[$file]
    $outFile = if ($file -like "*.otf") { "public/fonts/$file" } else { "public/images/$file" }
    
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri $url -OutFile $outFile
}

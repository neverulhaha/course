# Удаляет картинные логотипы бренда из проекта.
# Запускать из корня проекта.

$brandPath = Join-Path (Get-Location) "public\brand"

if (Test-Path $brandPath) {
  Remove-Item -Recurse -Force $brandPath
  Write-Host "Removed public\brand"
} else {
  Write-Host "public\brand not found, nothing to remove"
}

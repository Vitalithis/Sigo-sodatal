# ==============================================================================
# Script de Rotación y Limpieza de Logs para Servidor Local (Windows PowerShell)
# ==============================================================================
# Este script se puede programar en el Programador de Tareas de Windows (Task Scheduler)
# para ejecutarse diariamente o cada X horas.

param(
    [string]$LogDir = ".\logs\archive",
    [int]$MaxSizeBytes = 52428800,  # 50 MB
    [int]$RetentionDays = 14        # Conservar máximo 14 días
)

Write-Host "Iniciando mantenimiento de logs en: $LogDir"

if (-not (Test-Path $LogDir)) {
    Write-Host "Directorio no encontrado, nada que rotar."
    exit 0
}

# 1. Rotar el archivo principal si excede el tamaño máximo
$activeLog = Join-Path $LogDir "sigo_operations.log"
if (Test-Path $activeLog) {
    $item = Get-Item $activeLog
    if ($item.Length -ge $MaxSizeBytes) {
        $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
        $rotatedName = Join-Path $LogDir "sigo_operations_$timestamp.log"
        Write-Host "Rotando archivo de log activo a: $rotatedName"
        Move-Item -Path $activeLog -Destination $rotatedName -Force
    }
}

# 2. Eliminar logs archivados con más de $RetentionDays días de antigüedad
$limitDate = (Get-Date).AddDays(-$RetentionDays)
$oldFiles = Get-ChildItem -Path $LogDir -Filter "*.log" | Where-Object { $_.LastWriteTime -lt $limitDate }

foreach ($file in $oldFiles) {
    Write-Host "Eliminando log antiguo por política de retención: $($file.Name)"
    Remove-Item $file.FullName -Force
}

Write-Host "Mantenimiento de logs completado exitosamente."

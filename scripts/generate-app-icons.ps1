$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $projectRoot 'public\icons'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

function New-RoundedRectanglePath {
  param([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-EarlyShoutIcon {
  param([int]$Size, [string]$FileName, [bool]$Maskable = $false)

  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bounds = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
  $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bounds, [System.Drawing.Color]::FromArgb(5, 24, 31), [System.Drawing.Color]::FromArgb(8, 70, 62), 135)
  $graphics.FillRectangle($background, $bounds)

  $margin = if ($Maskable) { [int]($Size * 0.16) } else { [int]($Size * 0.09) }
  $cardSize = $Size - (2 * $margin)
  $cardPath = New-RoundedRectanglePath -X $margin -Y $margin -Width $cardSize -Height $cardSize -Radius ($Size * 0.16)
  $cardBounds = New-Object System.Drawing.Rectangle($margin, $margin, $cardSize, $cardSize)
  $cardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($cardBounds, [System.Drawing.Color]::FromArgb(110, 231, 183), [System.Drawing.Color]::FromArgb(56, 189, 248), 35)
  $graphics.FillPath($cardBrush, $cardPath)

  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55, 8, 28, 36), [Math]::Max(2, $Size * 0.012))
  $innerMargin = $margin + ($cardSize * 0.12)
  $innerSize = $cardSize * 0.76
  $graphics.DrawEllipse($linePen, $innerMargin + ($innerSize * 0.55), $innerMargin + ($innerSize * 0.19), $innerSize * 0.58, $innerSize * 0.58)
  $graphics.DrawEllipse($linePen, $innerMargin + ($innerSize * 0.72), $innerMargin + ($innerSize * 0.32), $innerSize * 0.32, $innerSize * 0.32)

  $font = New-Object System.Drawing.Font('Arial', ($Size * 0.28), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(5, 30, 35))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textArea = [System.Drawing.RectangleF]::new(
    [single]$margin,
    [single]($margin - ($Size * 0.01)),
    [single]($cardSize * 0.78),
    [single]$cardSize
  )
  $graphics.DrawString('ES', $font, $textBrush, $textArea, $format)

  $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(5, 30, 35))
  $dotSize = [Math]::Max(6, $Size * 0.045)
  $graphics.FillEllipse($dotBrush, $margin + ($cardSize * 0.78), $margin + ($cardSize * 0.72), $dotSize, $dotSize)

  $outputPath = Join-Path $outputDirectory $FileName
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $dotBrush.Dispose(); $format.Dispose(); $textBrush.Dispose(); $font.Dispose(); $linePen.Dispose(); $cardBrush.Dispose(); $cardPath.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

New-EarlyShoutIcon -Size 192 -FileName 'icon-192.png'
New-EarlyShoutIcon -Size 512 -FileName 'icon-512.png'
New-EarlyShoutIcon -Size 512 -FileName 'icon-maskable-512.png' -Maskable $true
New-EarlyShoutIcon -Size 180 -FileName 'apple-touch-icon.png'
New-EarlyShoutIcon -Size 32 -FileName 'icon-32.png'

Copy-Item -Force (Join-Path $outputDirectory 'apple-touch-icon.png') (Join-Path $projectRoot 'public\apple-icon.png')
Copy-Item -Force (Join-Path $outputDirectory 'icon-32.png') (Join-Path $projectRoot 'public\icon-dark-32x32.png')
Copy-Item -Force (Join-Path $outputDirectory 'icon-32.png') (Join-Path $projectRoot 'public\icon-light-32x32.png')

Write-Output "Generated Early Shout app icons in $outputDirectory"

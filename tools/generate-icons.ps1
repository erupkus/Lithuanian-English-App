# Generates icons/icon-192.png and icon-512.png using System.Drawing (built into
# Windows PowerShell). Design: rounded square with the Lithuanian tricolor
# (yellow / green / red) and a calm white speech bubble — an on-theme PWA icon.
Add-Type -AssemblyName System.Drawing

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-Icon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $radius = [float]($size * 0.22)
    $clip = New-RoundedPath 0 0 $size $size $radius
    $g.SetClip($clip)

    $band = $size / 3.0
    $yellow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(253,185,19))
    $green  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0,106,68))
    $red    = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(193,39,45))
    $g.FillRectangle($yellow, 0, 0, $size, [int][math]::Ceiling($band))
    $g.FillRectangle($green, 0, [int][math]::Floor($band), $size, [int][math]::Ceiling($band))
    $g.FillRectangle($red, 0, [int][math]::Floor($band * 2), $size, [int][math]::Ceiling($band))

    # white speech bubble (rounded rect + tail), centred
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $bw = $size * 0.46
    $bh = $size * 0.34
    $bx = ($size - $bw) / 2.0
    $by = $size * 0.26
    $bubble = New-RoundedPath $bx $by $bw $bh ($size * 0.09)
    $g.FillPath($white, $bubble)
    $tail = New-Object 'System.Drawing.PointF[]' 3
    $tail[0] = New-Object System.Drawing.PointF(($size * 0.40), ($by + $bh - 2))
    $tail[1] = New-Object System.Drawing.PointF(($size * 0.34), ($by + $bh + $size * 0.12))
    $tail[2] = New-Object System.Drawing.PointF(($size * 0.52), ($by + $bh - 2))
    $g.FillPolygon($white, $tail)

    # three dots inside the bubble (a "talking" mark)
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0,106,68))
    $dotR = $size * 0.035
    $cy = $by + $bh / 2.0 - $dotR
    foreach ($fx in 0.37, 0.5, 0.63) {
        $cx = $size * $fx - $dotR
        $g.FillEllipse($dotBrush, $cx, $cy, $dotR * 2, $dotR * 2)
    }

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "wrote $outPath"
}

$root = if ($PSScriptRoot) { Join-Path $PSScriptRoot '..' } else { Get-Location }
$iconDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
New-Icon 192 (Join-Path $iconDir 'icon-192.png')
New-Icon 512 (Join-Path $iconDir 'icon-512.png')

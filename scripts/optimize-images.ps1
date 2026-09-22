# Re-encode everything under images/ to a real, right-sized JPEG.
#
#   powershell -ExecutionPolicy Bypass -File scripts/optimize-images.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/optimize-images.ps1 -WhatIf
#
# Why this exists: the Google Sites migration saved whatever bytes the old site
# served under a .jpg name, so ten "jpg" files were actually PNG-encoded
# photographs -- 6 MB of the 18 MB in images/. Several real JPEGs were also
# three to six times larger than anything the layout can display.
#
# Filenames and extensions never change, so no HTML, JSON, or URL has to move.
# Originals stay recoverable in git history.
#
# The width caps are set from what css/style.css actually renders, at 3x for
# high-density screens. If you change a layout width, change the cap here too.
#
# Windows-only: it uses System.Drawing, which ships with Windows, so the repo
# stays dependency-free. Re-running it on already-optimized files is a no-op.

[CmdletBinding(SupportsShouldProcess = $true)]
param()

Add-Type -AssemblyName System.Drawing

$root   = Split-Path $PSScriptRoot -Parent
$images = Join-Path $root "images"

# Longest-edge cap and JPEG quality, by filename pattern. First match wins.
$rules = @(
  @{ Match = 'images[\\/]pagsip[\\/]';  MaxW =  900; Quality = 78 }  # gallery, ~270px cells
  @{ Match = 'images[\\/]faculty-';     MaxW =  500; Quality = 82 }  # person card, 130px
  @{ Match = 'images[\\/]student-';     MaxW =  500; Quality = 82 }  # person card, 130px
  @{ Match = 'images[\\/]alumni-';      MaxW =  400; Quality = 82 }  # interview avatar, 92px
  @{ Match = 'images[\\/]news-';        MaxW =  800; Quality = 82 }  # .news-photo, 340px
  @{ Match = '.';                       MaxW = 1400; Quality = 82 }  # figures, og:image
)

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Jpeg($bitmap, $path, $quality) {
  $p = New-Object System.Drawing.Imaging.EncoderParameters 1
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)
  $bitmap.Save($path, $jpegCodec, $p)
  $p.Dispose()
}

$before = 0; $after = 0; $touched = 0; $skipped = 0

Get-ChildItem -Path $images -Recurse -File -Include *.jpg, *.jpeg, *.png | ForEach-Object {
  $file = $_
  $rule = $rules | Where-Object { $file.FullName -match $_.Match } | Select-Object -First 1

  $img = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $w = $img.Width; $h = $img.Height
    $scale = [Math]::Min(1.0, $rule.MaxW / [double][Math]::Max($w, $h))
    $nw = [int][Math]::Round($w * $scale)
    $nh = [int][Math]::Round($h * $scale)

    # White backing so PNG transparency does not flatten to black.
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh,
      [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $nw, $nh)
    $g.Dispose()

    $tmp = [System.IO.Path]::GetTempFileName()
    Save-Jpeg $bmp $tmp $rule.Quality
    $bmp.Dispose()
    $img.Dispose(); $img = $null

    $oldKB = [int]($file.Length / 1KB)
    $newKB = [int]((Get-Item $tmp).Length / 1KB)
    $before += $oldKB

    # Keep whichever is smaller, so a second run never inflates a file.
    if ((Get-Item $tmp).Length -lt $file.Length) {
      $after += $newKB
      $rel = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
      if ($PSCmdlet.ShouldProcess($rel, "re-encode $($w)x$h -> $($nw)x$nh")) {
        Move-Item -Path $tmp -Destination $file.FullName -Force
      } else {
        Remove-Item $tmp -Force
      }
      "{0,7} KB -> {1,6} KB  {2,9} -> {3,-9}  {4}" -f $oldKB, $newKB, "$($w)x$h", "$($nw)x$nh", $rel
      $touched++
    } else {
      Remove-Item $tmp -Force
      $after += $oldKB
      $skipped++
    }
  } finally {
    if ($img) { $img.Dispose() }
  }
}

""
"$touched re-encoded, $skipped already small enough"
"images/ total: $before KB -> $after KB (saved $($before - $after) KB)"

param(
    [int]$Port = 8080,
    [string]$Root = (Get-Location).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
    throw "Root path does not exist or is not a folder: $Root"
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

$mimeMap = @{
    '.html'  = 'text/html; charset=utf-8'
    '.htm'   = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.svg'   = 'image/svg+xml'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.webp'  = 'image/webp'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
    '.txt'   = 'text/plain; charset=utf-8'
}

function Get-ResponseBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return [System.IO.File]::ReadAllBytes($Path)
}

try {
    $listener.Start()
    Write-Host "Serving $resolvedRoot at $prefix"
    Write-Host 'Press Ctrl+C to stop.'

    while ($listener.IsListening) {
        $context = $listener.GetContext()

        try {
            $requestPath = $context.Request.Url.AbsolutePath.TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($requestPath)) {
                $requestPath = 'index.html'
            }

            $decodedPath = [System.Uri]::UnescapeDataString($requestPath)
            $safeRelative = $decodedPath -replace '/', [System.IO.Path]::DirectorySeparatorChar
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $resolvedRoot $safeRelative))

            if (-not $fullPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $context.Response.StatusCode = 403
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
                $context.Response.ContentType = 'text/plain; charset=utf-8'
                $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
                continue
            }

            if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
                if ($mimeMap.ContainsKey($ext)) {
                    $context.Response.ContentType = $mimeMap[$ext]
                }
                else {
                    $context.Response.ContentType = 'application/octet-stream'
                }

                $bytes = Get-ResponseBytes -Path $fullPath
                $context.Response.StatusCode = 200
                $context.Response.ContentLength64 = $bytes.Length
                $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
            else {
                $context.Response.StatusCode = 404
                $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $context.Response.ContentType = 'text/plain; charset=utf-8'
                $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        }
        catch {
            $context.Response.StatusCode = 500
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('500 Internal Server Error')
            $context.Response.ContentType = 'text/plain; charset=utf-8'
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Warning $_
        }
        finally {
            if ($null -ne $context.Response.OutputStream) {
                $context.Response.OutputStream.Close()
            }
        }
    }
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }

    $listener.Close()
    Write-Host 'Server stopped.'
}

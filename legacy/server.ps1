# ==============================================================================
# TechStock Pro - Lightweight Local HTTP Server & REST API Backend
# Menggunakan System.Net.HttpListener bawaan Windows (Zero-Dependency)
# ==============================================================================

$port = 3000
$rootPath = Resolve-Path (Join-Path $PSScriptRoot "..\frontend")
$dataPath = Join-Path $PSScriptRoot "data\stock_inventory.json"

# Pastikan data path ada
if (-not (Test-Path $dataPath)) {
    Write-Host "[ERROR] Data file not found at $dataPath" -ForegroundColor Red
    exit 1
}

# Dapatkan IP lokal untuk ditampilkan ke user
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress

$listener = New-Object System.Net.HttpListener
# Gunakan * agar bisa diakses dari device lain di jaringan yang sama
$prefix = "http://*:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[WARNING] Gagal bind di port $port, mencoba port 3001..." -ForegroundColor Yellow
    $port = 3001
    $prefix = "http://*:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " TechStock Office Server BERJALAN" -ForegroundColor Green
Write-Host " Local  : http://localhost:$port" -ForegroundColor Green
Write-Host " Network: http://$($localIP):$port  (akses dari device lain)" -ForegroundColor Yellow
Write-Host " Folder Frontend: $rootPath" -ForegroundColor Gray
Write-Host " Tekan Ctrl + C untuk menghentikan server" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan

# MIME Types
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
}

# Helper membaca JSON
function Get-StockData {
    return Get-Content -Path $dataPath -Raw -Encoding UTF8
}

# Helper menyimpan JSON
function Save-StockData($jsonContent) {
    [System.IO.File]::WriteAllText($dataPath, $jsonContent, [System.Text.Encoding]::UTF8)
}

# Main Loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.Url.LocalPath

        # ----------------------------------------------------------------------
        # REST API ROUTING
        # ----------------------------------------------------------------------
        if ($rawUrl.StartsWith("/api/")) {
            $response.ContentType = "application/json; charset=utf-8"

            # GET /api/stock
            if ($rawUrl -eq "/api/stock" -and $request.HttpMethod -eq "GET") {
                $content = Get-StockData
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }

            # POST /api/stock/update-qty
            if ($rawUrl -eq "/api/stock/update-qty" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $body = ConvertFrom-Json $bodyStr

                $stockJson = Get-StockData
                $items = ConvertFrom-Json $stockJson

                $target = $items | Where-Object { $_.id -eq $body.id }
                if ($target) {
                    $newQty = [Math]::Max(0, [int]$target.qty + [int]$body.delta)
                    $target.qty = $newQty
                    if ($newQty -eq 0) {
                        $target.status = "sold"
                    } else {
                        $target.status = "ready"
                    }
                    $target.updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    
                    $newJson = ConvertTo-Json @($items) -Depth 10
                    Save-StockData $newJson
                    
                    $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $target -Depth 10))
                    $response.StatusCode = 200
                    $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                } else {
                    $response.StatusCode = 404
                }
                $response.Close()
                continue
            }

            # POST /api/stock/save (Add or Update)
            if ($rawUrl -eq "/api/stock/save" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                $newUnit = ConvertFrom-Json $bodyStr

                $stockJson = Get-StockData
                $items = [System.Collections.ArrayList]@(ConvertFrom-Json $stockJson)

                $existingIdx = -1
                for ($i = 0; $i -lt $items.Count; $i++) {
                    if ($items[$i].id -eq $newUnit.id) {
                        $existingIdx = $i
                        break
                    }
                }

                if ($existingIdx -ge 0) {
                    $items[$existingIdx] = $newUnit
                } else {
                    $items.Insert(0, $newUnit)
                }

                $newJson = ConvertTo-Json @($items) -Depth 10
                Save-StockData $newJson

                $resBytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $newUnit -Depth 10))
                $response.StatusCode = 200
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.Close()
                continue
            }

            # POST /api/stock/save-all (Batch Replace)
            if ($rawUrl -eq "/api/stock/save-all" -and $request.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $bodyStr = $reader.ReadToEnd()
                Save-StockData $bodyStr
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": true}')
                $response.StatusCode = 200
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.Close()
                continue
            }

            # DELETE /api/stock/:id
            if ($rawUrl.StartsWith("/api/stock/") -and $request.HttpMethod -eq "DELETE") {
                $unitId = $rawUrl.Substring("/api/stock/".Length)
                $stockJson = Get-StockData
                $items = ConvertFrom-Json $stockJson
                $filtered = @($items | Where-Object { $_.id -ne $unitId })

                $newJson = ConvertTo-Json $filtered -Depth 10
                Save-StockData $newJson

                $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success": true}')
                $response.StatusCode = 200
                $response.OutputStream.Write($resBytes, 0, $resBytes.Length)
                $response.Close()
                continue
            }
        }

        # ----------------------------------------------------------------------
        # STATIC FILE SERVING (FRONTEND)
        # ----------------------------------------------------------------------
        $relPath = $rawUrl.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relPath)) {
            $relPath = "index.html"
        }

        $filePath = Join-Path $rootPath $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $mime

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }

        $response.Close()
    } catch {
        # Ignore abort exceptions on shutdown
    }
}

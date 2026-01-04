$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PythonDir = Join-Path $ProjectRoot "vendor\python"
$VenvDir = Join-Path $PythonDir "venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

function Resolve-Python {
  $candidates = @("python3.13", "python3.12", "python3.11", "python")
  foreach ($candidate in $candidates) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($cmd) {
      return $cmd.Source
    }
  }
  return $null
}

$PythonBin = Resolve-Python
if (-not $PythonBin) {
  throw "Python 3.11+ is required (prefer 3.13). Please install Python."
}

if (-not (Test-Path $PythonDir)) {
  New-Item -ItemType Directory -Path $PythonDir | Out-Null
}

if (-not (Test-Path $VenvDir)) {
  Write-Host "Creating venv in $VenvDir..."
  & $PythonBin -m venv $VenvDir
}

if (-not (Test-Path $PythonExe)) {
  throw "Python executable not found at $PythonExe. Ensure Python is installed."
}

& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install -r (Join-Path $ProjectRoot "requirements-backend.txt")

Write-Host "Bundled Python ready at $VenvDir"

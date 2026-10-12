param([Parameter(Mandatory=$true)][string]$BaselineRoot)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath($BaselineRoot)
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ($taskRoot.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $taskRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Use an isolated baseline outside the main repository.'
}
$copy = Join-Path $taskRoot 'DouyinBarrageGrab'
$exe = Join-Path $copy 'BarrageGrab/bin/Debug/WssBarrageServer.exe'
if (!(Test-Path -LiteralPath $exe)) { throw 'Build the original Debug copy first.' }
$probe = Join-Path $taskRoot 'offline-probe'
New-Item -ItemType Directory -Path $probe -Force | Out-Null
Copy-Item -LiteralPath $exe -Destination $probe
Copy-Item -LiteralPath ($exe + '.config') -Destination (Join-Path $probe 'OriginalOfflineProbe.exe.config')
[xml]$project = Get-Content -LiteralPath (Join-Path $copy 'BarrageGrab/WssBarrageService.csproj')
foreach ($reference in $project.Project.ItemGroup.Reference) {
    if ($reference.HintPath) {
        $dll = [IO.Path]::GetFullPath((Join-Path (Join-Path $copy 'BarrageGrab') $reference.HintPath))
        Copy-Item -LiteralPath $dll -Destination $probe
    }
}
$compiler = 'C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/Roslyn/csc.exe'
$compileArgs = @('/nologo', '/target:exe', ("/out:" + (Join-Path $probe 'OriginalOfflineProbe.exe')),
    ("/reference:" + (Join-Path $probe 'WssBarrageServer.exe')),
    ("/reference:" + (Join-Path $probe 'protobuf-net.dll')),
    ("/reference:" + (Join-Path $probe 'protobuf-net.Core.dll')),
    ("/reference:" + (Join-Path $probe 'Newtonsoft.Json.dll')),
    ("/reference:" + (Join-Path $probe 'System.Memory.dll')),
    (Join-Path $PSScriptRoot 'OriginalOfflineProbe.cs'))
& $compiler @compileArgs
if ($LASTEXITCODE -ne 0) { throw "Probe compile failed: $LASTEXITCODE" }
Push-Location $probe
try {
    & (Join-Path $probe 'OriginalOfflineProbe.exe') (Join-Path $taskRoot 'original-offline-observations.json')
    if ($LASTEXITCODE -ne 0) { throw "Probe observations failed: $LASTEXITCODE" }
} finally { Pop-Location }

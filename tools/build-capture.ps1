param([string]$PackageCache='', [string]$MSBuildPath=$env:LW_MSBUILD, [string]$OutputDirectory='')
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packages=Join-Path $root 'src/capture/packages'
$project=Join-Path $root 'src/capture/BarrageGrab/WssBarrageService.csproj'
if (!$MSBuildPath) {
    $vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    if (Test-Path -LiteralPath $vswhere) { $MSBuildPath=(& $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1) }
}
if (!$MSBuildPath -or !(Test-Path -LiteralPath $MSBuildPath)) { throw 'MSBuild unavailable; specify -MSBuildPath or LW_MSBUILD.' }
if (!(Test-Path -LiteralPath $packages)) {
    if ($PackageCache) {
        if (!(Test-Path -LiteralPath $PackageCache)) { throw 'Specified NuGet cache missing.' }
        Copy-Item -LiteralPath $PackageCache -Destination $packages -Recurse
    } else {
        & $MSBuildPath $project /t:Restore /p:RestorePackagesConfig=true "/p:RestoreRepositoryPath=$packages" /p:NuGetAudit=false /v:minimal /nologo
        if ($LASTEXITCODE -ne 0) { throw "Capture restore failed: $LASTEXITCODE" }
    }
}
$buildArguments=@($project,'/t:Build','/p:Configuration=Debug','/p:PostBuildEvent=','/v:minimal','/nologo')
if ($OutputDirectory) {
    $output=[IO.Path]::GetFullPath($OutputDirectory)
    if (!$output.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $output -match '[\\/]references(?:[\\/]|$)') { throw 'OutputDirectory must remain inside the first-party workspace, outside references.' }
    $buildArguments+=('/p:OutputPath='+$output+[IO.Path]::DirectorySeparatorChar)
}
& $MSBuildPath @buildArguments
if ($LASTEXITCODE -ne 0) { throw "Capture build failed: $LASTEXITCODE" }

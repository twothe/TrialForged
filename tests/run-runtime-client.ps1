<# Runs the installed pack in an isolated offline client and requires native gameplay and completed terrain loading. #>
param(
    [string] $JavaPath = 'C:\Work\Java\GraalVM\jdk-21.0.6\bin\java.exe',
    [switch] $VerifySavedRun
)
$ErrorActionPreference = 'Stop'
$instanceRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $instanceRoot 'local/runtime-validation'
if (!$VerifySavedRun) {
    if (!(Test-Path -LiteralPath $JavaPath)) { throw "Java executable not found: $JavaPath" }
    & node (Join-Path $PSScriptRoot 'check-pack-scripts.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Pack contract checks failed.' }
    & (Join-Path $PSScriptRoot 'check-ars-chest-assets.ps1')
    $rhinoJar = (Get-ChildItem (Join-Path $instanceRoot 'mods') -Filter 'rhino-*.jar').FullName
    & $JavaPath '-Dtrialforged.test.entry=runArsChestTests' --class-path $rhinoJar (Join-Path $PSScriptRoot 'RhinoProgressionCheck.java') (Join-Path $PSScriptRoot 'ars-chest-loot.spec.js') (Join-Path $instanceRoot 'kubejs/server_scripts/ars_chest_loot.js')
    if ($LASTEXITCODE -ne 0) { throw 'Native Rhino Ars registration checks failed.' }
    & node (Join-Path $PSScriptRoot 'prepare-runtime-client.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Runtime preparation failed.' }
}
Push-Location $runtimeRoot
try {
    if (!$VerifySavedRun) {
        & $JavaPath '@client.args' > launcher-output.log 2>&1
        if ($LASTEXITCODE -ne 0) { throw "Runtime client exited with code $LASTEXITCODE. Inspect $runtimeRoot\launcher-output.log" }
    }
    $result = Get-Content -LiteralPath 'runtime-result.json' -Raw | ConvertFrom-Json
    if ($result.status -ne 'passed') { throw 'Native gameplay probes failed.' }
    $arsResult = Get-Content -LiteralPath 'runtime-ars-chest-result.json' -Raw | ConvertFrom-Json
    if ($arsResult.status -ne 'passed') { throw 'Native Ars chest probes failed.' }
    $log = Get-Content -LiteralPath 'logs/latest.log' -Raw
    if ($log -match 'Skipping invalid leveling settings (elsebase:backdoor|minecraft:the_nether|minecraft:the_end)') {
        throw 'Native Dynamic Difficulty rejected a configured dimension profile.'
    }
    foreach ($marker in @('CLIENT_JOIN_READY', 'CLIENT_TEST_COMPLETE: passed', 'SERVER_TESTS_COMPLETE', 'ARS_CHEST_TESTS_COMPLETE', 'ELSEBASE_TESTS_COMPLETE', 'DIMENSION_BASES_TESTS_COMPLETE', 'Starting JEI took')) {
        if (!$log.Contains($marker)) { throw "Missing runtime evidence: $marker" }
    }
    $scriptErrors = [regex]::Matches($log, '(?m)^.*\[(?:[^\r\n]*/ERROR|[^\r\n]*/FATAL)\].*\[KubeJS[^\r\n]*')
    foreach ($entry in $scriptErrors) {
        # These two existing mod-resource tag errors do not prevent successful login.
        if ($entry.Value -match "\[KubeJS/\]: Couldn't load tag (farmersdelight:pies|create:brittle) as it is missing following references:") {
            Write-Warning $entry.Value
        } else {
            throw ('Runtime log contains a pack script failure: ' + $entry.Value)
        }
    }
    if ($log.Contains('Encountered an unexpected exception')) { throw 'Runtime log contains a server failure.' }
    Write-Output 'PASS: real client login, JEI startup, terrain loading, Infernal bosses, progression, native Ars chest loot and Elsebase without scaling.'
} finally {
    Pop-Location
}

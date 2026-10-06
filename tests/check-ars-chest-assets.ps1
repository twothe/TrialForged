<# Checks the explicit generic chest selection and Ars item resource evidence against installed JARs. #>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$instanceRoot = Split-Path -Parent $PSScriptRoot
$settings = Get-Content -LiteralPath (Join-Path $instanceRoot 'kubejs/config/ars_chest_loot.json') -Raw | ConvertFrom-Json
$files = @(Get-Item 'C:\Games\Minecraft\Install\libraries\net\minecraft\client\1.21.1-20240808.144430\client-1.21.1-20240808.144430-extra.jar') + @(Get-ChildItem (Join-Path $instanceRoot 'mods') -Filter '*.jar')
$tables = [System.Collections.Generic.HashSet[string]]::new()
$items = [System.Collections.Generic.HashSet[string]]::new()
foreach ($file in $files) {
    $archive = [IO.Compression.ZipFile]::OpenRead($file.FullName)
    try {
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -match '^data/([^/]+)/loot_table/(.+)\.json$') {
                [void] $tables.Add($Matches[1] + ':' + $Matches[2])
            }
            if ($entry.FullName -match '^assets/(ars_additions|ars_nouveau)/models/item/(.+)\.json$') {
                [void] $items.Add($Matches[1] + ':' + $Matches[2])
            }
        }
    } finally { $archive.Dispose() }
}
$seen = [System.Collections.Generic.HashSet[string]]::new()
foreach ($id in $settings.genericChestTables) {
    if (!$seen.Add($id)) { throw "Duplicate generic chest: $id" }
    if (!$tables.Contains($id)) { throw "Missing installed generic chest: $id" }
    if ($id -match '^(ars_additions|lootintegrations|lootr|endrem):|boss|vault|reward|quest|dispenser|spawner|archaeology|jackpot') {
        throw "Special/reward/helper table in generic selection: $id"
    }
}
foreach ($id in @('ars_additions:codex_entry', 'ars_additions:lost_codex_entry', 'ars_additions:ancient_codex_entry') +
    @('air', 'earth', 'fire', 'water', 'abjuration', 'conjuration', 'manipulation' | ForEach-Object { 'ars_nouveau:' + $_ + '_essence' })) {
    if (!$items.Contains($id)) { throw "Missing Ars item resource: $id" }
}
Write-Output "PASS: $($seen.Count) unique installed generic chest tables; special tables excluded; 10 Ars item resources present."

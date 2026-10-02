<# Verifies configured loot sources and boss tags against installed mod/vanilla resources. #>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$instanceRoot = Split-Path -Parent $PSScriptRoot
$settings = Get-Content -LiteralPath (Join-Path $instanceRoot 'kubejs/config/trialforged_leveling.json') -Raw | ConvertFrom-Json
$modFiles = @(Get-ChildItem -LiteralPath (Join-Path $instanceRoot 'mods') -Filter '*.jar' -File)
$vanillaResources = 'C:\Games\Minecraft\Install\libraries\net\minecraft\client\1.21.1-20240808.144430\client-1.21.1-20240808.144430-extra.jar'
$lootResources = @{}
$taggedBosses = [System.Collections.Generic.HashSet[string]]::new()
$entityResources = [System.Collections.Generic.HashSet[string]]::new()
foreach ($file in (@(Get-Item -LiteralPath $vanillaResources) + $modFiles)) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($file.FullName)
    try {
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -match '^data/([^/]+)/loot_table/(.+)\.json$') {
                $id = $Matches[1] + ':' + $Matches[2]
                $lootResources[$id] = @{ Archive = $file.FullName; Entry = $entry.FullName }
            }
            if ($entry.FullName -match '^data/([^/]+)/loot_table/entities/([^/]+)\.json$') {
                [void] $entityResources.Add($Matches[1] + ':' + $Matches[2])
            }
            if ($entry.FullName -match '^data/(c|twilightforest)/tags/entity_type/bosses\.json$') {
                $reader = [System.IO.StreamReader]::new($entry.Open())
                try { $tag = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
                foreach ($id in $tag.values) {
                    if ($id -is [string] -and $id -notlike '#*') { [void] $taggedBosses.Add($id) }
                }
            }
        }
    } finally { $archive.Dispose() }
}
foreach ($boss in $taggedBosses) {
    if ($settings.bosses -notcontains $boss) { throw "Installed boss tag not covered: $boss" }
}
# Born in Chaos has phases without entity loot tables; verify their registered names.
$bornJar = $modFiles | Where-Object Name -Like 'born_in*' | Select-Object -First 1
$bornArchive = [System.IO.Compression.ZipFile]::OpenRead($bornJar.FullName)
try {
    $entry = $bornArchive.GetEntry('net/mcreator/borninchaosv/init/BornInChaosV1ModEntities.class')
    $stream = $entry.Open()
    $buffer = [System.IO.MemoryStream]::new()
    try { $stream.CopyTo($buffer); $registryBytes = [System.Text.Encoding]::ASCII.GetString($buffer.ToArray()) }
    finally { $stream.Dispose(); $buffer.Dispose() }
    foreach ($boss in $settings.bosses) {
        if ($boss -like 'born_in_chaos_v1:*') {
            if (!$registryBytes.Contains($boss.Split(':')[1])) { throw "Unregistered boss: $boss" }
        } elseif (!$entityResources.Contains($boss) -and !$taggedBosses.Contains($boss)) {
            throw "Boss has no entity/tag resource evidence: $boss"
        }
    }
} finally { $bornArchive.Dispose() }

$visited = [System.Collections.Generic.HashSet[string]]::new()
function Test-LootReference {
    param([string] $Id, [bool] $RequireChest)
    if ($Id -match 'boss|reward|vault|ominous|trial|event') { throw "Boss/event source reference: $Id" }
    if (!$lootResources.ContainsKey($Id)) { throw "Missing loot resource: $Id" }
    if (!$visited.Add($Id)) { return }
    $source = $lootResources[$Id]
    $archive = [System.IO.Compression.ZipFile]::OpenRead($source.Archive)
    try {
        $reader = [System.IO.StreamReader]::new($archive.GetEntry($source.Entry).Open())
        try { $table = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    } finally { $archive.Dispose() }
    if ($RequireChest -and $table.type -ne 'minecraft:chest') { throw "Not a chest table: $Id" }
    if (@($table.pools).Count -eq 0) { throw "Empty loot source: $Id" }
    Test-LootNode -Node $table
}
function Test-LootNode {
    param($Node)
    if ($null -eq $Node -or $Node -is [string] -or $Node -is [ValueType]) { return }
    if ($Node -is [array]) {
        foreach ($child in $Node) { Test-LootNode -Node $child }
        return
    }
    if ($Node.type -eq 'minecraft:loot_table' -and $Node.value -is [string]) {
        Test-LootReference -Id $Node.value -RequireChest $false
    }
    foreach ($property in $Node.PSObject.Properties) { Test-LootNode -Node $property.Value }
}
foreach ($source in $settings.lootSources) { Test-LootReference -Id $source -RequireChest $true }
Write-Output "PASS: $($settings.bosses.Count) evidenced boss IDs, $($taggedBosses.Count) installed tagged bosses covered, $($settings.lootSources.Count) chest sources and $($visited.Count) transitive loot tables inspected."

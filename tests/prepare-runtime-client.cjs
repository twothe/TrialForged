/** Prepares an isolated full-pack client using installed binaries; never writes to original worlds or downloads software. */
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const install = 'C:/Games/Minecraft/Install'
const destination = path.join(root, 'local/runtime-validation')
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const base = readJson(path.join(install, 'versions/1.21.1/1.21.1.json'))
const loader = readJson(path.join(install, 'versions/neoforge-21.1.252/neoforge-21.1.252.json'))
fs.mkdirSync(destination, { recursive: true })
const resultPath = path.join(destination, 'runtime-result.json')
const previousResult = fs.existsSync(resultPath) ? readJson(resultPath) : null
fs.writeFileSync(path.join(destination, 'runtime-expected-tier.json'), JSON.stringify({ tier: previousResult?.status === 'passed' ? previousResult.tier : null }))
if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath)
const arsResultPath = path.join(destination, 'runtime-ars-chest-result.json')
if (fs.existsSync(arsResultPath)) fs.unlinkSync(arsResultPath)
for (const directory of ['mods', 'config', 'defaultconfigs', 'kubejs', 'datapacks', 'moonlight-global-datapacks', 'resourcepacks', 'patchouli_books', 'elsebase']) {
  if (fs.existsSync(path.join(root, directory))) fs.cpSync(path.join(root, directory), path.join(destination, directory), { recursive: true })
}
// Remove stale copied JARs/scripts so removed production files cannot run in the test copy.
for (const directory of ['mods', 'kubejs/server_scripts']) {
  const copiedDirectory = path.join(destination, directory)
  for (const entry of fs.readdirSync(copiedDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === 'runtime-server-probe.js') continue
    if (!fs.existsSync(path.join(root, directory, entry.name))) {
      const stalePath = path.resolve(copiedDirectory, entry.name)
      if (!stalePath.startsWith(path.resolve(destination) + path.sep)) throw new Error('Invalid test cleanup path')
      fs.unlinkSync(stalePath)
    }
  }
}
const world = path.join(destination, 'saves/Runtime Validation')
fs.mkdirSync(world, { recursive: true })
// Seed world metadata, including any embedded player data; no chunks or external player files are copied.
if (!fs.existsSync(path.join(world, 'level.dat'))) fs.copyFileSync(path.join(root, 'saves/Run #1/level.dat'), path.join(world, 'level.dat'))
for (const directory of ['datapacks', 'serverconfig']) {
  const source = path.join(root, 'saves/Run #1', directory)
  if (fs.existsSync(source)) fs.cpSync(source, path.join(world, directory), { recursive: true })
}
fs.mkdirSync(path.join(destination, 'natives'), { recursive: true })
for (const [source, target] of [['runtime-server-probe.js', 'server_scripts'],
  ['runtime-ars-chest-probe.js', 'server_scripts'], ['runtime-client-probe.js', 'client_scripts']]) {
  fs.copyFileSync(path.join(__dirname, source), path.join(destination, 'kubejs', target, source))
}
const options = fs.readFileSync(path.join(root, 'options.txt'), 'utf8')
  .replace(/^pauseOnLostFocus:.*$/m, 'pauseOnLostFocus:false').replace(/^fullscreen:.*$/m, 'fullscreen:false')
  .replace(/^soundCategory_master:.*$/m, 'soundCategory_master:0.0')
fs.writeFileSync(path.join(destination, 'options.txt'), options)
function allowed(rules) {
  if (!rules) return true
  let result = false
  for (const rule of rules) {
    if (rule.features || (rule.os?.name && rule.os.name !== 'windows') || (rule.os?.arch && rule.os.arch !== 'x86_64')) continue
    result = rule.action === 'allow'
  }
  return result
}
const libraries = new Map()
for (const library of [...base.libraries, ...loader.libraries]) {
  if (!allowed(library.rules)) continue
  const key = library.name.split(':').filter((_, index) => index !== 2).join(':')
  libraries.set(key, library)
}
const classpath = [...libraries.values()].map(library => {
  const file = path.join(install, 'libraries', library.downloads.artifact.path)
  if (!fs.existsSync(file)) throw new Error('Missing installed library: ' + file)
  return file
})
classpath.push(path.join(install, 'versions', loader.id, loader.id + '.jar'))
const variables = {
  library_directory: path.join(install, 'libraries'), classpath_separator: ';', classpath: classpath.join(';'),
  version_name: loader.id, natives_directory: path.join(destination, 'natives'),
  launcher_name: 'TrialforgedRuntimeValidation', launcher_version: '1',
  auth_player_name: 'RuntimeTester', auth_uuid: '00000000000000000000000000000001', auth_access_token: '0',
  clientid: '0', auth_xuid: '0', user_type: 'legacy', version_type: 'release',
  game_directory: destination, assets_root: path.join(install, 'assets'), assets_index_name: base.assetIndex.id
}
function expand(argumentsList) {
  return argumentsList.flatMap(argument => {
    if (typeof argument !== 'string') {
      if (!allowed(argument.rules)) return []
      argument = argument.value
    }
    return [argument].flat().map(value => value.replace(/\$\{([^}]+)\}/g, (_, name) => {
      if (!(name in variables)) throw new Error('Unknown launch variable: ' + name)
      return variables[name]
    }))
  })
}
const args = ['-Xms1G', '-Xmx6G', ...expand(base.arguments.jvm), ...expand(loader.arguments.jvm), loader.mainClass,
  ...expand(base.arguments.game), ...expand(loader.arguments.game), '--width', '960', '--height', '540',
  '--quickPlaySingleplayer', 'Runtime Validation']
// Java argument files use forward slashes to avoid Windows backslash escapes.
fs.writeFileSync(path.join(destination, 'client.args'), args.map(value => '"' + value.replaceAll('\\', '/').replaceAll('"', '\\"') + '"').join('\n'))
console.log('Prepared isolated client: ' + destination)
console.log('Installed library count: ' + classpath.length + '; no downloads performed.')

/** Reuses the installed-client setup for an isolated, muted accessories diagnosis. */
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const preparationPath = path.join(__dirname, 'prepare-runtime-client.cjs')
let source = fs.readFileSync(preparationPath, 'utf8')
source = source.replace("local/runtime-validation", "local/accessories-validation")
source = source.replaceAll('saves/Run #1', 'local/runtime-validation/saves/Runtime Validation')
source = source.replace("[['runtime-server-probe.js', 'server_scripts'],\n  ['runtime-ars-chest-probe.js', 'server_scripts'], ['runtime-client-probe.js', 'client_scripts']]",
  "[['runtime-accessories-probe.js', 'server_scripts'], ['runtime-accessories-client.js', 'client_scripts']]")
if (source.includes("['runtime-server-probe.js', 'server_scripts']")) throw new Error('Probe list replacement failed')
const preparation = new Module(preparationPath, module)
preparation.filename = preparationPath
preparation.paths = module.paths
preparation._compile(source, preparationPath)
const runtimeRoot = path.join(__dirname, '../local/accessories-validation')
const optionsPath = path.join(runtimeRoot, 'options.txt')
fs.writeFileSync(optionsPath, fs.readFileSync(optionsPath, 'utf8').replace(/^maxFps:.*$/m, 'maxFps:30'))
const irisPath = path.join(runtimeRoot, 'config/iris.properties')
if (fs.existsSync(irisPath)) fs.writeFileSync(irisPath, fs.readFileSync(irisPath, 'utf8').replace(/^enableShaders=.*$/m, 'enableShaders=false'))
// The installed Unfocused version has a documented race during parallel mod construction.
const fmlPath = path.join(runtimeRoot, 'config/fml.toml')
fs.writeFileSync(fmlPath, fs.readFileSync(fmlPath, 'utf8').replace(/^maxThreads = .*$/m, 'maxThreads = 1'))
const resultPath = path.join(runtimeRoot, 'runtime-accessories-result.json')
if (fs.existsSync(resultPath)) fs.unlinkSync(resultPath)

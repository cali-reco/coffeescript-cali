fs            = require 'fs'
{print}       = require 'util'
{spawn, exec} = require 'child_process'

target = 'js/editor.js'

sources = [
        'list',
        'stroke',
        'polygon',
        'helper',
        'scribble'
        'evaluate',
        'fuzzy',
        'gesture',
        'command',
        'shape',
        'line',
        'rectangle',
        'circle',
        'recognizer'
].map (f) -> 'src/'+f+'.coffee'


# ANSI Terminal Colors
bold = '\033[0;1m'
green = '\033[0;32m'
reset = '\033[0m'
red = '\033[0;31m'

log = (message, color, explanation) ->
  console.log color + message + reset + ' ' + (explanation or '')

build = (watch, callback) ->
  if typeof watch is 'function'
    callback = watch
    watch = false
  options = ['-j', 'lib/cali.js', '-cb']
  options.unshift '-w' if watch
  options = options.concat sources

  coffee = spawn 'coffee', options
  coffee.stdout.on 'data', (data) -> print data.toString()
  coffee.stderr.on 'data', (data) -> print data.toString()
  coffee.on 'exit', (status) -> callback?() if status is 0

spec = (callback) ->
  require 'jasmine-node'

  jasmine.executeSpecsInFolder(
    __dirname + '/spec', 
    (runner, log) -> process.exit(runner.results().failedCount), # callback
    true,  # isVerbose
    true,  # showColors
    false, # teamcity
    false, # use requirejs
    new RegExp(".spec\\.coffee$", 'i'), #regex
    false, # junit
  )

task 'docs', 'Generate annotated source code with Docco', ->
  fs.readdir 'src', (err, contents) ->
    files = ("src/#{file}" for file in contents when /\.coffee$/.test file)
    docco = spawn 'docco', files
    docco.stdout.on 'data', (data) -> print data.toString()
    docco.stderr.on 'data', (data) -> print data.toString()
    docco.on 'exit', (status) -> callback?() if status is 0

task 'build', 'Compile CoffeeScript source files', ->
  build()

task 'watch', 'Recompile CoffeeScript source files when modified', ->
  build true

task 'test', 'Run the test suite', ->
  build -> spec -> log ":)", green

task 'dist', 'Build final js', ->
  exec "./node_modules/.bin/browserify src/recognizer.coffee -o dist/cali.js", (err, stdout, stderr) ->
    throw err if err
    out = stdout + stderr
    console.log out if out != ''
    callback() if callback?
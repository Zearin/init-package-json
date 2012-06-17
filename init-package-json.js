
module.exports = init

var PZ = require('promzard').PromZard
var path = require('path')
var def = require.resolve('./default-input.js')

var fs = require('fs')
var semver = require('semver')
var read = require('read')

// to validate the data object at the end as a worthwhile package
// and assign default values for things.
// readJson.extras(file, data, cb)
var readJson = require('read-package-json')

function init (dir, input, config, cb) {
  if (typeof config === 'function')
    cb = config, config = {}
  var package = path.resolve(dir, 'package.json')
  input = path.resolve(input)
  var pkg
  var ctx = {}

  readJson(package, function (er, d) {
    if (er) pkg = {}
    else pkg = d

    ctx.filename = package
    ctx.dirname = path.dirname(package)
    ctx.basename = path.basename(ctx.dirname)
    if (!pkg.version || !semver.valid(pkg.version))
      delete pkg.version

    ctx.package = pkg
    ctx.config = config || {}

    // make sure that the input is valid.
    // if not, use the default
    var pz = new PZ(input, ctx)
    pz.backupFile = def
    pz.on('error', cb)
    pz.on('data', function (data) {
      Object.keys(data).forEach(function (k) {
        if (data[k] !== undefined && data[k] !== null) pkg[k] = data[k]
      })
      readJson.extras(package, pkg, function (er, pkg) {
        if (er) return cb(er, pkg)
        pkg = unParsePeople(pkg)
        // no need for the readme now.
        delete pkg.readme
        var d = JSON.stringify(pkg, null, 2) + '\n'
        console.log('About to write to %s:\n\n%s\n', package, d)
        read({prompt:'Is this ok? ', default: 'yes'}, function (er, ok) {
          if (!ok || ok.toLowerCase().charAt(0) !== 'y') {
            console.log('Aborted.')
          } else {
            fs.writeFile(package, d, 'utf8', function (er) {
              return cb(er, pkg)
            })
          }
        })
      })
    })
  })

}

// turn the objects into somewhat more humane strings.
function unParsePeople (data) {
  if (data.author) data.author = unParsePerson(data.author)
  ;["maintainers", "contributors"].forEach(function (set) {
    if (!Array.isArray(data[set])) return;
    data[set] = data[set].map(unParsePerson)
  })
  return data
}

function unParsePerson (person) {
  if (typeof person === "string") return person
  var name = person.name || ""
  var u = person.url || person.web
  var url = u ? (" ("+u+")") : ""
  var e = person.email || person.mail
  var email = e ? (" <"+e+">") : ""
  return name+email+url
}


var debug = require('debug')('metalsmith-copy'),
    path = require('path'),
    cloneDeep = require('lodash').cloneDeep,
    minimatch = require('minimatch');
    fs = require('fs');
    diff = require('diff');

module.exports = plugin;

function plugin(options) {
  return function(files, metalsmith, done) {
    if (!options.directory && !options.extension && !options.transform) return done(new Error('metalsmith-copy: "directory" or "extension" option required'));
    if (!options.force) options.force = false;

    var matcher = minimatch.Minimatch(options.pattern);

    Object.keys(files).forEach(function (file) {
      debug('checking file: ' + file);
      if (!matcher.match(file)) return;

      var newName = file;

      // transform filename
      if (options.transform) {
        newName = options.transform(file);
      } else {
        if (options.extension) {
          var currentExt = path.extname(file);
          newName = path.join(path.dirname(file), path.basename(file, currentExt) + options.extension);
        }
        if (options.directory) {
          newName = path.join(options.directory, path.basename(newName));
        }
      }

      if (newName === file) {
        return;
      }

      var source_link = metalsmith.source() + "/" + file;
      var target_link = metalsmith.destination() + "/" + newName;
      var source = "";
      var target = "";

      try {
        source = fs.readFileSync(source_link, 'utf8');
        debug("read source file: "+ source_link);
      } catch(e) {
        debug("error reading source: " + source_link + " --->" + e.message);
      }

      try {
        target = fs.readFileSync(target_link, 'utf8');
        debug("read target file: " + target_link);
      } catch(e) {
        debug("error reading target: " + target_link + " --->" + e.message);
      }

      function testfiles(source, target){
        var identical = true;

        var results = diff.diffLines(source, target);
        results.forEach(function(part) {
          if(part.added) {
            //console.log("added:   " + part.value);
            identical = false;
          }
          if(part.removed) {
            //console.log("removed: " + part.value);
            identical = false;
          }
        });
        return identical;
      }

      test = testfiles(source, target);
      debug("are identical? " + test);
      if (files[newName] && options.force === false) return done(new Error('metalsmith-copy: copying ' + file + ' to ' + newName + ' would overwrite file'));



      if (test === true) {
        debug('skipping file:' + newName);
      } else {
        debug('copying file: ' + newName);
        files[newName] = cloneDeep(files[file], function(value) {
          if (value instanceof Buffer) {
            return new Buffer(value);
          }
        });
      }

      if (options.move) {
        delete files[file];
      }
    });

    done();
  };
}

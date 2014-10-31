'use strict';

var Writer = require('broccoli-writer'),
  util = require('util'),
  RSVP = require('rsvp'),
  fs = require('fs'),
  path = require('path');

/**
 *
 * @param inputTree
 * @param options
 * @return {Tree2Json}
 * @constructor
 * @alias module:broccoli-tree-to-json
 */
function Tree2Json(inputTree, options) {
  if (!(this instanceof Tree2Json)) return new Tree2Json(inputTree, options);

  this.inputTree = inputTree;
  this.options = options;
}

util.inherits(Tree2Json, Writer);

Tree2Json.prototype.write = function (readTree, destDir) {
  var self = this, deferredWrite = RSVP.defer(), json = {};

  function readDir(srcDir) {
    //make a promise to read the directory. Resolve with all files or err
    return new RSVP.Promise(function (resolve, reject) {
      fs.readdir(srcDir, function (err, files) {
        if (err) { deferredWrite.reject(err); }
        else {
          resolve(statFiles({dir: srcDir, files: files}));
        }
      });
    });
  }

  function loadJson(filePath, buffer) {
    var elem = json;
    var keys = filePath.split(path.sep);
    keys.forEach(function (key, i) {
      var subelem;
      if (i === keys.length - 1) {
        elem[key.split('.')[0]] = buffer.toString();
      } else {
        subelem = elem[key] || {};
        elem[key] = subelem;
        elem = subelem;
      }
    });
  }

  function statFiles(args) {
    var parentPath = args.dir, files = args.files;
    //make a promise to stat all files, which is resolved
    //when each file is statted
    return RSVP.all(files.map(function (file) {
      return new RSVP.Promise(function (resolve, reject) {
        var filePath = path.join(parentPath, file);
        fs.lstat(filePath, function (err, stat) {
          if (err) { reject(err)}
          else {
            if (stat.isDirectory()) {
              resolve(readDir(filePath))
            } else {
              fs.readFile(filePath, function (err, data) {
                if (err) {reject(err);}
                else {
                  loadJson(filePath, data);
                  resolve();
                }
              });
            }
          }
        });
      });
    }));
  }

  readTree(self.inputTree)
    .then(readDir)
    .then(function () {
      deferredWrite.resolve();
    }).catch(function (err) {
      deferredWrite.reject(err);
    });

  return deferredWrite.promise;
};

/**
 *
 * @type {Tree2Json}
 */
module.exports = Tree2Json;
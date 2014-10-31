'use strict';

var Writer = require('broccoli-writer'),
  util = require('util'),
  RSVP = require('rsvp'),
  fs = require('fs'),
  path = require('path');


/**
 * Walk the input tree, calling visitor#visit for every file in the path.
 *
 * `vistor.visit` can return nothing, or a promise if it's behaving asynchronously.
 *
 * @param inputTree - input tree or path
 * @param visitor - an object
 * @return {TreeWalker}
 * @constructor
 */
function TreeWalker(inputTree, visitor) {
  if (!(this instanceof TreeWalker)) return new TreeWalker(inputTree);

  this.inputTree = inputTree;
  this.visitor = visitor;
}

TreeWalker.prototype.read = function (readTree) {
  var self = this, deferred = RSVP.defer();

  function readDir(srcDir) {
    //make a promise to read the directory.
    return new RSVP.Promise(function (resolve, reject) {
      fs.readdir(srcDir, function (err, files) {
        //Resolve with all files or err
        if (err) { deferred.reject(err); }
        else {
          resolve(statFiles({dir: srcDir, files: files}));
        }
      });
    });
  }

  //Callback hell. See walkthrough
  function statFiles(args) {
    var parentPath = args.dir, files = args.files;

    //make a promise to stat all files, which is resolved
    return RSVP.all(files.map(function (file) {
      //when each file is statted
      return new RSVP.Promise(function (resolve, reject) {
        var filePath = path.join(parentPath, file);
        //read the file
        fs.lstat(filePath, function (err, stat) {
          if (err) { reject(err)}
          else {
            if (stat.isDirectory()) {
              //and resolve it with the promise to read the directory
              resolve(readDir(filePath))
            } else {
              //or a visit to the filepath
              resolve(self.visitor.visit(filePath));
            }
          }
        });
      });
    }));
  }

  readTree(self.inputTree)
    .then(readDir)
    .then().then(function () {
      deferred.resolve();
    }).catch(function (err) {
      deferred.reject(err);
    });

  return deferred.promise;
};
/**
 *
 * @param inputTree - Tree or path
 * @return {Tree2Json}
 * @constructor
 * @alias module:broccoli-tree-to-json
 */
function Tree2Json(inputTree) {
  if (!(this instanceof Tree2Json)) return new Tree2Json(inputTree);

  this.walker = new TreeWalker(inputTree, this);
}

util.inherits(Tree2Json, Writer);

Tree2Json.prototype.loadJson = function (filePath, buffer) {
  var elem = this.json;
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
};

Tree2Json.prototype.visit = function (filePath) {
  var self = this;
  return new RSVP.Promise(function (resolve, reject) {
    fs.readFile(filePath, function (err, data) {
      if (err) {reject(err);}
      else {
        self.loadJson(filePath, data);
        //or we're done
        resolve();
      }
    })
  });
};

/**
 * Satisfy interface required by 'Write'
 *
 * @param readTree - a function to read the tree. It should return a promise
 * @param destDir - the directory to write the results in
 * @return {*}
 */
Tree2Json.prototype.write = function (readTree, destDir) {
  var self = this;
  this.json = {};

  return this.walker.read(readTree)
    .then(function () {
      return RSVP.all(Object.keys(self.json).map(function (key) {
        return new RSVP.Promise(function (resolve, reject) {
          fs.writeFile(path.join(destDir, key) + '.json', JSON.stringify(self.json), function (err) {
            if (err) {reject(err);}
            else resolve();
          });
        });
      }));
    });
};

/**
 *
 * @type {Tree2Json}
 */
module.exports = Tree2Json;
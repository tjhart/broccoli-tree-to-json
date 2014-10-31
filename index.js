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

/**
 *
 * Read the directory, and stat the files it contains. Returns a promise
 * that will be resolved with the result of statFiles
 *
 * @param srcDir {string} the directory to read
 * @return {RSVP.Promise}
 */
TreeWalker.prototype.readDir = function (srcDir) {
  var self = this;
  //make a promise to read the directory.
  return new RSVP.Promise(function (resolve, reject) {
    fs.readdir(srcDir, function (err, files) {
      //Resolve with all files or err
      if (err) { reject(err); }
      else {
        resolve(self.statFiles(srcDir, files));
      }
    });
  });
};

/**
 * Stat all the files in `parentPath`, calling `readDir` for directories,
 * and deferring to the visitor for plain files.
 * The resulting promise will be resolved with an array of promises.
 *
 * @param parentPath {string} the parent directory for the files
 * @param files {array} the list of files in the directory
 * @return {RSVP.Promise}
 */
TreeWalker.prototype.statFiles = function statFiles(parentPath, files) {
  var self = this;

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
            resolve(self.readDir(filePath))
          } else {
            //or a visit to the filepath
            resolve(self.visitor.visit(filePath));
          }
        }
      });
    });
  }));
};

/**
 * Implementation of Brocolli's required `read` method for a tree
 *
 * Read the input tree, then read read the src dir
 *
 * @param readTree
 * @return {RSVP.Promise}
 */
TreeWalker.prototype.read = function (readTree) {
  var self = this;

  return readTree(self.inputTree)
    .then(this.readDir.bind(this));
};

/**
 * Take an input tree, and roll it up into a JSON document.
 * The resulting document will be named `srcDir.json`. it will have
 * key names associated with each of the file and directories that `srcDir` contains.
 * If the key represents the file, then the stringified file contents will be the value of the key.
 * If the key represents a directory, then the value of that key will be an `Object`, represented
 * by the same algorithm
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

/**
 * Take the contents of the `buffer`, and place it in the JSON at the
 * path represented by filePath

 * @param filePath
 * @param buffer
 */
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

/**
 * Interface implementation required by Walker.
 *
 * Read the file, and load the results into json
 *
 * @param filePath
 * @return {RSVP.Promise}
 */
Tree2Json.prototype.visit = function (filePath) {
  var self = this;
  return new RSVP.Promise(function (resolve, reject) {
    fs.readFile(filePath, function (err, data) {
      if (err) {reject(err);}
      else {
        self.loadJson(filePath, data);
        resolve();
      }
    })
  });
};

/**
 * Satisfy interface required by 'Write'.
 *
 * Defer to walker to read the tree (which will let me visit each file)
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
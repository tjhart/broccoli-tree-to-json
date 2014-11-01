'use strict';

var TreeTraverser = require('broccoli-tree-traverser'),
  Writer = require('broccoli-writer'),
  util = require('util'),
  RSVP = require('rsvp'),
  fs = require('fs'),
  path = require('path');

/**
 * Take an input tree, and roll it up into a JSON document.
 * The resulting document will be named `srcDir.json`. it will have
 * key names associated with each of the file and directories that `srcDir` contains.
 * If the key represents the file, then the stringified file contents will be the value of the key.
 * If the key represents a directory, then the value of that key will be an `Object`, represented
 * by the same algorithm
 *
 * @param inputTree {string} - relative path to source tree
 * @return {Tree2Json}
 * @constructor
 * @alias module:index
 */
function Tree2Json(inputTree) {
  if (!(this instanceof Tree2Json)) return new Tree2Json(inputTree);

  this.inputTree = inputTree;
  this.walker = new TreeTraverser(inputTree, this);
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
  var keys = filePath.substr(this.inputTree.length + 1).split(path.sep);
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
 * @return {RSVP.Promise}
 */
Tree2Json.prototype.write = function (readTree, destDir) {
  var self = this;
  this.json = {};

  return readTree(this.walker)
    .then(function () {
      return new RSVP.Promise(function (resolve, reject) {

        fs.writeFile(path.join(destDir, self.inputTree.substr(self.inputTree.lastIndexOf('/'))) + '.json', JSON.stringify(self.json), function (err) {
          if (err) {reject(err);}
          else resolve();
        });
      });
    }).then(function () {
      self.json = {};
    });
};

/**
 *
 * @type {Tree2Json}
 */
module.exports = Tree2Json;
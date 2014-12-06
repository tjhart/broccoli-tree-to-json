broccoli-tree-to-json
====================

Roll up a directory tree into a JSON document.

The directory structure:
```
root
|--key1.txt #123
|--key2.txt #val2
+--subdir
   |--key3.txt #true
   |--key4.txt #val4
```

Will result in the following json:
```javascript
//destDir/root.json
{
  "key1":123,
  "key2":"val2",
  "subdir":{
    "key3":true,
    "key4":"val4"
  }
}
```

The file extension is ignored. The JSON key is determined by the portion of the file to the left of the first dot.

File contents are parsed by `JSON.parse`, and if that fails the contents of the file is treated like a string.

## TODO

* Better Array support

## Example use

### In a Brocfile:
```javascript
//Brocfile.js
var tree2Json = require('broccoli-tree-to-json');

module.exports = tree2Json('interesting/path');

```

### Within another plugin
```javascript
//index.js
var tree2Json = require('broccoli-tree-to-json'),
  path = require('path');

function MyPlugin(inputTree){
  this.jsonTree = tree2Json(path.join(inputTree, 'json'));
}

MyPlugin.prototype.read = function(readTree){
  return readTree(this.jsonTree)
    .then(function(){
      //...
    });
};

module.exports = MyPlugin; 
```
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
//root.json
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
var Tree2Json = require('broccoli-tree-to-json');

var visitor = {
  visit:function(path){
    console.log('visiting', path);  
  }
};

module.exports = traverser('interesting/path', visitor);

```

### Within another plugin
```javascript
//index.js
var traverser = require('broccoli-tree-traverser');


function MyPlugin(inputTree){
  this.traverser = traverser(inputTree, this);
}

MyPlugin.prototype.visit = function(path){
  //do something interesting with the path
};

MyPlugin.prototype.read = function(readTree){
  return readTree(this.traverser);
};


module.exports = MyPlugin; 
```
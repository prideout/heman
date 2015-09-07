var CreateHeman = function(Module) {
  Module = Module || {};

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof CreateHeman !== 'undefined' ? CreateHeman : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB;
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret; return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if ((!opts || !opts.async) && typeof EmterpreterAsync === 'object') {
      assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling ccall');
    }
    if (opts && opts.async) assert(!returnType, 'async ccalls cannot return values');
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    funcstr += "if (typeof EmterpreterAsync === 'object') { assert(!EmterpreterAsync.state, 'cannot start async op with normal JS calling cwrap') }";
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if (typeof _sbrk !== 'undefined' && !_sbrk.called) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module['Pointer_stringify'] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module['AsciiToString'] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module['stringToAscii'] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the a given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module['UTF8ArrayToString'] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8, ptr);
}
Module['UTF8ToString'] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module['stringToUTF8Array'] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
Module['stringToUTF8'] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module['lengthBytesUTF8'] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF16'] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module['lengthBytesUTF16'] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  assert(typeof maxBytesToWrite == 'number', 'stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!');
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module['stringToUTF32'] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module['lengthBytesUTF32'] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  // TOTAL_MEMORY is the current size of the actual array, and DYNAMICTOP is the new top.
  assert(DYNAMICTOP >= TOTAL_MEMORY);
  assert(TOTAL_MEMORY > 4); // So the loop below will not be infinite

  var OLD_TOTAL_MEMORY = TOTAL_MEMORY;


  var LIMIT = Math.pow(2, 31); // 2GB is a practical maximum, as we use signed ints as pointers
                               // and JS engines seem unhappy to give us 2GB arrays currently
  if (DYNAMICTOP >= LIMIT) return false;

  while (TOTAL_MEMORY <= DYNAMICTOP) { // Simple heuristic.
    if (TOTAL_MEMORY < LIMIT/2) {
      TOTAL_MEMORY = alignMemoryPage(2*TOTAL_MEMORY); // double until 1GB
    } else {
      var last = TOTAL_MEMORY;
      TOTAL_MEMORY = alignMemoryPage((3*TOTAL_MEMORY + LIMIT)/4); // add smaller increments towards 2GB, which we cannot reach
      if (TOTAL_MEMORY <= last) return false;
    }
  }

  TOTAL_MEMORY = Math.max(TOTAL_MEMORY, 16*1024*1024);

  if (TOTAL_MEMORY >= LIMIT) return false;

  Module.printErr('Warning: Enlarging memory arrays, this is not fast! ' + [OLD_TOTAL_MEMORY, TOTAL_MEMORY]);


  var start = Date.now();

  try {
    if (ArrayBuffer.transfer) {
      buffer = ArrayBuffer.transfer(buffer, TOTAL_MEMORY);
    } else {
      var oldHEAP8 = HEAP8;
      buffer = new ArrayBuffer(TOTAL_MEMORY);
    }
  } catch(e) {
    return false;
  }

  var success = _emscripten_replace_memory(buffer);
  if (!success) return false;

  // everything worked

  Module['buffer'] = buffer;
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
  if (!ArrayBuffer.transfer) {
    HEAP8.set(oldHEAP8);
  }

  Module.printErr('enlarged memory arrays from ' + OLD_TOTAL_MEMORY + ' to ' + TOTAL_MEMORY + ', took ' + (Date.now() - start) + ' ms (has ArrayBuffer.transfer? ' + (!!ArrayBuffer.transfer) + ')');

  return true;
}

var byteLength;
try {
  byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get);
  byteLength(new ArrayBuffer(4)); // can fail on older ie
} catch(e) { // can fail on older node/v8
  byteLength = function(buffer) { return buffer.byteLength; };
}

var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
totalMemory = Math.max(totalMemory, 16*1024*1024);
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec (and given that TOTAL_STACK=' + TOTAL_STACK + ')');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);

HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
  var orig = id;
  while (1) {
    if (!runDependencyTracking[id]) return id;
    id = orig + Math.random();
  }
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;

// === Body ===

var ASM_CONSTS = [];





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 5984;
  /* global initializers */ __ATINIT__.push({ func: function() { __GLOBAL__sub_I_wrapjs_cpp() } }, { func: function() { __GLOBAL__sub_I_bind_cpp() } });
  

/* memory initializer */ allocate([205,204,12,64,0,0,0,0,119,105,100,116,104,32,62,32,48,32,38,38,32,110,117,109,95,99,111,108,111,114,115,32,62,61,32,50,0,0,0,0,115,114,99,47,99,111,108,111,114,46,99,0,0,0,0,0,104,101,109,97,110,95,99,111,108,111,114,95,99,114,101,97,116,101,95,103,114,97,100,105,101,110,116,0,0,0,0,0,99,112,95,108,111,99,97,116,105,111,110,115,91,48,93,32,61,61,32,48,0,0,0,0,99,112,95,108,111,99,97,116,105,111,110,115,91,110,117,109,95,99,111,108,111,114,115,32,45,32,49,93,32,61,61,32,119,105,100,116,104,32,45,32,49,0,0,0,0,0,0,0,104,101,109,97,110,95,99,111,108,111,114,95,97,112,112,108,121,95,103,114,97,100,105,101,110,116,0,0,0,0,0,0,103,114,97,100,105,101,110,116,45,62,104,101,105,103,104,116,32,61,61,32,49,0,0,0,103,114,97,100,105,101,110,116,45,62,110,98,97,110,100,115,32,61,61,32,51,0,0,0,103,114,97,121,115,99,97,108,101,45,62,110,98,97,110,100,115,32,61,61,32,49,0,0,104,101,109,97,110,95,99,111,108,111,114,95,102,114,111,109,95,103,114,97,121,115,99,97,108,101,0,0,0,0,0,0,115,114,99,45,62,110,98,97,110,100,115,32,61,61,32,49,32,38,38,32,34,68,105,115,116,97,110,99,101,32,102,105,101,108,100,32,105,110,112,117,116,32,109,117,115,116,32,104,97,118,101,32,111,110,108,121,32,49,32,98,97,110,100,46,34,0,0,0,0,0,0,0,115,114,99,47,100,105,115,116,97,110,99,101,46,99,0,0,104,101,109,97,110,95,100,105,115,116,97,110,99,101,95,99,114,101,97,116,101,95,115,100,102,0,0,0,0,0,0,0,115,114,99,47,108,105,103,104,116,105,110,103,46,99,0,0,104,101,109,97,110,95,108,105,103,104,116,105,110,103,95,99,111,109,112,117,116,101,95,110,111,114,109,97,108,115,0,0,104,101,109,97,110,95,108,105,103,104,116,105,110,103,95,97,112,112,108,121,0,0,0,0,97,108,98,101,100,111,45,62,110,98,97,110,100,115,32,61,61,32,51,0,0,0,0,0,97,108,98,101,100,111,45,62,119,105,100,116,104,32,61,61,32,119,105,100,116,104,0,0,97,108,98,101,100,111,45,62,104,101,105,103,104,116,32,61,61,32,104,101,105,103,104,116,0,0,0,0,0,0,0,0,0,0,0,191,0,0,0,63,0,0,128,63,0,0,0,0,104,101,109,97,110,95,108,105,103,104,116,105,110,103,95,99,111,109,112,117,116,101,95,111,99,99,108,117,115,105,111,110,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,255,255,255,255,0,0,0,0,0,0,0,0,255,255,255,255,1,0,0,0,1,0,0,0,255,255,255,255,255,255,255,255,1,0,0,0,255,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,255,255,255,255,254,255,255,255,1,0,0,0,254,255,255,255,255,255,255,255,1,0,0,0,2,0,0,0,1,0,0,0,254,255,255,255,255,255,255,255,2,0,0,0,255,255,255,255,254,255,255,255,110,115,119,101,101,112,115,32,61,61,32,40,112,32,45,32,115,116,97,114,116,112,116,115,41,32,47,32,50,0,0,0,104,111,114,105,122,111,110,95,115,99,97,110,0,0,0,0,115,116,97,99,107,95,116,111,112,32,60,32,112,97,116,104,108,101,110,0,0,0,0,0,114,101,115,117,108,116,45,62,100,97,116,97,91,105,93,32,62,61,32,48,46,48,32,38,38,32,114,101,115,117,108,116,45,62,100,97,116,97,91,105,93,32,60,61,32,49,46,48,102,0,0,0,0,0,0,0,5,2,2,5,251,2,254,5,5,254,2,251,251,254,254,251,245,4,4,252,11,4,252,4,11,11,4,4,4,11,4,4,4,11,245,252,4,252,245,4,252,252,11,11,252,4,4,245,4,4,252,11,245,4,252,252,11,252,252,4,245,11,4,252,4,11,252,4,4,245,245,252,252,252,245,252,252,252,245,11,252,252,4,245,252,4,252,245,104,109,97,112,45,62,110,98,97,110,100,115,32,61,61,32,49,0,0,0,0,0,0,0,115,114,99,47,111,112,115,46,99,0,0,0,0,0,0,0,104,101,109,97,110,95,111,112,115,95,115,116,101,112,0,0,104,101,109,97,110,95,111,112,115,95,115,119,101,101,112,0,99,111,117,110,116,32,62,32,48,0,0,0,0,0,0,0,104,101,109,97,110,95,111,112,115,95,115,116,105,116,99,104,95,104,111,114,105,122,111,110,116,97,108,0,0,0,0,0,105,109,97,103,101,115,91,105,93,45,62,119,105,100,116,104,32,61,61,32,119,105,100,116,104,0,0,0,0,0,0,0,105,109,97,103,101,115,91,105,93,45,62,104,101,105,103,104,116,32,61,61,32,104,101,105,103,104,116,0,0,0,0,0,105,109,97,103,101,115,91,105,93,45,62,110,98,97,110,100,115,32,61,61,32,110,98,97,110,100,115,0,0,0,0,0,104,101,109,97,110,95,111,112,115,95,115,116,105,116,99,104,95,118,101,114,116,105,99,97,108,0,0,0,0,0,0,0,104,101,105,103,104,116,109,97,112,45,62,110,98,97,110,100,115,32,61,61,32,49,0,0,104,101,109,97,110,95,111,112,115,95,108,97,112,108,97,99,105,97,110,0,0,0,0,0,100,115,116,45,62,110,98,97,110,100,115,32,61,61,32,115,114,99,45,62,110,98,97,110,100,115,0,0,0,0,0,0,104,101,109,97,110,95,111,112,115,95,97,99,99,117,109,117,108,97,116,101,0,0,0,0,100,115,116,45,62,119,105,100,116,104,32,61,61,32,115,114,99,45,62,119,105,100,116,104,0,0,0,0,0,0,0,0,100,115,116,45,62,104,101,105,103,104,116,32,61,61,32,115,114,99,45,62,104,101,105,103,104,116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,88,20,0,0,200,10,0,0,64,21,0,0,176,10,0,0,0,0,0,0,128,5,0,0,64,21,0,0,152,10,0,0,1,0,0,0,128,5,0,0,105,105,0,0,0,0,0,0,118,0,0,0,0,0,0,0,66,117,102,102,101,114,0,0,118,105,0,0,0,0,0,0,119,105,100,116,104,0,0,0,200,19,0,0,136,5,0,0,105,105,105,0,0,0,0,0,104,101,105,103,104,116,0,0,110,98,97,110,100,115,0,0,98,101,103,105,110,0,0,0,101,110,100,0,0,0,0,0,88,20,0,0,144,10,0,0,64,21,0,0,136,10,0,0,0,0,0,0,0,6,0,0,64,21,0,0,120,10,0,0,1,0,0,0,0,6,0,0,105,105,0,0,0,0,0,0,73,109,97,103,101,0,0,0,118,105,0,0,0,0,0,0,99,114,101,97,116,101,0,0,136,5,0,0,200,19,0,0,200,19,0,0,200,19,0,0,105,105,105,105,105,0,0,0,100,101,115,116,114,111,121,0,72,19,0,0,136,5,0,0,118,105,105,0,0,0,0,0,88,20,0,0,104,10,0,0,64,21,0,0,88,10,0,0,0,0,0,0,120,6,0,0,64,21,0,0,72,10,0,0,1,0,0,0,120,6,0,0,105,105,0,0,0,0,0,0,71,101,110,101,114,97,116,101,0,0,0,0,0,0,0,0,118,105,0,0,0,0,0,0,105,115,108,97,110,100,95,104,101,105,103,104,116,109,97,112,0,0,0,0,0,0,0,0,112,108,97,110,101,116,95,104,101,105,103,104,116,109,97,112,0,0,0,0,0,0,0,0,115,105,109,112,108,101,120,95,102,98,109,0,0,0,0,0,136,5,0,0,200,19,0,0,200,19,0,0,56,20,0,0,56,20,0,0,200,19,0,0,56,20,0,0,56,20,0,0,200,19,0,0,0,0,0,0,105,105,105,105,102,102,105,102,102,105,0,0,0,0,0,0,88,20,0,0,64,10,0,0,64,21,0,0,56,10,0,0,0,0,0,0,56,7,0,0,64,21,0,0,48,10,0,0,1,0,0,0,56,7,0,0,105,105,0,0,0,0,0,0,79,112,115,0,0,0,0,0,118,105,0,0,0,0,0,0,115,116,105,116,99,104,95,104,111,114,105,122,111,110,116,97,108,0,0,0,0,0,0,0,136,5,0,0,8,10,0,0,200,19,0,0,0,0,0,0,105,105,105,105,0,0,0,0,115,116,105,116,99,104,95,118,101,114,116,105,99,97,108,0,110,111,114,109,97,108,105,122,101,95,102,51,50,0,0,0,136,5,0,0,136,5,0,0,56,20,0,0,56,20,0,0,105,105,105,102,102,0,0,0,115,116,101,112,0,0,0,0,136,5,0,0,136,5,0,0,56,20,0,0,0,0,0,0,105,105,105,102,0,0,0,0,115,119,101,101,112,0,0,0,136,5,0,0,136,5,0,0,105,105,105,0,0,0,0,0,108,97,112,108,97,99,105,97,110,0,0,0,0,0,0,0,97,99,99,117,109,117,108,97,116,101,0,0,0,0,0,0,72,19,0,0,136,5,0,0,136,5,0,0,0,0,0,0,118,105,105,105,0,0,0,0,88,20,0,0,248,9,0,0,64,21,0,0,232,9,0,0,0,0,0,0,80,8,0,0,64,21,0,0,216,9,0,0,1,0,0,0,80,8,0,0,105,105,0,0,0,0,0,0,76,105,103,104,116,105,110,103,0,0,0,0,0,0,0,0,118,105,0,0,0,0,0,0,97,112,112,108,121,0,0,0,136,5,0,0,136,5,0,0,56,20,0,0,56,20,0,0,56,20,0,0,0,0,0,0,105,105,105,102,102,102,0,0,99,111,109,112,117,116,101,95,110,111,114,109,97,108,115,0,99,111,109,112,117,116,101,95,111,99,99,108,117,115,105,111,110,0,0,0,0,0,0,0,88,20,0,0,208,9,0,0,64,21,0,0,200,9,0,0,0,0,0,0,232,8,0,0,64,21,0,0,184,9,0,0,1,0,0,0,232,8,0,0,105,105,0,0,0,0,0,0,67,111,108,111,114,0,0,0,118,105,0,0,0,0,0,0,99,114,101,97,116,101,95,103,97,100,105,101,110,116,0,0,136,5,0,0,200,19,0,0,200,19,0,0,216,19,0,0,0,20,0,0,0,0,0,0,105,105,105,105,105,105,0,0,115,101,116,95,103,97,109,109,97,0,0,0,0,0,0,0,72,19,0,0,56,20,0,0,118,105,102,0,0,0,0,0,97,112,112,108,121,95,103,114,97,100,105,101,110,116,0,0,136,5,0,0,136,5,0,0,56,20,0,0,56,20,0,0,136,5,0,0,0,0,0,0,105,105,105,102,102,105,0,0,102,114,111,109,95,103,114,97,121,115,99,97,108,101,0,0,80,75,53,67,111,108,111,114,0,0,0,0,0,0,0,0,80,53,67,111,108,111,114,0,53,67,111,108,111,114,0,0,80,75,56,76,105,103,104,116,105,110,103,0,0,0,0,0,80,56,76,105,103,104,116,105,110,103,0,0,0,0,0,0,56,76,105,103,104,116,105,110,103,0,0,0,0,0,0,0,64,21,0,0,24,10,0,0,0,0,0,0,136,5,0,0,80,80,49,51,104,101,109,97,110,95,105,109,97,103,101,95,115,0,0,0,0,0,0,0,80,75,51,79,112,115,0,0,80,51,79,112,115,0,0,0,51,79,112,115,0,0,0,0,80,75,56,71,101,110,101,114,97,116,101,0,0,0,0,0,80,56,71,101,110,101,114,97,116,101,0,0,0,0,0,0,56,71,101,110,101,114,97,116,101,0,0,0,0,0,0,0,80,75,53,73,109,97,103,101,0,0,0,0,0,0,0,0,80,53,73,109,97,103,101,0,53,73,109,97,103,101,0,0,80,75,49,51,104,101,109,97,110,95,105,109,97,103,101,95,115,0,0,0,0,0,0,0,80,49,51,104,101,109,97,110,95,105,109,97,103,101,95,115,0,0,0,0,0,0,0,0,49,51,104,101,109,97,110,95,105,109,97,103,101,95,115,0,118,111,105,100,0,0,0,0,98,111,111,108,0,0,0,0,99,104,97,114,0,0,0,0,115,105,103,110,101,100,32,99,104,97,114,0,0,0,0,0,117,110,115,105,103,110,101,100,32,99,104,97,114,0,0,0,115,104,111,114,116,0,0,0,117,110,115,105,103,110,101,100,32,115,104,111,114,116,0,0,105,110,116,0,0,0,0,0,117,110,115,105,103,110,101,100,32,105,110,116,0,0,0,0,108,111,110,103,0,0,0,0,117,110,115,105,103,110,101,100,32,108,111,110,103,0,0,0,102,108,111,97,116,0,0,0,100,111,117,98,108,101,0,0,115,116,100,58,58,115,116,114,105,110,103,0,0,0,0,0,115,116,100,58,58,98,97,115,105,99,95,115,116,114,105,110,103,60,117,110,115,105,103,110,101,100,32,99,104,97,114,62,0,0,0,0,0,0,0,0,115,116,100,58,58,119,115,116,114,105,110,103,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,118,97,108,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,99,104,97,114,62,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,115,105,103,110,101,100,32,99,104,97,114,62,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,110,115,105,103,110,101,100,32,99,104,97,114,62,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,115,104,111,114,116,62,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,110,115,105,103,110,101,100,32,115,104,111,114,116,62,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,105,110,116,62,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,110,115,105,103,110,101,100,32,105,110,116,62,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,108,111,110,103,62,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,110,115,105,103,110,101,100,32,108,111,110,103,62,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,105,110,116,56,95,116,62,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,105,110,116,56,95,116,62,0,0,0,0,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,105,110,116,49,54,95,116,62,0,0,0,0,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,105,110,116,49,54,95,116,62,0,0,0,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,105,110,116,51,50,95,116,62,0,0,0,0,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,117,105,110,116,51,50,95,116,62,0,0,0,0,0,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,102,108,111,97,116,62,0,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,100,111,117,98,108,101,62,0,101,109,115,99,114,105,112,116,101,110,58,58,109,101,109,111,114,121,95,118,105,101,119,60,108,111,110,103,32,100,111,117,98,108,101,62,0,0,0,0,88,20,0,0,96,14,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,101,69,69,0,0,88,20,0,0,136,14,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,100,69,69,0,0,88,20,0,0,176,14,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,102,69,69,0,0,88,20,0,0,216,14,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,109,69,69,0,0,88,20,0,0,0,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,108,69,69,0,0,88,20,0,0,40,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,106,69,69,0,0,88,20,0,0,80,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,105,69,69,0,0,88,20,0,0,120,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,116,69,69,0,0,88,20,0,0,160,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,115,69,69,0,0,88,20,0,0,200,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,104,69,69,0,0,88,20,0,0,240,15,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,97,69,69,0,0,88,20,0,0,24,16,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,49,49,109,101,109,111,114,121,95,118,105,101,119,73,99,69,69,0,0,88,20,0,0,64,16,0,0,78,49,48,101,109,115,99,114,105,112,116,101,110,51,118,97,108,69,0,0,0,0,0,0,224,20,0,0,112,16,0,0,0,0,0,0,1,0,0,0,176,16,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,98,97,115,105,99,95,115,116,114,105,110,103,73,119,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,119,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,119,69,69,69,69,0,0,88,20,0,0,184,16,0,0,78,83,116,51,95,95,49,50,49,95,95,98,97,115,105,99,95,115,116,114,105,110,103,95,99,111,109,109,111,110,73,76,98,49,69,69,69,0,0,0,224,20,0,0,248,16,0,0,0,0,0,0,1,0,0,0,176,16,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,98,97,115,105,99,95,115,116,114,105,110,103,73,104,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,104,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,104,69,69,69,69,0,0,224,20,0,0,80,17,0,0,0,0,0,0,1,0,0,0,176,16,0,0,0,0,0,0,78,83,116,51,95,95,49,49,50,98,97,115,105,99,95,115,116,114,105,110,103,73,99,78,83,95,49,49,99,104,97,114,95,116,114,97,105,116,115,73,99,69,69,78,83,95,57,97,108,108,111,99,97,116,111,114,73,99,69,69,69,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,17,0,0,1,0,0,0,2,0,0,0,3,0,0,0,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,128,20,0,0,176,17,0,0,232,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,116,57,101,120,99,101,112,116,105,111,110,0,0,0,0,88,20,0,0,216,17,0,0,83,116,57,116,121,112,101,95,105,110,102,111,0,0,0,0,88,20,0,0,240,17,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,0,128,20,0,0,8,18,0,0,0,18,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,128,20,0,0,64,18,0,0,48,18,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,57,95,95,112,111,105,110,116,101,114,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,112,98,97,115,101,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,0,0,0,128,20,0,0,160,18,0,0,48,18,0,0,0,0,0,0,128,20,0,0,120,18,0,0,200,18,0,0,0,0,0,0,0,0,0,0,48,19,0,0,4,0,0,0,5,0,0,0,6,0,0,0,7,0,0,0,8,0,0,0,0,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,51,95,95,102,117,110,100,97,109,101,110,116,97,108,95,116,121,112,101,95,105,110,102,111,69,0,128,20,0,0,8,19,0,0,48,18,0,0,0,0,0,0,118,0,0,0,0,0,0,0,240,18,0,0,64,19,0,0,68,110,0,0,0,0,0,0,240,18,0,0,80,19,0,0,98,0,0,0,0,0,0,0,240,18,0,0,96,19,0,0,99,0,0,0,0,0,0,0,240,18,0,0,112,19,0,0,104,0,0,0,0,0,0,0,240,18,0,0,128,19,0,0,97,0,0,0,0,0,0,0,240,18,0,0,144,19,0,0,115,0,0,0,0,0,0,0,240,18,0,0,160,19,0,0,116,0,0,0,0,0,0,0,240,18,0,0,176,19,0,0,105,0,0,0,0,0,0,0,240,18,0,0,192,19,0,0,80,75,105,0,0,0,0,0,64,21,0,0,208,19,0,0,1,0,0,0,200,19,0,0,106,0,0,0,0,0,0,0,240,18,0,0,232,19,0,0,80,75,106,0,0,0,0,0,64,21,0,0,248,19,0,0,1,0,0,0,240,19,0,0,108,0,0,0,0,0,0,0,240,18,0,0,16,20,0,0,109,0,0,0,0,0,0,0,240,18,0,0,32,20,0,0,102,0,0,0,0,0,0,0,240,18,0,0,48,20,0,0,100,0,0,0,0,0,0,0,240,18,0,0,64,20,0,0,0,0,0,0,104,18,0,0,4,0,0,0,9,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,11,0,0,0,12,0,0,0,13,0,0,0,0,0,0,0,200,20,0,0,4,0,0,0,14,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,15,0,0,0,16,0,0,0,17,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,0,128,20,0,0,160,20,0,0,104,18,0,0,0,0,0,0,0,0,0,0,40,21,0,0,4,0,0,0,18,0,0,0,6,0,0,0,7,0,0,0,10,0,0,0,19,0,0,0,20,0,0,0,21,0,0,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,0,0,128,20,0,0,0,21,0,0,104,18,0,0,0,0,0,0,0,0,0,0,216,18,0,0,4,0,0,0,22,0,0,0,6,0,0,0,7,0,0,0,23,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);




/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }

  
  
  
  function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }var embind_charCodes=undefined;function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
  
  
  var awaitingDependencies={};
  
  var registeredTypes={};
  
  var typeDependencies={};
  
  
  
  
  
  
  var char_0=48;
  
  var char_9=57;function makeLegalFunctionName(name) {
      if (undefined === name) {
          return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
          return '_' + name;
      } else {
          return name;
      }
    }function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      /*jshint evil:true*/
      return new Function(
          "body",
          "return function " + name + "() {\n" +
          "    \"use strict\";" +
          "    return body.apply(this, arguments);\n" +
          "};\n"
      )(body);
    }function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
          this.name = errorName;
          this.message = message;
  
          var stack = (new Error(message)).stack;
          if (stack !== undefined) {
              this.stack = this.toString() + '\n' +
                  stack.replace(/^Error(:[^\n]*)?\n/, '');
          }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
          if (this.message === undefined) {
              return this.name;
          } else {
              return this.name + ': ' + this.message;
          }
      };
  
      return errorClass;
    }var BindingError=undefined;function throwBindingError(message) {
      throw new BindingError(message);
    }
  
  
  
  var InternalError=undefined;function throwInternalError(message) {
      throw new InternalError(message);
    }function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });
  
      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach(function(dt, i) {
          if (registeredTypes.hasOwnProperty(dt)) {
              typeConverters[i] = registeredTypes[dt];
          } else {
              unregisteredTypes.push(dt);
              if (!awaitingDependencies.hasOwnProperty(dt)) {
                  awaitingDependencies[dt] = [];
              }
              awaitingDependencies[dt].push(function() {
                  typeConverters[i] = registeredTypes[dt];
                  ++registered;
                  if (registered === unregisteredTypes.length) {
                      onComplete(typeConverters);
                  }
              });
          }
      });
      if (0 === unregisteredTypes.length) {
          onComplete(typeConverters);
      }
    }function registerType(rawType, registeredInstance, options) {
      options = options || {};
  
      if (!('argPackAdvance' in registeredInstance)) {
          throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }
  
      var name = registeredInstance.name;
      if (!rawType) {
          throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
              return;
          } else {
              throwBindingError("Cannot register type '" + name + "' twice");
          }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach(function(cb) {
              cb();
          });
      }
    }function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          isVoid: true, // void return values can be optimized out sometimes
          name: name,
          'argPackAdvance': 0,
          'fromWireType': function() {
              return undefined;
          },
          'toWireType': function(destructors, o) {
              // TODO: assert if anything else is given?
              return undefined;
          },
      });
    }

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  var EXCEPTIONS={last:0,caught:[],infos:{},deAdjust:function (adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
        for (var ptr in EXCEPTIONS.infos) {
          var info = EXCEPTIONS.infos[ptr];
          if (info.adjusted === adjusted) {
            return ptr;
          }
        }
        return adjusted;
      },addRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++;
      },decRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        if (info.refcount === 0) {
          if (info.destructor) {
            Runtime.dynCall('vi', info.destructor, [ptr]);
          }
          delete EXCEPTIONS.infos[ptr];
          ___cxa_free_exception(ptr);
        }
      },clearRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0;
      }};
  function ___resumeException(ptr) {
      if (!EXCEPTIONS.last) { EXCEPTIONS.last = ptr; }
      EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr)); // exception refcount should be cleared, but don't free it
      throw ptr;
    }function ___cxa_find_matching_catch() {
      var thrown = EXCEPTIONS.last;
      if (!thrown) {
        // just pass through the null ptr
        return ((asm["setTempRet0"](0),0)|0);
      }
      var info = EXCEPTIONS.infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((asm["setTempRet0"](0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = Module['___cxa_is_pointer_type'](throwntype);
      // can_catch receives a **, add indirection
      if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
      HEAP32[((___cxa_find_matching_catch.buffer)>>2)]=thrown;
      thrown = ___cxa_find_matching_catch.buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted = thrown;
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      EXCEPTIONS.infos[ptr] = {
        ptr: ptr,
        adjusted: ptr,
        type: type,
        destructor: destructor,
        refcount: 0
      };
      EXCEPTIONS.last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr;
    }

   
  Module["_memset"] = _memset;

  
  function getShiftFromSize(size) {
      switch (size) {
          case 1: return 0;
          case 2: return 1;
          case 4: return 2;
          case 8: return 3;
          default:
              throw new TypeError('Unknown type size: ' + size);
      }
    }function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': function(pointer) {
              // TODO: if heap is fixed (like in asm.js) this could be executed outside
              var heap;
              if (size === 1) {
                  heap = HEAP8;
              } else if (size === 2) {
                  heap = HEAP16;
              } else if (size === 4) {
                  heap = HEAP32;
              } else {
                  throw new TypeError("Unknown boolean type size: " + name);
              }
              return this['fromWireType'](heap[pointer >> shift]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    }

  function _abort() {
      Module['abort']();
    }

  
  function _free() {
  }
  Module["_free"] = _free;
  
  function _malloc(bytes) {
      /* Over-allocate to make sure it is byte-aligned by 8.
       * This will leak memory, but this is only the dummy
       * implementation (replaced by dlmalloc normally) so
       * not an issue.
       */
      var ptr = Runtime.dynamicAlloc(bytes + 8);
      return (ptr+8) & 0xFFFFFFF8;
    }
  Module["_malloc"] = _malloc;
  
  function simpleReadValueFromPointer(pointer) {
      return this['fromWireType'](HEAPU32[pointer >> 2]);
    }function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              if (value instanceof ArrayBuffer) {
                  value = new Uint8Array(value);
              }
  
              function getTAElement(ta, index) {
                  return ta[index];
              }
              function getStringElement(string, index) {
                  return string.charCodeAt(index);
              }
              var getElement;
              if (value instanceof Uint8Array) {
                  getElement = getTAElement;
              } else if (value instanceof Int8Array) {
                  getElement = getTAElement;
              } else if (typeof value === 'string') {
                  getElement = getStringElement;
              } else {
                  throwBindingError('Cannot pass non-string to std::string');
              }
  
              // assumes 4-byte alignment
              var length = value.length;
              var ptr = _malloc(4 + length);
              HEAPU32[ptr >> 2] = length;
              for (var i = 0; i < length; ++i) {
                  var charCode = getElement(value, i);
                  if (charCode > 255) {
                      _free(ptr);
                      throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                  }
                  HEAPU8[ptr + 4 + i] = charCode;
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_std_wstring(rawType, charSize, name) {
      // nb. do not cache HEAPU16 and HEAPU32, they may be destroyed by enlargeMemory().
      name = readLatin1String(name);
      var getHeap, shift;
      if (charSize === 2) {
          getHeap = function() { return HEAPU16; };
          shift = 1;
      } else if (charSize === 4) {
          getHeap = function() { return HEAPU32; };
          shift = 2;
      }
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var HEAP = getHeap();
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              var start = (value + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAP[start + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              // assumes 4-byte alignment
              var HEAP = getHeap();
              var length = value.length;
              var ptr = _malloc(4 + length * charSize);
              HEAPU32[ptr >> 2] = length;
              var start = (ptr + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  HEAP[start + i] = value.charCodeAt(i);
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  
  
  
  function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
          return false;
      }
      if (!(other instanceof ClassHandle)) {
          return false;
      }
  
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
  
      while (leftClass.baseClass) {
          left = leftClass.upcast(left);
          leftClass = leftClass.baseClass;
      }
  
      while (rightClass.baseClass) {
          right = rightClass.upcast(right);
          rightClass = rightClass.baseClass;
      }
  
      return leftClass === rightClass && left === right;
    }
  
  
  function shallowCopyInternalPointer(o) {
      return {
          count: o.count,
          deleteScheduled: o.deleteScheduled,
          preservePointerOnDelete: o.preservePointerOnDelete,
          ptr: o.ptr,
          ptrType: o.ptrType,
          smartPtr: o.smartPtr,
          smartPtrType: o.smartPtrType,
      };
    }
  
  function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
    }function ClassHandle_clone() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.preservePointerOnDelete) {
          this.$$.count.value += 1;
          return this;
      } else {
          var clone = Object.create(Object.getPrototypeOf(this), {
              $$: {
                  value: shallowCopyInternalPointer(this.$$),
              }
          });
  
          clone.$$.count.value += 1;
          clone.$$.deleteScheduled = false;
          return clone;
      }
    }
  
  
  function runDestructor(handle) {
      var $$ = handle.$$;
      if ($$.smartPtr) {
          $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
          $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }function ClassHandle_delete() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
  
      this.$$.count.value -= 1;
      var toDelete = 0 === this.$$.count.value;
      if (toDelete) {
          runDestructor(this);
      }
      if (!this.$$.preservePointerOnDelete) {
          this.$$.smartPtr = undefined;
          this.$$.ptr = undefined;
      }
    }
  
  function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }
  
  
  var delayFunction=undefined;
  
  var deletionQueue=[];
  
  function flushPendingDeletes() {
      while (deletionQueue.length) {
          var obj = deletionQueue.pop();
          obj.$$.deleteScheduled = false;
          obj['delete']();
      }
    }function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }function init_ClassHandle() {
      ClassHandle.prototype['isAliasOf'] = ClassHandle_isAliasOf;
      ClassHandle.prototype['clone'] = ClassHandle_clone;
      ClassHandle.prototype['delete'] = ClassHandle_delete;
      ClassHandle.prototype['isDeleted'] = ClassHandle_isDeleted;
      ClassHandle.prototype['deleteLater'] = ClassHandle_deleteLater;
    }function ClassHandle() {
    }
  
  var registeredPointers={};
  
  
  function ensureOverloadTable(proto, methodName, humanName) {
      if (undefined === proto[methodName].overloadTable) {
          var prevFunc = proto[methodName];
          // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
          proto[methodName] = function() {
              // TODO This check can be removed in -O3 level "unsafe" optimizations.
              if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                  throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
              }
              return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
          };
          // Move the previous function into the overload table.
          proto[methodName].overloadTable = [];
          proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }function exposePublicSymbol(name, value, numArguments) {
      if (Module.hasOwnProperty(name)) {
          if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
              throwBindingError("Cannot register public name '" + name + "' twice");
          }
  
          // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
          // that routes between the two.
          ensureOverloadTable(Module, name, name);
          if (Module.hasOwnProperty(numArguments)) {
              throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
          }
          // Add the new function into the overload table.
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          if (undefined !== numArguments) {
              Module[name].numArguments = numArguments;
          }
      }
    }
  
  function RegisteredClass(
      name,
      constructor,
      instancePrototype,
      rawDestructor,
      baseClass,
      getActualType,
      upcast,
      downcast
    ) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
  
  
  
  function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
          if (!ptrClass.upcast) {
              throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
          }
          ptr = ptrClass.upcast(ptr);
          ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  function genericPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
  
          if (this.isSmartPointer) {
              var ptr = this.rawConstructor();
              if (destructors !== null) {
                  destructors.push(this.rawDestructor, ptr);
              }
              return ptr;
          } else {
              return 0;
          }
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
  
      if (this.isSmartPointer) {
          // TODO: this is not strictly true
          // We could support BY_EMVAL conversions from raw pointers to smart pointers
          // because the smart pointer can hold a reference to the handle
          if (undefined === handle.$$.smartPtr) {
              throwBindingError('Passing raw pointer to smart pointer is illegal');
          }
  
          switch (this.sharingPolicy) {
              case 0: // NONE
                  // no upcasting
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
                  }
                  break;
  
              case 1: // INTRUSIVE
                  ptr = handle.$$.smartPtr;
                  break;
  
              case 2: // BY_EMVAL
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      var clonedHandle = handle['clone']();
                      ptr = this.rawShare(
                          ptr,
                          __emval_register(function() {
                              clonedHandle['delete']();
                          })
                      );
                      if (destructors !== null) {
                          destructors.push(this.rawDestructor, ptr);
                      }
                  }
                  break;
  
              default:
                  throwBindingError('Unsupporting sharing policy');
          }
      }
      return ptr;
    }
  
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + handle.$$.ptrType.name + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  
  function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
          ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }
  
  function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
          this.rawDestructor(ptr);
      }
    }
  
  function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
          handle['delete']();
      }
    }
  
  
  function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
          return ptr;
      }
      if (undefined === desiredClass.baseClass) {
          return null; // no conversion
      }
  
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
          return null;
      }
      return desiredClass.downcast(rv);
    }
  
  
  
  
  function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }
  
  function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
          if (registeredInstances.hasOwnProperty(k)) {
              rv.push(registeredInstances[k]);
          }
      }
      return rv;
    }
  
  function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
    }function init_embind() {
      Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
      Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
      Module['flushPendingDeletes'] = flushPendingDeletes;
      Module['setDelayFunction'] = setDelayFunction;
    }var registeredInstances={};
  
  function getBasestPointer(class_, ptr) {
      if (ptr === undefined) {
          throwBindingError('ptr should not be undefined');
      }
      while (class_.baseClass) {
          ptr = class_.upcast(ptr);
          class_ = class_.baseClass;
      }
      return ptr;
    }function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }
  
  
  var _throwInternalError=undefined;function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
          throwInternalError('makeClassHandle requires ptr and ptrType');
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
          throwInternalError('Both smartPtrType and smartPtr must be specified');
      }
      record.count = { value: 1 };
      return Object.create(prototype, {
          $$: {
              value: record,
          },
      });
    }function RegisteredPointer_fromWireType(ptr) {
      // ptr is a raw pointer (or a raw smartpointer)
  
      // rawPointer is a maybe-null raw pointer
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
          this.destructor(ptr);
          return null;
      }
  
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (undefined !== registeredInstance) {
          // JS object has been neutered, time to repopulate it
          if (0 === registeredInstance.$$.count.value) {
              registeredInstance.$$.ptr = rawPointer;
              registeredInstance.$$.smartPtr = ptr;
              return registeredInstance['clone']();
          } else {
              // else, just increment reference count on existing object
              // it already has a reference to the smart pointer
              var rv = registeredInstance['clone']();
              this.destructor(ptr);
              return rv;
          }
      }
  
      function makeDefaultHandle() {
          if (this.isSmartPointer) {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this.pointeeType,
                  ptr: rawPointer,
                  smartPtrType: this,
                  smartPtr: ptr,
              });
          } else {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this,
                  ptr: ptr,
              });
          }
      }
  
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
          return makeDefaultHandle.call(this);
      }
  
      var toType;
      if (this.isConst) {
          toType = registeredPointerRecord.constPointerType;
      } else {
          toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(
          rawPointer,
          this.registeredClass,
          toType.registeredClass);
      if (dp === null) {
          return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
              smartPtrType: this,
              smartPtr: ptr,
          });
      } else {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
          });
      }
    }function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype['argPackAdvance'] = 8;
      RegisteredPointer.prototype['readValueFromPointer'] = simpleReadValueFromPointer;
      RegisteredPointer.prototype['deleteObject'] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype['fromWireType'] = RegisteredPointer_fromWireType;
    }function RegisteredPointer(
      name,
      registeredClass,
      isReference,
      isConst,
  
      // smart pointer properties
      isSmartPointer,
      pointeeType,
      sharingPolicy,
      rawGetPointee,
      rawConstructor,
      rawShare,
      rawDestructor
    ) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
  
      // smart pointer properties
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
  
      if (!isSmartPointer && registeredClass.baseClass === undefined) {
          if (isConst) {
              this['toWireType'] = constNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          } else {
              this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          }
      } else {
          this['toWireType'] = genericPointerToWireType;
          // Here we must leave this.destructorFunction undefined, since whether genericPointerToWireType returns
          // a pointer that needs to be freed up is runtime-dependent, and cannot be evaluated at registration time.
          // TODO: Create an alternative mechanism that allows removing the use of var destructors = []; array in
          //       craftInvokerFunction altogether.
      }
    }
  
  function replacePublicSymbol(name, value, numArguments) {
      if (!Module.hasOwnProperty(name)) {
          throwInternalError('Replacing nonexistant public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
      }
    }
  
  function requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
  
      function makeDynCaller(dynCall) {
          var args = [];
          for (var i = 1; i < signature.length; ++i) {
              args.push('a' + i);
          }
  
          var name = 'dynCall_' + signature + '_' + rawFunction;
          var body = 'return function ' + name + '(' + args.join(', ') + ') {\n';
          body    += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\n';
          body    += '};\n';
  
          return (new Function('dynCall', 'rawFunction', body))(dynCall, rawFunction);
      }
  
      var fp;
      if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
          fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
      } else if (typeof FUNCTION_TABLE !== "undefined") {
          fp = FUNCTION_TABLE[rawFunction];
      } else {
          // asm.js does not give direct access to the function tables,
          // and thus we must go through the dynCall interface which allows
          // calling into a signature's function table by pointer value.
          //
          // https://github.com/dherman/asm.js/issues/83
          //
          // This has three main penalties:
          // - dynCall is another function call in the path from JavaScript to C++.
          // - JITs may not predict through the function table indirection at runtime.
          var dc = asm['dynCall_' + signature];
          if (dc === undefined) {
              // We will always enter this branch if the signature
              // contains 'f' and PRECISE_F32 is not enabled.
              //
              // Try again, replacing 'f' with 'd'.
              dc = asm['dynCall_' + signature.replace(/f/g, 'd')];
              if (dc === undefined) {
                  throwBindingError("No dynCall invoker for signature: " + signature);
              }
          }
          fp = makeDynCaller(dc);
      }
  
      if (typeof fp !== "function") {
          throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
  
  
  var UnboundTypeError=undefined;function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
          if (seen[type]) {
              return;
          }
          if (registeredTypes[type]) {
              return;
          }
          if (typeDependencies[type]) {
              typeDependencies[type].forEach(visit);
              return;
          }
          unboundTypes.push(type);
          seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
    }function __embind_register_class(
      rawType,
      rawPointerType,
      rawConstPointerType,
      baseClassRawType,
      getActualTypeSignature,
      getActualType,
      upcastSignature,
      upcast,
      downcastSignature,
      downcast,
      name,
      destructorSignature,
      rawDestructor
    ) {
      name = readLatin1String(name);
      getActualType = requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
          upcast = requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
          downcast = requireFunction(downcastSignature, downcast);
      }
      rawDestructor = requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
  
      exposePublicSymbol(legalFunctionName, function() {
          // this code cannot run if baseClassRawType is zero
          throwUnboundTypeError('Cannot construct ' + name + ' due to unbound types', [baseClassRawType]);
      });
  
      whenDependentTypesAreResolved(
          [rawType, rawPointerType, rawConstPointerType],
          baseClassRawType ? [baseClassRawType] : [],
          function(base) {
              base = base[0];
  
              var baseClass;
              var basePrototype;
              if (baseClassRawType) {
                  baseClass = base.registeredClass;
                  basePrototype = baseClass.instancePrototype;
              } else {
                  basePrototype = ClassHandle.prototype;
              }
  
              var constructor = createNamedFunction(legalFunctionName, function() {
                  if (Object.getPrototypeOf(this) !== instancePrototype) {
                      throw new BindingError("Use 'new' to construct " + name);
                  }
                  if (undefined === registeredClass.constructor_body) {
                      throw new BindingError(name + " has no accessible constructor");
                  }
                  var body = registeredClass.constructor_body[arguments.length];
                  if (undefined === body) {
                      throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
                  }
                  return body.apply(this, arguments);
              });
  
              var instancePrototype = Object.create(basePrototype, {
                  constructor: { value: constructor },
              });
  
              constructor.prototype = instancePrototype;
  
              var registeredClass = new RegisteredClass(
                  name,
                  constructor,
                  instancePrototype,
                  rawDestructor,
                  baseClass,
                  getActualType,
                  upcast,
                  downcast);
  
              var referenceConverter = new RegisteredPointer(
                  name,
                  registeredClass,
                  true,
                  false,
                  false);
  
              var pointerConverter = new RegisteredPointer(
                  name + '*',
                  registeredClass,
                  false,
                  false,
                  false);
  
              var constPointerConverter = new RegisteredPointer(
                  name + ' const*',
                  registeredClass,
                  false,
                  true,
                  false);
  
              registeredPointers[rawType] = {
                  pointerType: pointerConverter,
                  constPointerType: constPointerConverter
              };
  
              replacePublicSymbol(legalFunctionName, constructor);
  
              return [referenceConverter, pointerConverter, constPointerConverter];
          }
      );
    }

   
  Module["_strlen"] = _strlen;

  var _sqrtf=Math_sqrt;

   
  Module["_i64Add"] = _i64Add;

  var _fabs=Math_abs;

  var _sqrt=Math_sqrt;

  
  function _embind_repr(v) {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    }
  
  function integerReadValueFromPointer(name, shift, signed) {
      // integers are quite common, so generate very specialized functions
      switch (shift) {
          case 0: return signed ?
              function readS8FromPointer(pointer) { return HEAP8[pointer]; } :
              function readU8FromPointer(pointer) { return HEAPU8[pointer]; };
          case 1: return signed ?
              function readS16FromPointer(pointer) { return HEAP16[pointer >> 1]; } :
              function readU16FromPointer(pointer) { return HEAPU16[pointer >> 1]; };
          case 2: return signed ?
              function readS32FromPointer(pointer) { return HEAP32[pointer >> 2]; } :
              function readU32FromPointer(pointer) { return HEAPU32[pointer >> 2]; };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) { // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come out as 'i32 -1'. Always treat those as max u32.
          maxRange = 4294967295;
      }
  
      var shift = getShiftFromSize(size);
      
      var fromWireType = function(value) {
          return value;
      };
      
      if (minRange === 0) {
          var bitshift = 32 - 8*size;
          fromWireType = function(value) {
              return (value << bitshift) >>> bitshift;
          };
      }
  
      registerType(primitiveType, {
          name: name,
          'fromWireType': fromWireType,
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following two if()s and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              if (value < minRange || value > maxRange) {
                  throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
              }
              return value | 0;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  
  var emval_free_list=[];
  
  var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
          emval_handle_array[handle] = undefined;
          emval_free_list.push(handle);
      }
    }
  
  
  
  function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              ++count;
          }
      }
      return count;
    }
  
  function get_first_emval() {
      for (var i = 1; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              return emval_handle_array[i];
          }
      }
      return null;
    }function init_emval() {
      Module['count_emval_handles'] = count_emval_handles;
      Module['get_first_emval'] = get_first_emval;
    }function __emval_register(value) {
  
      switch(value){
        case undefined :{ return 1; }
        case null :{ return 2; }
        case true :{ return 3; }
        case false :{ return 4; }
        default:{
          var handle = emval_free_list.length ?
              emval_free_list.pop() :
              emval_handle_array.length;
  
          emval_handle_array[handle] = {refcount: 1, value: value};
          return handle;
          }
        }
    }function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(handle) {
              var rv = emval_handle_array[handle].value;
              __emval_decref(handle);
              return rv;
          },
          'toWireType': function(destructors, value) {
              return __emval_register(value);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: null, // This type does not need a destructor
  
          // TODO: do we need a deleteObject here?  write a test where
          // emval is passed into JS via an interface
      });
    }

  
  var PATH=undefined;
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  var _sin=Math_sin;

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  var _atan=Math_atan;

  
  function floatReadValueFromPointer(name, shift) {
      switch (shift) {
          case 2: return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
          };
          case 3: return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
          };
          default:
              throw new TypeError("Unknown float type: " + name);
      }
    }function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              return value;
          },
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following if() and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              return value;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': floatReadValueFromPointer(name, shift),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  
  function new_(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
          throw new TypeError('new_ called with constructor type ' + typeof(constructor) + " which is not a function");
      }
  
      /*
       * Previously, the following line was just:
  
       function dummy() {};
  
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even though at creation, the 'dummy' has the
       * correct constructor name.  Thus, objects created with IMVU.new would show up in the debugger as 'dummy', which
       * isn't very helpful.  Using IMVU.createNamedFunction addresses the issue.  Doublely-unfortunately, there's no way
       * to write a test for this behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;
  
      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }
  
  function runDestructors(destructors) {
      while (destructors.length) {
          var ptr = destructors.pop();
          var del = destructors.pop();
          del(ptr);
      }
    }function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
          throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }
  
      var argsList = "";
      var argsListWired = "";
      for(var i = 0; i < argCount - 2; ++i) {
          argsList += (i!==0?", ":"")+"arg"+i;
          argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }
  
      var invokerFnBody =
          "return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n" +
          "if (arguments.length !== "+(argCount - 2)+") {\n" +
              "throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount - 2)+" args!');\n" +
          "}\n";
  
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = false;
  
      for(var i = 1; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here.
          if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) { // The type does not define a destructor function - must use dynamic stack
              needsDestructorStack = true;
              break;
          }
      }
  
      if (needsDestructorStack) {
          invokerFnBody +=
              "var destructors = [];\n";
      }
  
      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
      var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
  
  
      if (isClassMethodFunc) {
          invokerFnBody += "var thisWired = classParam.toWireType("+dtorStack+", this);\n";
      }
  
      for(var i = 0; i < argCount - 2; ++i) {
          invokerFnBody += "var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";
          args1.push("argType"+i);
          args2.push(argTypes[i+2]);
      }
  
      if (isClassMethodFunc) {
          argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }
  
      var returns = (argTypes[0].name !== "void");
  
      invokerFnBody +=
          (returns?"var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";
  
      if (needsDestructorStack) {
          invokerFnBody += "runDestructors(destructors);\n";
      } else {
          for(var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
              var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
              if (argTypes[i].destructorFunction !== null) {
                  invokerFnBody += paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";
                  args1.push(paramName+"_dtor");
                  args2.push(argTypes[i].destructorFunction);
              }
          }
      }
  
      if (returns) {
          invokerFnBody += "var ret = retType.fromWireType(rv);\n" +
                           "return ret;\n";
      } else {
      }
      invokerFnBody += "}\n";
  
      args1.push(invokerFnBody);
  
      var invokerFunction = new_(Function, args1).apply(null, args2);
      return invokerFunction;
    }
  
  function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
          array.push(HEAP32[(firstElement >> 2) + i]);
      }
      return array;
    }function __embind_register_class_class_function(
      rawClassType,
      methodName,
      argCount,
      rawArgTypesAddr,
      invokerSignature,
      rawInvoker,
      fn
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = requireFunction(invokerSignature, rawInvoker);
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = classType.name + '.' + methodName;
  
          function unboundTypesHandler() {
              throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
          }
  
          var proto = classType.registeredClass.constructor;
          if (undefined === proto[methodName]) {
              // This is the first function to be registered with this name.
              unboundTypesHandler.argCount = argCount-1;
              proto[methodName] = unboundTypesHandler;
          } else {
              // There was an existing function with the same name registered. Set up a function overload routing table.
              ensureOverloadTable(proto, methodName, humanName);
              proto[methodName].overloadTable[argCount-1] = unboundTypesHandler;
          }
  
          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
              // Replace the initial unbound-types-handler stub with the proper function. If multiple overloads are registered,
              // the function handlers go into an overload table.
              var invokerArgsArray = [argTypes[0] /* return value */, null /* no class 'this'*/].concat(argTypes.slice(1) /* actual params */);
              var func = craftInvokerFunction(humanName, invokerArgsArray, null /* no class 'this'*/, rawInvoker, fn);
              if (undefined === proto[methodName].overloadTable) {
                  proto[methodName] = func;
              } else {
                  proto[methodName].overloadTable[argCount-1] = func;
              }
              return [];
          });
          return [];
      });
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  var _cos=Math_cos;

  var _llvm_pow_f64=Math_pow;

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  function ___errno_location() {
      return ___errno_state;
    }

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [
          Int8Array,
          Uint8Array,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
          handle = handle >> 2;
          var heap = HEAPU32;
          var size = heap[handle]; // in elements
          var data = heap[handle + 1]; // byte offset into emscripten heap
          return new TA(heap['buffer'], data, size);
      }
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': decodeMemoryView,
          'argPackAdvance': 8,
          'readValueFromPointer': decodeMemoryView,
      }, {
          ignoreDuplicateRegistrations: true,
      });
    }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function __embind_register_class_function(
      rawClassType,
      methodName,
      argCount,
      rawArgTypesAddr, // [ReturnType, ThisType, Args...]
      invokerSignature,
      rawInvoker,
      context,
      isPureVirtual
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = requireFunction(invokerSignature, rawInvoker);
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = classType.name + '.' + methodName;
  
          if (isPureVirtual) {
              classType.registeredClass.pureVirtualFunctions.push(methodName);
          }
  
          function unboundTypesHandler() {
              throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
          }
  
          var proto = classType.registeredClass.instancePrototype;
          var method = proto[methodName];
          if (undefined === method || (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)) {
              // This is the first overload to be registered, OR we are replacing a function in the base class with a function in the derived class.
              unboundTypesHandler.argCount = argCount - 2;
              unboundTypesHandler.className = classType.name;
              proto[methodName] = unboundTypesHandler;
          } else {
              // There was an existing function with the same name registered. Set up a function overload routing table.
              ensureOverloadTable(proto, methodName, humanName);
              proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
          }
  
          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
  
              var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
  
              // Replace the initial unbound-handler-stub function with the appropriate member function, now that all types
              // are resolved. If multiple overloads are registered for this function, the function goes into an overload table.
              if (undefined === proto[methodName].overloadTable) {
                  proto[methodName] = memberFunction;
              } else {
                  proto[methodName].overloadTable[argCount - 2] = memberFunction;
              }
  
              return [];
          });
          return [];
      });
    }
embind_init_charCodes()
BindingError = Module['BindingError'] = extendError(Error, 'BindingError');
InternalError = Module['InternalError'] = extendError(Error, 'InternalError');
init_ClassHandle()
init_RegisteredPointer()
init_embind();
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');
init_emval();
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function nullFunc_viiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiddi(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiddi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vd(x) { Module["printErr"]("Invalid function pointer called with signature 'vd'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vid(x) { Module["printErr"]("Invalid function pointer called with signature 'vid'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vi(x) { Module["printErr"]("Invalid function pointer called with signature 'vi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiidd(x) { Module["printErr"]("Invalid function pointer called with signature 'iiidd'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_vii(x) { Module["printErr"]("Invalid function pointer called with signature 'vii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiddd(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiddd'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_ii(x) { Module["printErr"]("Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iidd(x) { Module["printErr"]("Invalid function pointer called with signature 'iidd'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiid(x) { Module["printErr"]("Invalid function pointer called with signature 'iiid'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iid(x) { Module["printErr"]("Invalid function pointer called with signature 'iid'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiddd(x) { Module["printErr"]("Invalid function pointer called with signature 'iiddd'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiddi(x) { Module["printErr"]("Invalid function pointer called with signature 'iiddi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iii(x) { Module["printErr"]("Invalid function pointer called with signature 'iii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiiddiddi(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiiddiddi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiii(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_iiiddiddi(x) { Module["printErr"]("Invalid function pointer called with signature 'iiiddiddi'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viii(x) { Module["printErr"]("Invalid function pointer called with signature 'viii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_v(x) { Module["printErr"]("Invalid function pointer called with signature 'v'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function nullFunc_viiii(x) { Module["printErr"]("Invalid function pointer called with signature 'viiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)");  Module["printErr"]("Build with ASSERTIONS=2 for more info.");abort(x) }

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiddi(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiddi"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vd(index,a1) {
  try {
    Module["dynCall_vd"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vid(index,a1,a2) {
  try {
    Module["dynCall_vid"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiidd(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiidd"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  try {
    Module["dynCall_vii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiddd(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiddd"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iidd(index,a1,a2,a3) {
  try {
    return Module["dynCall_iidd"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiii(index,a1,a2,a3,a4,a5) {
  try {
    return Module["dynCall_iiiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiid(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiid"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iid(index,a1,a2) {
  try {
    return Module["dynCall_iid"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiddd(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiddd"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiddi(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiddi"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiddiddi(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  try {
    return Module["dynCall_iiiiddiddi"](index,a1,a2,a3,a4,a5,a6,a7,a8,a9);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiddiddi(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  try {
    return Module["dynCall_iiiddiddi"](index,a1,a2,a3,a4,a5,a6,a7,a8);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity, "byteLength": byteLength };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "nullFunc_viiiii": nullFunc_viiiii, "nullFunc_iiiddi": nullFunc_iiiddi, "nullFunc_vd": nullFunc_vd, "nullFunc_vid": nullFunc_vid, "nullFunc_vi": nullFunc_vi, "nullFunc_iiidd": nullFunc_iiidd, "nullFunc_vii": nullFunc_vii, "nullFunc_iiiddd": nullFunc_iiiddd, "nullFunc_ii": nullFunc_ii, "nullFunc_iidd": nullFunc_iidd, "nullFunc_iiiiii": nullFunc_iiiiii, "nullFunc_iiii": nullFunc_iiii, "nullFunc_viiiiii": nullFunc_viiiiii, "nullFunc_iiid": nullFunc_iiid, "nullFunc_iid": nullFunc_iid, "nullFunc_iiddd": nullFunc_iiddd, "nullFunc_iiddi": nullFunc_iiddi, "nullFunc_iii": nullFunc_iii, "nullFunc_iiiiddiddi": nullFunc_iiiiddiddi, "nullFunc_iiiii": nullFunc_iiiii, "nullFunc_iiiddiddi": nullFunc_iiiddiddi, "nullFunc_viii": nullFunc_viii, "nullFunc_v": nullFunc_v, "nullFunc_viiii": nullFunc_viiii, "invoke_viiiii": invoke_viiiii, "invoke_iiiddi": invoke_iiiddi, "invoke_vd": invoke_vd, "invoke_vid": invoke_vid, "invoke_vi": invoke_vi, "invoke_iiidd": invoke_iiidd, "invoke_vii": invoke_vii, "invoke_iiiddd": invoke_iiiddd, "invoke_ii": invoke_ii, "invoke_iidd": invoke_iidd, "invoke_iiiiii": invoke_iiiiii, "invoke_iiii": invoke_iiii, "invoke_viiiiii": invoke_viiiiii, "invoke_iiid": invoke_iiid, "invoke_iid": invoke_iid, "invoke_iiddd": invoke_iiddd, "invoke_iiddi": invoke_iiddi, "invoke_iii": invoke_iii, "invoke_iiiiddiddi": invoke_iiiiddiddi, "invoke_iiiii": invoke_iiiii, "invoke_iiiddiddi": invoke_iiiddiddi, "invoke_viii": invoke_viii, "invoke_v": invoke_v, "invoke_viiii": invoke_viiii, "_fabs": _fabs, "floatReadValueFromPointer": floatReadValueFromPointer, "simpleReadValueFromPointer": simpleReadValueFromPointer, "throwInternalError": throwInternalError, "get_first_emval": get_first_emval, "getLiveInheritedInstances": getLiveInheritedInstances, "___assert_fail": ___assert_fail, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "ClassHandle": ClassHandle, "getShiftFromSize": getShiftFromSize, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_sbrk": _sbrk, "_emscripten_memcpy_big": _emscripten_memcpy_big, "runDestructor": runDestructor, "_sysconf": _sysconf, "throwInstanceAlreadyDeleted": throwInstanceAlreadyDeleted, "__embind_register_std_string": __embind_register_std_string, "init_RegisteredPointer": init_RegisteredPointer, "_cos": _cos, "ClassHandle_isAliasOf": ClassHandle_isAliasOf, "flushPendingDeletes": flushPendingDeletes, "makeClassHandle": makeClassHandle, "whenDependentTypesAreResolved": whenDependentTypesAreResolved, "init_ClassHandle": init_ClassHandle, "ClassHandle_clone": ClassHandle_clone, "RegisteredClass": RegisteredClass, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "readLatin1String": readLatin1String, "embind_init_charCodes": embind_init_charCodes, "___setErrNo": ___setErrNo, "_atan": _atan, "__embind_register_bool": __embind_register_bool, "___resumeException": ___resumeException, "createNamedFunction": createNamedFunction, "__embind_register_emval": __embind_register_emval, "__emval_decref": __emval_decref, "init_embind": init_embind, "constNoSmartPtrRawPointerToWireType": constNoSmartPtrRawPointerToWireType, "heap32VectorToArray": heap32VectorToArray, "ClassHandle_delete": ClassHandle_delete, "RegisteredPointer_destructor": RegisteredPointer_destructor, "ensureOverloadTable": ensureOverloadTable, "_time": _time, "new_": new_, "downcastPointer": downcastPointer, "replacePublicSymbol": replacePublicSymbol, "__embind_register_class": __embind_register_class, "_llvm_pow_f64": _llvm_pow_f64, "ClassHandle_deleteLater": ClassHandle_deleteLater, "RegisteredPointer_deleteObject": RegisteredPointer_deleteObject, "ClassHandle_isDeleted": ClassHandle_isDeleted, "__embind_register_integer": __embind_register_integer, "___cxa_allocate_exception": ___cxa_allocate_exception, "_embind_repr": _embind_repr, "throwUnboundTypeError": throwUnboundTypeError, "craftInvokerFunction": craftInvokerFunction, "runDestructors": runDestructors, "makeLegalFunctionName": makeLegalFunctionName, "_sqrtf": _sqrtf, "upcastPointer": upcastPointer, "init_emval": init_emval, "shallowCopyInternalPointer": shallowCopyInternalPointer, "nonConstNoSmartPtrRawPointerToWireType": nonConstNoSmartPtrRawPointerToWireType, "_abort": _abort, "throwBindingError": throwBindingError, "exposePublicSymbol": exposePublicSymbol, "RegisteredPointer_fromWireType": RegisteredPointer_fromWireType, "_sin": _sin, "__embind_register_memory_view": __embind_register_memory_view, "getInheritedInstance": getInheritedInstance, "setDelayFunction": setDelayFunction, "extendError": extendError, "__embind_register_void": __embind_register_void, "RegisteredPointer_getPointee": RegisteredPointer_getPointee, "__emval_register": __emval_register, "__embind_register_std_wstring": __embind_register_std_wstring, "__embind_register_class_function": __embind_register_class_function, "RegisteredPointer": RegisteredPointer, "__embind_register_class_class_function": __embind_register_class_class_function, "getBasestPointer": getBasestPointer, "getInheritedInstanceCount": getInheritedInstanceCount, "__embind_register_float": __embind_register_float, "integerReadValueFromPointer": integerReadValueFromPointer, "_emscripten_set_main_loop": _emscripten_set_main_loop, "___errno_location": ___errno_location, "genericPointerToWireType": genericPointerToWireType, "registerType": registerType, "___cxa_throw": ___cxa_throw, "count_emval_handles": count_emval_handles, "requireFunction": requireFunction, "_sqrt": _sqrt, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var Int8View = global.Int8Array;
  var Int16View = global.Int16Array;
  var Int32View = global.Int32Array;
  var Uint8View = global.Uint8Array;
  var Uint16View = global.Uint16Array;
  var Uint32View = global.Uint32Array;
  var Float32View = global.Float32Array;
  var Float64View = global.Float64Array;
  var HEAP8 = new Int8View(buffer);
  var HEAP16 = new Int16View(buffer);
  var HEAP32 = new Int32View(buffer);
  var HEAPU8 = new Uint8View(buffer);
  var HEAPU16 = new Uint16View(buffer);
  var HEAPU32 = new Uint32View(buffer);
  var HEAPF32 = new Float32View(buffer);
  var HEAPF64 = new Float64View(buffer);
  var byteLength = global.byteLength;


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var nullFunc_viiiii=env.nullFunc_viiiii;
  var nullFunc_iiiddi=env.nullFunc_iiiddi;
  var nullFunc_vd=env.nullFunc_vd;
  var nullFunc_vid=env.nullFunc_vid;
  var nullFunc_vi=env.nullFunc_vi;
  var nullFunc_iiidd=env.nullFunc_iiidd;
  var nullFunc_vii=env.nullFunc_vii;
  var nullFunc_iiiddd=env.nullFunc_iiiddd;
  var nullFunc_ii=env.nullFunc_ii;
  var nullFunc_iidd=env.nullFunc_iidd;
  var nullFunc_iiiiii=env.nullFunc_iiiiii;
  var nullFunc_iiii=env.nullFunc_iiii;
  var nullFunc_viiiiii=env.nullFunc_viiiiii;
  var nullFunc_iiid=env.nullFunc_iiid;
  var nullFunc_iid=env.nullFunc_iid;
  var nullFunc_iiddd=env.nullFunc_iiddd;
  var nullFunc_iiddi=env.nullFunc_iiddi;
  var nullFunc_iii=env.nullFunc_iii;
  var nullFunc_iiiiddiddi=env.nullFunc_iiiiddiddi;
  var nullFunc_iiiii=env.nullFunc_iiiii;
  var nullFunc_iiiddiddi=env.nullFunc_iiiddiddi;
  var nullFunc_viii=env.nullFunc_viii;
  var nullFunc_v=env.nullFunc_v;
  var nullFunc_viiii=env.nullFunc_viiii;
  var invoke_viiiii=env.invoke_viiiii;
  var invoke_iiiddi=env.invoke_iiiddi;
  var invoke_vd=env.invoke_vd;
  var invoke_vid=env.invoke_vid;
  var invoke_vi=env.invoke_vi;
  var invoke_iiidd=env.invoke_iiidd;
  var invoke_vii=env.invoke_vii;
  var invoke_iiiddd=env.invoke_iiiddd;
  var invoke_ii=env.invoke_ii;
  var invoke_iidd=env.invoke_iidd;
  var invoke_iiiiii=env.invoke_iiiiii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_viiiiii=env.invoke_viiiiii;
  var invoke_iiid=env.invoke_iiid;
  var invoke_iid=env.invoke_iid;
  var invoke_iiddd=env.invoke_iiddd;
  var invoke_iiddi=env.invoke_iiddi;
  var invoke_iii=env.invoke_iii;
  var invoke_iiiiddiddi=env.invoke_iiiiddiddi;
  var invoke_iiiii=env.invoke_iiiii;
  var invoke_iiiddiddi=env.invoke_iiiddiddi;
  var invoke_viii=env.invoke_viii;
  var invoke_v=env.invoke_v;
  var invoke_viiii=env.invoke_viiii;
  var _fabs=env._fabs;
  var floatReadValueFromPointer=env.floatReadValueFromPointer;
  var simpleReadValueFromPointer=env.simpleReadValueFromPointer;
  var throwInternalError=env.throwInternalError;
  var get_first_emval=env.get_first_emval;
  var getLiveInheritedInstances=env.getLiveInheritedInstances;
  var ___assert_fail=env.___assert_fail;
  var __ZSt18uncaught_exceptionv=env.__ZSt18uncaught_exceptionv;
  var ClassHandle=env.ClassHandle;
  var getShiftFromSize=env.getShiftFromSize;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _sbrk=env._sbrk;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var runDestructor=env.runDestructor;
  var _sysconf=env._sysconf;
  var throwInstanceAlreadyDeleted=env.throwInstanceAlreadyDeleted;
  var __embind_register_std_string=env.__embind_register_std_string;
  var init_RegisteredPointer=env.init_RegisteredPointer;
  var _cos=env._cos;
  var ClassHandle_isAliasOf=env.ClassHandle_isAliasOf;
  var flushPendingDeletes=env.flushPendingDeletes;
  var makeClassHandle=env.makeClassHandle;
  var whenDependentTypesAreResolved=env.whenDependentTypesAreResolved;
  var init_ClassHandle=env.init_ClassHandle;
  var ClassHandle_clone=env.ClassHandle_clone;
  var RegisteredClass=env.RegisteredClass;
  var ___cxa_find_matching_catch=env.___cxa_find_matching_catch;
  var readLatin1String=env.readLatin1String;
  var embind_init_charCodes=env.embind_init_charCodes;
  var ___setErrNo=env.___setErrNo;
  var _atan=env._atan;
  var __embind_register_bool=env.__embind_register_bool;
  var ___resumeException=env.___resumeException;
  var createNamedFunction=env.createNamedFunction;
  var __embind_register_emval=env.__embind_register_emval;
  var __emval_decref=env.__emval_decref;
  var init_embind=env.init_embind;
  var constNoSmartPtrRawPointerToWireType=env.constNoSmartPtrRawPointerToWireType;
  var heap32VectorToArray=env.heap32VectorToArray;
  var ClassHandle_delete=env.ClassHandle_delete;
  var RegisteredPointer_destructor=env.RegisteredPointer_destructor;
  var ensureOverloadTable=env.ensureOverloadTable;
  var _time=env._time;
  var new_=env.new_;
  var downcastPointer=env.downcastPointer;
  var replacePublicSymbol=env.replacePublicSymbol;
  var __embind_register_class=env.__embind_register_class;
  var _llvm_pow_f64=env._llvm_pow_f64;
  var ClassHandle_deleteLater=env.ClassHandle_deleteLater;
  var RegisteredPointer_deleteObject=env.RegisteredPointer_deleteObject;
  var ClassHandle_isDeleted=env.ClassHandle_isDeleted;
  var __embind_register_integer=env.__embind_register_integer;
  var ___cxa_allocate_exception=env.___cxa_allocate_exception;
  var _embind_repr=env._embind_repr;
  var throwUnboundTypeError=env.throwUnboundTypeError;
  var craftInvokerFunction=env.craftInvokerFunction;
  var runDestructors=env.runDestructors;
  var makeLegalFunctionName=env.makeLegalFunctionName;
  var _sqrtf=env._sqrtf;
  var upcastPointer=env.upcastPointer;
  var init_emval=env.init_emval;
  var shallowCopyInternalPointer=env.shallowCopyInternalPointer;
  var nonConstNoSmartPtrRawPointerToWireType=env.nonConstNoSmartPtrRawPointerToWireType;
  var _abort=env._abort;
  var throwBindingError=env.throwBindingError;
  var exposePublicSymbol=env.exposePublicSymbol;
  var RegisteredPointer_fromWireType=env.RegisteredPointer_fromWireType;
  var _sin=env._sin;
  var __embind_register_memory_view=env.__embind_register_memory_view;
  var getInheritedInstance=env.getInheritedInstance;
  var setDelayFunction=env.setDelayFunction;
  var extendError=env.extendError;
  var __embind_register_void=env.__embind_register_void;
  var RegisteredPointer_getPointee=env.RegisteredPointer_getPointee;
  var __emval_register=env.__emval_register;
  var __embind_register_std_wstring=env.__embind_register_std_wstring;
  var __embind_register_class_function=env.__embind_register_class_function;
  var RegisteredPointer=env.RegisteredPointer;
  var __embind_register_class_class_function=env.__embind_register_class_class_function;
  var getBasestPointer=env.getBasestPointer;
  var getInheritedInstanceCount=env.getInheritedInstanceCount;
  var __embind_register_float=env.__embind_register_float;
  var integerReadValueFromPointer=env.integerReadValueFromPointer;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var ___errno_location=env.___errno_location;
  var genericPointerToWireType=env.genericPointerToWireType;
  var registerType=env.registerType;
  var ___cxa_throw=env.___cxa_throw;
  var count_emval_handles=env.count_emval_handles;
  var requireFunction=env.requireFunction;
  var _sqrt=env._sqrt;
  var tempFloat = 0.0;

function _emscripten_replace_memory(newBuffer) {
  if ((byteLength(newBuffer) & 0xffffff || byteLength(newBuffer) <= 0xffffff) || byteLength(newBuffer) > 0x80000000) return false;
  HEAP8 = new Int8View(newBuffer);
  HEAP16 = new Int16View(newBuffer);
  HEAP32 = new Int32View(newBuffer);
  HEAPU8 = new Uint8View(newBuffer);
  HEAPU16 = new Uint16View(newBuffer);
  HEAPU32 = new Uint32View(newBuffer);
  HEAPF32 = new Float32View(newBuffer);
  HEAPF64 = new Float64View(newBuffer);
  buffer = newBuffer;
  return true;
}

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _heman_color_set_gamma($g) {
 $g = +$g;
 var label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[8>>2] = $g;
 return;
}
function _heman_color_create_gradient($width,$num_colors,$cp_locations,$cp_values) {
 $width = $width|0;
 $num_colors = $num_colors|0;
 $cp_locations = $cp_locations|0;
 $cp_values = $cp_values|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0.0, $102 = 0.0, $103 = 0.0, $104 = 0, $105 = 0, $106 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0;
 var $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0.0;
 var $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0, $43 = 0, $44 = 0.0, $45 = 0.0, $46 = 0, $47 = 0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0.0, $56 = 0;
 var $57 = 0.0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0.0, $68 = 0, $69 = 0, $7 = 0, $70 = 0.0, $71 = 0, $72 = 0, $73 = 0.0, $74 = 0;
 var $75 = 0, $76 = 0.0, $77 = 0, $78 = 0, $79 = 0.0, $8 = 0, $80 = 0, $81 = 0, $82 = 0.0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0.0;
 var $93 = 0.0, $94 = 0.0, $95 = 0.0, $96 = 0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $dst$03 = 0, $dst$1 = 0, $exitcond = 0, $f32color$08 = 0, $index$06 = 0, $index0$05 = 0, $index0$1 = 0, $index1$04 = 0, $index1$1 = 0, $or$cond = 0, $t$0 = 0.0, $u32color$07 = 0, $x$02 = 0;
 var $x$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($width|0)>(0);
 $1 = ($num_colors|0)>(1);
 $or$cond = $0 & $1;
 if (!($or$cond)) {
  ___assert_fail((16|0),(48|0),13,(64|0));
  // unreachable;
 }
 $2 = HEAP32[$cp_locations>>2]|0;
 $3 = ($2|0)==(0);
 if (!($3)) {
  ___assert_fail((96|0),(48|0),14,(64|0));
  // unreachable;
 }
 $4 = (($num_colors) + -1)|0;
 $5 = (($cp_locations) + ($4<<2)|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = (($width) + -1)|0;
 $8 = ($6|0)==($7|0);
 if (!($8)) {
  ___assert_fail((120|0),(48|0),15,(64|0));
  // unreachable;
 }
 $9 = ($num_colors*12)|0;
 $10 = (_malloc($9)|0);
 $11 = ($num_colors|0)>(0);
 if ($11) {
  $f32color$08 = $10;$index$06 = 0;$u32color$07 = $cp_values;
  while(1) {
   $12 = ((($u32color$07)) + 4|0);
   $13 = HEAP32[$u32color$07>>2]|0;
   $14 = $13 >>> 16;
   $15 = (+($14>>>0));
   $16 = $15 * 0.0039215688593685627;
   $17 = $13 >>> 8;
   $18 = $17 & 255;
   $19 = (+($18>>>0));
   $20 = $19 * 0.0039215688593685627;
   $21 = $13 & 255;
   $22 = (+($21>>>0));
   $23 = $22 * 0.0039215688593685627;
   $24 = $16;
   $25 = +HEAPF32[8>>2];
   $26 = $25;
   $27 = (+Math_pow((+$24),(+$26)));
   $28 = $27;
   $29 = ((($f32color$08)) + 4|0);
   HEAPF32[$f32color$08>>2] = $28;
   $30 = $20;
   $31 = +HEAPF32[8>>2];
   $32 = $31;
   $33 = (+Math_pow((+$30),(+$32)));
   $34 = $33;
   $35 = ((($f32color$08)) + 8|0);
   HEAPF32[$29>>2] = $34;
   $36 = $23;
   $37 = +HEAPF32[8>>2];
   $38 = $37;
   $39 = (+Math_pow((+$36),(+$38)));
   $40 = $39;
   $41 = ((($f32color$08)) + 12|0);
   HEAPF32[$35>>2] = $40;
   $42 = (($index$06) + 1)|0;
   $exitcond = ($42|0)==($num_colors|0);
   if ($exitcond) {
    break;
   } else {
    $f32color$08 = $41;$index$06 = $42;$u32color$07 = $12;
   }
  }
 }
 $43 = (_heman_image_create($width,1,3)|0);
 $44 = +HEAPF32[8>>2];
 $45 = 1.0 / $44;
 $46 = ((($43)) + 12|0);
 $47 = HEAP32[$46>>2]|0;
 $48 = $45;
 $dst$03 = $47;$index0$05 = 0;$index1$04 = 1;$x$02 = 0;
 while(1) {
  $49 = (($cp_locations) + ($index0$05<<2)|0);
  $50 = HEAP32[$49>>2]|0;
  $51 = (($cp_locations) + ($index1$04<<2)|0);
  $52 = HEAP32[$51>>2]|0;
  $53 = ($52|0)==($50|0);
  if ($53) {
   $t$0 = 0.0;
   label = 13;
  } else {
   $54 = (($x$02) - ($50))|0;
   $55 = (+($54|0));
   $56 = (($52) - ($50))|0;
   $57 = (+($56|0));
   $58 = $55 / $57;
   $59 = !($58 >= 1.0);
   if ($59) {
    $t$0 = $58;
    label = 13;
   } else {
    $60 = (($x$02) + -1)|0;
    $61 = (($index0$05) + 1)|0;
    $62 = (($index1$04) + 1)|0;
    $63 = ($62|0)>($4|0);
    $64 = $63 ? $4 : $62;
    $dst$1 = $dst$03;$index0$1 = $61;$index1$1 = $64;$x$1 = $60;
   }
  }
  if ((label|0) == 13) {
   label = 0;
   $65 = ($index0$05*3)|0;
   $66 = (($10) + ($65<<2)|0);
   $67 = +HEAPF32[$66>>2];
   $68 = (($65) + 1)|0;
   $69 = (($10) + ($68<<2)|0);
   $70 = +HEAPF32[$69>>2];
   $71 = (($65) + 2)|0;
   $72 = (($10) + ($71<<2)|0);
   $73 = +HEAPF32[$72>>2];
   $74 = ($index1$04*3)|0;
   $75 = (($10) + ($74<<2)|0);
   $76 = +HEAPF32[$75>>2];
   $77 = (($74) + 1)|0;
   $78 = (($10) + ($77<<2)|0);
   $79 = +HEAPF32[$78>>2];
   $80 = (($74) + 2)|0;
   $81 = (($10) + ($80<<2)|0);
   $82 = +HEAPF32[$81>>2];
   $83 = 1.0 - $t$0;
   $84 = $67 * $83;
   $85 = $t$0 * $76;
   $86 = $84 + $85;
   $87 = $83 * $70;
   $88 = $t$0 * $79;
   $89 = $87 + $88;
   $90 = $83 * $73;
   $91 = $t$0 * $82;
   $92 = $90 + $91;
   $93 = $86;
   $94 = (+Math_pow((+$93),(+$48)));
   $95 = $94;
   $96 = ((($dst$03)) + 4|0);
   HEAPF32[$dst$03>>2] = $95;
   $97 = $89;
   $98 = (+Math_pow((+$97),(+$48)));
   $99 = $98;
   $100 = ((($dst$03)) + 8|0);
   HEAPF32[$96>>2] = $99;
   $101 = $92;
   $102 = (+Math_pow((+$101),(+$48)));
   $103 = $102;
   $104 = ((($dst$03)) + 12|0);
   HEAPF32[$100>>2] = $103;
   $dst$1 = $104;$index0$1 = $index0$05;$index1$1 = $index1$04;$x$1 = $x$02;
  }
  $105 = (($x$1) + 1)|0;
  $106 = ($105|0)<($width|0);
  if ($106) {
   $dst$03 = $dst$1;$index0$05 = $index0$1;$index1$04 = $index1$1;$x$02 = $105;
  } else {
   break;
  }
 }
 _free($10);
 return ($43|0);
}
function _heman_color_apply_gradient($heightmap,$minheight,$maxheight,$gradient) {
 $heightmap = $heightmap|0;
 $minheight = +$minheight;
 $maxheight = +$maxheight;
 $gradient = $gradient|0;
 var $$mux = 0.0, $$not = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0;
 var $25 = 0.0, $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $brmerge = 0, $dst$03 = 0, $exitcond = 0, $i$02 = 0;
 var $src$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($heightmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((1224|0),(48|0),74,(168|0));
  // unreachable;
 }
 $3 = ((($gradient)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)==(1);
 if (!($5)) {
  ___assert_fail((200|0),(48|0),75,(168|0));
  // unreachable;
 }
 $6 = ((($gradient)) + 8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)==(3);
 if (!($8)) {
  ___assert_fail((224|0),(48|0),76,(168|0));
  // unreachable;
 }
 $9 = HEAP32[$heightmap>>2]|0;
 $10 = ((($heightmap)) + 4|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = (_heman_image_create($9,$11,3)|0);
 $13 = ((($12)) + 4|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = HEAP32[$12>>2]|0;
 $16 = Math_imul($15, $14)|0;
 $17 = $maxheight - $minheight;
 $18 = 1.0 / $17;
 $19 = ($16|0)>(0);
 if (!($19)) {
  return ($12|0);
 }
 $20 = ((($heightmap)) + 12|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($12)) + 12|0);
 $23 = HEAP32[$22>>2]|0;
 $dst$03 = $23;$i$02 = 0;$src$01 = $21;
 while(1) {
  $24 = +HEAPF32[$src$01>>2];
  $25 = $24 - $minheight;
  $26 = $18 * $25;
  $27 = $26 < 1.0;
  $28 = $27 ? $26 : 1.0;
  $29 = $28 < 0.0;
  $$not = $27 ^ 1;
  $brmerge = $29 | $$not;
  $$mux = $29 ? 0.0 : 1.0;
  $30 = $brmerge ? $$mux : $26;
  _heman_image_sample($gradient,$30,0.5,$dst$03);
  $31 = (($i$02) + 1)|0;
  $32 = ((($dst$03)) + 12|0);
  $33 = ((($src$01)) + 4|0);
  $exitcond = ($31|0)==($16|0);
  if ($exitcond) {
   break;
  } else {
   $dst$03 = $32;$i$02 = $31;$src$01 = $33;
  }
 }
 return ($12|0);
}
function _heman_color_from_grayscale($grayscale) {
 $grayscale = $grayscale|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dst$03 = 0;
 var $exitcond = 0, $i$02 = 0, $src$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($grayscale)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((248|0),(48|0),93,(272|0));
  // unreachable;
 }
 $3 = HEAP32[$grayscale>>2]|0;
 $4 = ((($grayscale)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,3)|0);
 $7 = Math_imul($5, $3)|0;
 $8 = ($7|0)>(0);
 if (!($8)) {
  return ($6|0);
 }
 $9 = ((($grayscale)) + 12|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($6)) + 12|0);
 $12 = HEAP32[$11>>2]|0;
 $dst$03 = $12;$i$02 = 0;$src$01 = $10;
 while(1) {
  $13 = ((($src$01)) + 4|0);
  $14 = HEAP32[$src$01>>2]|0;
  $15 = ((($dst$03)) + 4|0);
  HEAP32[$dst$03>>2] = $14;
  $16 = ((($dst$03)) + 8|0);
  HEAP32[$15>>2] = $14;
  $17 = ((($dst$03)) + 12|0);
  HEAP32[$16>>2] = $14;
  $18 = (($i$02) + 1)|0;
  $exitcond = ($18|0)==($7|0);
  if ($exitcond) {
   break;
  } else {
   $dst$03 = $17;$i$02 = $18;$src$01 = $13;
  }
 }
 return ($6|0);
}
function _heman_distance_create_sdf($src) {
 $src = $src|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0, $26 = 0.0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $exitcond11 = 0, $i$06 = 0, $i1$03 = 0, $nptr$04 = 0, $nptr$11 = 0, $pptr$07 = 0, $pptr$12 = 0, $sptr$05 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($src)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((304|0),(376|0),93,(392|0));
  // unreachable;
 }
 $3 = HEAP32[$src>>2]|0;
 $4 = ((($src)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,1)|0);
 $7 = HEAP32[$src>>2]|0;
 $8 = HEAP32[$4>>2]|0;
 $9 = (_heman_image_create($7,$8,1)|0);
 $10 = HEAP32[$4>>2]|0;
 $11 = HEAP32[$src>>2]|0;
 $12 = Math_imul($11, $10)|0;
 $13 = ((($6)) + 12|0);
 $14 = ((($9)) + 12|0);
 $15 = ($12|0)>(0);
 if (!($15)) {
  _transform_to_distance($6);
  _transform_to_distance($9);
  _heman_image_destroy($9);
  return ($6|0);
 }
 $16 = ((($src)) + 12|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = HEAP32[$14>>2]|0;
 $19 = HEAP32[$13>>2]|0;
 $i$06 = 0;$nptr$04 = $18;$pptr$07 = $19;$sptr$05 = $17;
 while(1) {
  $20 = +HEAPF32[$sptr$05>>2];
  $21 = $20 != 0.0;
  $22 = $21 ? 1.0000000200408773E+20 : 0.0;
  $23 = ((($pptr$07)) + 4|0);
  HEAPF32[$pptr$07>>2] = $22;
  $24 = +HEAPF32[$sptr$05>>2];
  $25 = $24 != 0.0;
  $26 = $25 ? 0.0 : 1.0000000200408773E+20;
  $27 = ((($nptr$04)) + 4|0);
  HEAPF32[$nptr$04>>2] = $26;
  $28 = (($i$06) + 1)|0;
  $29 = ((($sptr$05)) + 4|0);
  $exitcond11 = ($28|0)==($12|0);
  if ($exitcond11) {
   break;
  } else {
   $i$06 = $28;$nptr$04 = $27;$pptr$07 = $23;$sptr$05 = $29;
  }
 }
 _transform_to_distance($6);
 _transform_to_distance($9);
 if (!($15)) {
  _heman_image_destroy($9);
  return ($6|0);
 }
 $30 = HEAP32[$14>>2]|0;
 $31 = HEAP32[$13>>2]|0;
 $32 = HEAP32[$src>>2]|0;
 $33 = (+($32|0));
 $34 = 1.0 / $33;
 $35 = $34;
 $i1$03 = 0;$nptr$11 = $30;$pptr$12 = $31;
 while(1) {
  $36 = +HEAPF32[$pptr$12>>2];
  $37 = $36;
  $38 = (+Math_sqrt((+$37)));
  $39 = +HEAPF32[$nptr$11>>2];
  $40 = $39;
  $41 = (+Math_sqrt((+$40)));
  $42 = $38 - $41;
  $43 = $35 * $42;
  $44 = $43;
  HEAPF32[$pptr$12>>2] = $44;
  $45 = (($i1$03) + 1)|0;
  $46 = ((($pptr$12)) + 4|0);
  $47 = ((($nptr$11)) + 4|0);
  $exitcond = ($45|0)==($12|0);
  if ($exitcond) {
   break;
  } else {
   $i1$03 = $45;$nptr$11 = $47;$pptr$12 = $46;
  }
 }
 _heman_image_destroy($9);
 return ($6|0);
}
function _transform_to_distance($img) {
 $img = $img|0;
 var $$sum4 = 0, $$sum5 = 0, $$sum6 = 0, $$sum7 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $exitcond = 0, $exitcond37 = 0, $exitcond38 = 0, $exitcond39 = 0, $exitcond47 = 0, $scevgep = 0, $scevgep41 = 0, $scevgep44 = 0, $scevgep46 = 0, $x$033 = 0, $y$025 = 0, $y1$029 = 0, $y2$013 = 0, $y2$013$us = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$img>>2]|0;
 $1 = ((($img)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = Math_imul($2, $0)|0;
 $4 = (_calloc($3,4)|0);
 $5 = (_calloc($3,4)|0);
 $6 = (($2) + 1)|0;
 $7 = (($0) + 1)|0;
 $8 = Math_imul($6, $7)|0;
 $9 = (_calloc($8,4)|0);
 $10 = (_calloc($3,2)|0);
 $11 = (_calloc($3,2)|0);
 $12 = ($0|0)>(0);
 if ($12) {
  $13 = ($2|0)>(0);
  $14 = ((($img)) + 12|0);
  $x$033 = 0;
  while(1) {
   $29 = Math_imul($x$033, $2)|0;
   $30 = (($4) + ($29<<2)|0);
   $31 = (($5) + ($29<<2)|0);
   $32 = Math_imul($x$033, $6)|0;
   $33 = (($9) + ($32<<2)|0);
   $34 = (($10) + ($29<<1)|0);
   $35 = (($11) + ($29<<1)|0);
   if ($13) {
    $36 = HEAP32[$14>>2]|0;
    $y$025 = 0;
    while(1) {
     $37 = Math_imul($y$025, $0)|0;
     $$sum6 = (($37) + ($x$033))|0;
     $38 = (($36) + ($$sum6<<2)|0);
     $39 = HEAP32[$38>>2]|0;
     $$sum7 = (($y$025) + ($29))|0;
     $40 = (($4) + ($$sum7<<2)|0);
     HEAP32[$40>>2] = $39;
     $41 = (($y$025) + 1)|0;
     $exitcond37 = ($41|0)==($2|0);
     if ($exitcond37) {
      break;
     } else {
      $y$025 = $41;
     }
    }
    _edt($30,$31,$33,$34,$35,$2);
    if ($13) {
     $42 = HEAP32[$14>>2]|0;
     $y1$029 = 0;
     while(1) {
      $$sum4 = (($y1$029) + ($29))|0;
      $43 = (($5) + ($$sum4<<2)|0);
      $44 = HEAP32[$43>>2]|0;
      $45 = Math_imul($y1$029, $0)|0;
      $$sum5 = (($45) + ($x$033))|0;
      $46 = (($42) + ($$sum5<<2)|0);
      HEAP32[$46>>2] = $44;
      $47 = (($y1$029) + 1)|0;
      $exitcond38 = ($47|0)==($2|0);
      if ($exitcond38) {
       break;
      } else {
       $y1$029 = $47;
      }
     }
    }
   } else {
    _edt($30,$31,$33,$34,$35,$2);
   }
   $48 = (($x$033) + 1)|0;
   $exitcond39 = ($48|0)==($0|0);
   if ($exitcond39) {
    break;
   } else {
    $x$033 = $48;
   }
  }
 }
 $15 = ($2|0)>(0);
 if (!($15)) {
  _free($4);
  _free($5);
  _free($9);
  _free($10);
  _free($11);
  return;
 }
 $16 = ((($img)) + 12|0);
 if (!($12)) {
  $y2$013 = 0;
  while(1) {
   $49 = Math_imul($y2$013, $0)|0;
   $50 = (($4) + ($49<<2)|0);
   $51 = (($5) + ($49<<2)|0);
   $52 = Math_imul($y2$013, $7)|0;
   $53 = (($9) + ($52<<2)|0);
   $54 = (($10) + ($49<<1)|0);
   $55 = (($11) + ($49<<1)|0);
   _edt($50,$51,$53,$54,$55,$0);
   $56 = (($y2$013) + 1)|0;
   $exitcond = ($56|0)==($2|0);
   if ($exitcond) {
    break;
   } else {
    $y2$013 = $56;
   }
  }
  _free($4);
  _free($5);
  _free($9);
  _free($10);
  _free($11);
  return;
 }
 $17 = $0 << 2;
 $y2$013$us = 0;
 while(1) {
  $18 = Math_imul($0, $y2$013$us)|0;
  $19 = Math_imul($17, $y2$013$us)|0;
  $scevgep46 = (($5) + ($19)|0);
  $20 = (($4) + ($18<<2)|0);
  $21 = (($5) + ($18<<2)|0);
  $22 = Math_imul($y2$013$us, $7)|0;
  $23 = (($9) + ($22<<2)|0);
  $24 = (($10) + ($18<<1)|0);
  $25 = (($11) + ($18<<1)|0);
  $scevgep = (($4) + ($19)|0);
  $26 = HEAP32[$16>>2]|0;
  $scevgep41 = (($26) + ($18<<2)|0);
  _memcpy(($scevgep|0),($scevgep41|0),($17|0))|0;
  _edt($20,$21,$23,$24,$25,$0);
  $27 = HEAP32[$16>>2]|0;
  $scevgep44 = (($27) + ($18<<2)|0);
  _memcpy(($scevgep44|0),($scevgep46|0),($17|0))|0;
  $28 = (($y2$013$us) + 1)|0;
  $exitcond47 = ($28|0)==($2|0);
  if ($exitcond47) {
   break;
  } else {
   $y2$013$us = $28;
  }
 }
 _free($4);
 _free($5);
 _free($9);
 _free($10);
 _free($11);
 return;
}
function _edt($f,$d,$z,$v,$w,$n) {
 $f = $f|0;
 $d = $d|0;
 $z = $z|0;
 $v = $v|0;
 $w = $w|0;
 $n = $n|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0.0, $39 = 0, $4 = 0.0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0.0, $58 = 0, $59 = 0.0, $6 = 0.0, $60 = 0.0, $61 = 0, $62 = 0;
 var $63 = 0, $7 = 0.0, $8 = 0, $9 = 0, $9$phi = 0, $exitcond = 0, $exitcond13 = 0, $k$08 = 0, $k$1$lcssa = 0, $k$14 = 0, $k$22 = 0, $k$3 = 0, $k$3$lcssa = 0, $q$09 = 0, $q1$03 = 0, $s$0$lcssa = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAP16[$w>>1] = 0;
 HEAPF32[$z>>2] = -1.0000000200408773E+20;
 $0 = ((($z)) + 4|0);
 HEAPF32[$0>>2] = 1.0000000200408773E+20;
 $1 = ($n|0)>(1);
 if ($1) {
  $22 = -1.0000000200408773E+20;$9 = 0;$k$08 = 0;$q$09 = 1;
  while(1) {
   $3 = (($f) + ($q$09<<2)|0);
   $4 = +HEAPF32[$3>>2];
   $5 = Math_imul($q$09, $q$09)|0;
   $6 = (+($5|0));
   $7 = $6 + $4;
   $8 = $9 & 65535;
   $10 = (($f) + ($8<<2)|0);
   $11 = +HEAPF32[$10>>2];
   $12 = Math_imul($8, $8)|0;
   $13 = (+($12|0));
   $14 = $11 + $13;
   $15 = $7 - $14;
   $16 = $q$09 << 1;
   $17 = $8 << 1;
   $18 = (($16) - ($17))|0;
   $19 = (+($18|0));
   $20 = $15 / $19;
   $21 = !($20 <= $22);
   if ($21) {
    $k$1$lcssa = $k$08;$s$0$lcssa = $20;
   } else {
    $k$14 = $k$08;
    while(1) {
     $23 = (($k$14) + -1)|0;
     $24 = (($w) + ($23<<1)|0);
     $25 = HEAP16[$24>>1]|0;
     $26 = $25&65535;
     $27 = (($f) + ($26<<2)|0);
     $28 = +HEAPF32[$27>>2];
     $29 = Math_imul($26, $26)|0;
     $30 = (+($29|0));
     $31 = $28 + $30;
     $32 = $7 - $31;
     $33 = $26 << 1;
     $34 = (($16) - ($33))|0;
     $35 = (+($34|0));
     $36 = $32 / $35;
     $37 = (($z) + ($23<<2)|0);
     $38 = +HEAPF32[$37>>2];
     $39 = !($36 <= $38);
     if ($39) {
      $k$1$lcssa = $23;$s$0$lcssa = $36;
      break;
     } else {
      $k$14 = $23;
     }
    }
   }
   $40 = $q$09&65535;
   $41 = (($k$1$lcssa) + 1)|0;
   $42 = (($w) + ($41<<1)|0);
   HEAP16[$42>>1] = $40;
   $43 = (($z) + ($41<<2)|0);
   HEAPF32[$43>>2] = $s$0$lcssa;
   $44 = (($k$1$lcssa) + 2)|0;
   $45 = (($z) + ($44<<2)|0);
   HEAPF32[$45>>2] = 1.0000000200408773E+20;
   $46 = (($q$09) + 1)|0;
   $exitcond13 = ($46|0)==($n|0);
   if ($exitcond13) {
    break;
   } else {
    $9$phi = $q$09;$22 = $s$0$lcssa;$k$08 = $41;$q$09 = $46;$9 = $9$phi;
   }
  }
 }
 $2 = ($n|0)>(0);
 if ($2) {
  $k$22 = 0;$q1$03 = 0;
 } else {
  return;
 }
 while(1) {
  $47 = (+($q1$03|0));
  $k$3 = $k$22;
  while(1) {
   $48 = (($k$3) + 1)|0;
   $49 = (($z) + ($48<<2)|0);
   $50 = +HEAPF32[$49>>2];
   $51 = $50 < $47;
   if ($51) {
    $k$3 = $48;
   } else {
    $k$3$lcssa = $k$3;
    break;
   }
  }
  $52 = (($w) + ($k$3$lcssa<<1)|0);
  $53 = HEAP16[$52>>1]|0;
  $54 = $53&65535;
  $55 = (($q1$03) - ($54))|0;
  $56 = Math_imul($55, $55)|0;
  $57 = (+($56|0));
  $58 = (($f) + ($54<<2)|0);
  $59 = +HEAPF32[$58>>2];
  $60 = $59 + $57;
  $61 = (($d) + ($q1$03<<2)|0);
  HEAPF32[$61>>2] = $60;
  $62 = (($v) + ($q1$03<<1)|0);
  HEAP16[$62>>1] = $53;
  $63 = (($q1$03) + 1)|0;
  $exitcond = ($63|0)==($n|0);
  if ($exitcond) {
   break;
  } else {
   $k$22 = $k$3$lcssa;$q1$03 = $63;
  }
 }
 return;
}
function _heman_generate_island_heightmap($width,$height,$seed) {
 $width = $width|0;
 $height = $height|0;
 $seed = $seed|0;
 var $$in = 0.0, $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0.0, $116 = 0, $117 = 0, $118 = 0.0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0.0, $128 = 0.0, $129 = 0.0, $13 = 0.0, $130 = 0.0, $131 = 0, $132 = 0.0;
 var $133 = 0.0, $134 = 0.0, $135 = 0.0, $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0.0, $14 = 0.0, $140 = 0.0, $141 = 0.0, $142 = 0.0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0;
 var $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0;
 var $37 = 0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0.0, $53 = 0, $54 = 0.0;
 var $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0, $67 = 0.0, $68 = 0.0, $69 = 0, $7 = 0.0, $70 = 0, $71 = 0.0, $72 = 0.0;
 var $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0.0, $80 = 0.0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0.0;
 var $91 = 0.0, $92 = 0.0, $93 = 0, $94 = 0.0, $95 = 0.0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $ctx$i = 0, $dst$01$us$i = 0, $dst$08$us = 0, $dst2$01$us = 0, $exitcond = 0, $exitcond$i = 0, $exitcond15 = 0, $exitcond16 = 0, $exitcond17 = 0, $exitcond7$i = 0, $n = 0;
 var $n4 = 0, $not$$us = 0, $x$02$us$i = 0, $x$07$us = 0, $x3$02$us = 0, $y$012$us = 0, $y$03$us$i = 0, $y1$03$us = 0, $z = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ctx$i = sp + 28|0;
 $n = sp + 16|0;
 $n4 = sp + 4|0;
 $z = sp;
 $0 = ($seed|0)<(0);
 $1 = $0 << 31 >> 31;
 (_open_simplex_noise($seed,$1,$ctx$i)|0);
 $2 = (_heman_image_create($width,$height,3)|0);
 $3 = ((($2)) + 12|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($width|0)>($height|0);
 $6 = $5 ? $width : $height;
 $7 = (+($6|0));
 $8 = 1.0 / $7;
 $9 = ($height|0)>(0);
 if ($9) {
  $10 = ($width*3)|0;
  $11 = ($width|0)>(0);
  if ($11) {
   $y$03$us$i = 0;
   while(1) {
    $67 = (+($y$03$us$i|0));
    $68 = $8 * $67;
    $69 = Math_imul($10, $y$03$us$i)|0;
    $70 = (($4) + ($69<<2)|0);
    $71 = $68 * 4.0;
    $18 = $71;
    $72 = $68 * 16.0;
    $24 = $72;
    $73 = $68 * 32.0;
    $31 = $73;
    $74 = $68 * 64.0;
    $40 = $74;
    $75 = $68 * 128.0;
    $46 = $75;
    $dst$01$us$i = $70;$x$02$us$i = 0;
    while(1) {
     $13 = (+($x$02$us$i|0));
     $14 = $8 * $13;
     $15 = HEAP32[$ctx$i>>2]|0;
     $16 = $14 * 4.0;
     $17 = $16;
     $19 = (+_open_simplex_noise2($15,$17,$18));
     $20 = $19 * 0.20000000298023224;
     $21 = HEAP32[$ctx$i>>2]|0;
     $22 = $14 * 16.0;
     $23 = $22;
     $25 = (+_open_simplex_noise2($21,$23,$24));
     $26 = $25 * 0.10000000149011612;
     $27 = $20 + $26;
     $28 = HEAP32[$ctx$i>>2]|0;
     $29 = $14 * 32.0;
     $30 = $29;
     $32 = (+_open_simplex_noise2($28,$30,$31));
     $33 = $32 * 0.05000000074505806;
     $34 = $27 + $33;
     $35 = $34;
     $36 = ((($dst$01$us$i)) + 4|0);
     HEAPF32[$dst$01$us$i>>2] = $35;
     $37 = HEAP32[$ctx$i>>2]|0;
     $38 = $14 * 64.0;
     $39 = $38;
     $41 = (+_open_simplex_noise2($37,$39,$40));
     $42 = $41 * 0.02500000037252903;
     $43 = HEAP32[$ctx$i>>2]|0;
     $44 = $14 * 128.0;
     $45 = $44;
     $47 = (+_open_simplex_noise2($43,$45,$46));
     $48 = $47 * 0.012500000186264515;
     $49 = $42 + $48;
     $50 = $49;
     $51 = ((($dst$01$us$i)) + 8|0);
     HEAPF32[$36>>2] = $50;
     $52 = $14 + 0.5;
     $53 = HEAP32[$ctx$i>>2]|0;
     $54 = $52 * 64.0;
     $55 = $54;
     $56 = (+_open_simplex_noise2($53,$55,$40));
     $57 = $56 * 0.02500000037252903;
     $58 = HEAP32[$ctx$i>>2]|0;
     $59 = $52 * 128.0;
     $60 = $59;
     $61 = (+_open_simplex_noise2($58,$60,$46));
     $62 = $61 * 0.012500000186264515;
     $63 = $57 + $62;
     $64 = $63;
     $65 = ((($dst$01$us$i)) + 12|0);
     HEAPF32[$51>>2] = $64;
     $66 = (($x$02$us$i) + 1)|0;
     $exitcond$i = ($66|0)==($width|0);
     if ($exitcond$i) {
      break;
     } else {
      $dst$01$us$i = $65;$x$02$us$i = $66;
     }
    }
    $12 = (($y$03$us$i) + 1)|0;
    $exitcond7$i = ($12|0)==($height|0);
    if ($exitcond7$i) {
     break;
    } else {
     $y$03$us$i = $12;
    }
   }
  }
 }
 $76 = HEAP32[$ctx$i>>2]|0;
 _open_simplex_noise_free($76);
 $77 = (_heman_image_create($width,$height,1)|0);
 $78 = ((($77)) + 12|0);
 $79 = HEAP32[$78>>2]|0;
 $80 = (+($height|0));
 $81 = 1.0 / $80;
 $82 = (+($width|0));
 $83 = 1.0 / $82;
 $84 = (($height|0) / 2)&-1;
 $85 = (($width|0) / 2)&-1;
 if ($9) {
  $86 = ($width|0)>(0);
  $87 = ((($n)) + 4|0);
  $88 = ((($n)) + 8|0);
  if ($86) {
   $y$012$us = 0;
   while(1) {
    $114 = (($y$012$us) - ($84))|0;
    $115 = (+($114|0));
    $100 = $81 * $115;
    $116 = Math_imul($y$012$us, $width)|0;
    $117 = (($79) + ($116<<2)|0);
    $118 = (+($y$012$us|0));
    $92 = $81 * $118;
    $dst$08$us = $117;$x$07$us = 0;
    while(1) {
     $90 = (+($x$07$us|0));
     $91 = $83 * $90;
     _heman_image_sample($2,$91,$92,$n);
     $93 = (($x$07$us) - ($85))|0;
     $94 = (+($93|0));
     $95 = $83 * $94;
     $96 = +HEAPF32[$87>>2];
     $97 = $95 + $96;
     $98 = +HEAPF32[$88>>2];
     $99 = $100 + $98;
     $101 = $97 * $97;
     $102 = $99 * $99;
     $103 = $101 + $102;
     $104 = $103;
     $105 = (+Math_sqrt((+$104)));
     $106 = 0.7070000171661377 - $105;
     $107 = $106;
     $108 = +HEAPF32[$n>>2];
     $109 = $108 + $107;
     $not$$us = !($109 < 0.5);
     $110 = $not$$us&1;
     $111 = (+($110|0));
     $112 = ((($dst$08$us)) + 4|0);
     HEAPF32[$dst$08$us>>2] = $111;
     $113 = (($x$07$us) + 1)|0;
     $exitcond16 = ($113|0)==($width|0);
     if ($exitcond16) {
      break;
     } else {
      $dst$08$us = $112;$x$07$us = $113;
     }
    }
    $89 = (($y$012$us) + 1)|0;
    $exitcond17 = ($89|0)==($height|0);
    if ($exitcond17) {
     break;
    } else {
     $y$012$us = $89;
    }
   }
  }
 }
 $119 = (_heman_distance_create_sdf($77)|0);
 _heman_image_destroy($77);
 $120 = (_heman_image_create($width,$height,1)|0);
 $121 = ((($120)) + 12|0);
 $122 = HEAP32[$121>>2]|0;
 if (!($9)) {
  _heman_image_destroy($2);
  _heman_image_destroy($119);
  STACKTOP = sp;return ($120|0);
 }
 $123 = ($width|0)>(0);
 $124 = ((($n4)) + 4|0);
 $125 = ((($n4)) + 8|0);
 if ($123) {
  $y1$03$us = 0;
 } else {
  _heman_image_destroy($2);
  _heman_image_destroy($119);
  STACKTOP = sp;return ($120|0);
 }
 while(1) {
  $145 = Math_imul($y1$03$us, $width)|0;
  $146 = (($122) + ($145<<2)|0);
  $147 = (+($y1$03$us|0));
  $129 = $81 * $147;
  $dst2$01$us = $146;$x3$02$us = 0;
  while(1) {
   $127 = (+($x3$02$us|0));
   $128 = $83 * $127;
   _heman_image_sample($2,$128,$129,$n4);
   _heman_image_sample($119,$128,$129,$z);
   $130 = +HEAPF32[$z>>2];
   $131 = $130 > 0.0;
   if ($131) {
    $132 = +HEAPF32[$124>>2];
    $133 = $130 * $132;
    $134 = $128 + $133;
    $135 = +HEAPF32[$125>>2];
    $136 = $130 * $135;
    $137 = $129 + $136;
    _heman_image_sample($119,$134,$137,$z);
    $138 = $130 * 6.0;
    $139 = +HEAPF32[$n4>>2];
    $140 = $138 * $139;
    $141 = +HEAPF32[$z>>2];
    $142 = $141 + $140;
    HEAPF32[$z>>2] = $142;
    $$in = $142;
   } else {
    $$in = $130;
   }
   $143 = ((($dst2$01$us)) + 4|0);
   HEAPF32[$dst2$01$us>>2] = $$in;
   $144 = (($x3$02$us) + 1)|0;
   $exitcond = ($144|0)==($width|0);
   if ($exitcond) {
    break;
   } else {
    $dst2$01$us = $143;$x3$02$us = $144;
   }
  }
  $126 = (($y1$03$us) + 1)|0;
  $exitcond15 = ($126|0)==($height|0);
  if ($exitcond15) {
   break;
  } else {
   $y1$03$us = $126;
  }
 }
 _heman_image_destroy($2);
 _heman_image_destroy($119);
 STACKTOP = sp;return ($120|0);
}
function _heman_generate_simplex_fbm($width,$height,$frequency,$amplitude,$octaves,$lacunarity,$gain,$seed) {
 $width = $width|0;
 $height = $height|0;
 $frequency = +$frequency;
 $amplitude = +$amplitude;
 $octaves = $octaves|0;
 $lacunarity = +$lacunarity;
 $gain = +$gain;
 $seed = $seed|0;
 var $$in = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0.0;
 var $9 = 0, $ampl$07 = 0.0, $ctx = 0, $dst$01 = 0, $exitcond = 0, $exitcond9 = 0, $freq$06 = 0.0, $x$02 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ctx = sp;
 $0 = ($seed|0)<(0);
 $1 = $0 << 31 >> 31;
 (_open_simplex_noise($seed,$1,$ctx)|0);
 $2 = (_heman_image_create($width,$height,1)|0);
 $3 = ((($2)) + 12|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = (+($height|0));
 $6 = 1.0 / $5;
 $7 = (+($width|0));
 $8 = 1.0 / $7;
 $9 = $width << 2;
 $10 = Math_imul($9, $height)|0;
 _memset(($4|0),0,($10|0))|0;
 $11 = ($octaves|0)==(0);
 if ($11) {
  $39 = HEAP32[$ctx>>2]|0;
  _open_simplex_noise_free($39);
  STACKTOP = sp;return ($2|0);
 }
 $12 = ($height|0)>(0);
 $13 = ($width|0)>(0);
 $$in = $octaves;$ampl$07 = $amplitude;$freq$06 = $frequency;
 while(1) {
  $14 = (($$in) + -1)|0;
  if ($12) {
   $15 = $ampl$07;
   $y$03 = 0;
   while(1) {
    if ($13) {
     $16 = Math_imul($y$03, $width)|0;
     $17 = (($4) + ($16<<2)|0);
     $18 = (+($y$03|0));
     $19 = $6 * $18;
     $20 = $freq$06 * $19;
     $21 = $20;
     $dst$01 = $17;$x$02 = 0;
     while(1) {
      $22 = (+($x$02|0));
      $23 = $8 * $22;
      $24 = HEAP32[$ctx>>2]|0;
      $25 = $freq$06 * $23;
      $26 = $25;
      $27 = (+_open_simplex_noise2($24,$26,$21));
      $28 = $15 * $27;
      $29 = ((($dst$01)) + 4|0);
      $30 = +HEAPF32[$dst$01>>2];
      $31 = $30;
      $32 = $28 + $31;
      $33 = $32;
      HEAPF32[$dst$01>>2] = $33;
      $34 = (($x$02) + 1)|0;
      $exitcond = ($34|0)==($width|0);
      if ($exitcond) {
       break;
      } else {
       $dst$01 = $29;$x$02 = $34;
      }
     }
    }
    $35 = (($y$03) + 1)|0;
    $exitcond9 = ($35|0)==($height|0);
    if ($exitcond9) {
     break;
    } else {
     $y$03 = $35;
    }
   }
  }
  $36 = $ampl$07 * $gain;
  $37 = $freq$06 * $lacunarity;
  $38 = ($14|0)==(0);
  if ($38) {
   break;
  } else {
   $$in = $14;$ampl$07 = $36;$freq$06 = $37;
  }
 }
 $39 = HEAP32[$ctx>>2]|0;
 _open_simplex_noise_free($39);
 STACKTOP = sp;return ($2|0);
}
function _heman_generate_planet_heightmap($width,$height,$seed) {
 $width = $width|0;
 $height = $height|0;
 $seed = $seed|0;
 var $$lcssa = 0.0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0.0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0.0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $63 = 0.0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $amp$02 = 0.0, $ctx = 0, $dst$05 = 0, $exitcond = 0, $exitcond11 = 0, $exitcond12 = 0, $freq$01 = 0.0, $h$03 = 0.0, $oct$04 = 0, $x$06 = 0;
 var $y$07 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $ctx = sp;
 $0 = ($seed|0)<(0);
 $1 = $0 << 31 >> 31;
 (_open_simplex_noise($seed,$1,$ctx)|0);
 $2 = (_heman_image_create($width,$height,1)|0);
 $3 = (+($width|0));
 $4 = 6.2831853070000001 / $3;
 $5 = $4;
 $6 = (+($height|0));
 $7 = 3.1415926535000001 / $6;
 $8 = $7;
 $9 = (+($height|0));
 $10 = 1.0 / $9;
 $11 = ($height|0)>(0);
 if (!($11)) {
  $68 = HEAP32[$ctx>>2]|0;
  _open_simplex_noise_free($68);
  STACKTOP = sp;return ($2|0);
 }
 $12 = ((($2)) + 12|0);
 $13 = ($width|0)>(0);
 $y$07 = 0;
 while(1) {
  $14 = (+($y$07|0));
  $15 = $10 * $14;
  $16 = $15 + -0.94999998807907104;
  $17 = $16 * 10.0;
  $18 = $17 / 0.94999998807907104;
  $19 = $15;
  $20 = $19 + -0.5;
  $21 = (+Math_abs((+$20)));
  $22 = $21;
  $23 = $22;
  $24 = 0.5 - $23;
  $25 = $24 * 1.5;
  $26 = $25;
  if ($13) {
   $27 = $8 * $14;
   $28 = $26 * $26;
   $29 = $18 > -0.5;
   $30 = $29 ? $18 : -0.5;
   $31 = HEAP32[$12>>2]|0;
   $32 = Math_imul($y$07, $width)|0;
   $33 = (($31) + ($32<<2)|0);
   $34 = $30 + $28;
   $35 = $27;
   $36 = (+Math_sin((+$35)));
   $37 = (+Math_cos((+$35)));
   $dst$05 = $33;$x$06 = 0;
   while(1) {
    $38 = (+($x$06|0));
    $39 = $5 * $38;
    $40 = $39;
    $41 = (+Math_cos((+$40)));
    $42 = (+Math_sin((+$40)));
    $amp$02 = 1.0;$freq$01 = 1.0;$h$03 = $34;$oct$04 = 0;
    while(1) {
     $43 = $freq$01;
     $44 = $43 * $36;
     $45 = $44 * $41;
     $46 = $45;
     $47 = $43 * $37;
     $48 = $47;
     $49 = $44 * $42;
     $50 = $49;
     $51 = -$50;
     $52 = $amp$02;
     $53 = HEAP32[$ctx>>2]|0;
     $54 = $46;
     $55 = $48;
     $56 = $51;
     $57 = (+_open_simplex_noise3($53,$54,$55,$56));
     $58 = $52 * $57;
     $59 = $h$03;
     $60 = $59 + $58;
     $61 = $60;
     $62 = $amp$02 * 0.5;
     $63 = $freq$01 * 2.0;
     $64 = (($oct$04) + 1)|0;
     $exitcond = ($64|0)==(6);
     if ($exitcond) {
      $$lcssa = $61;
      break;
     } else {
      $amp$02 = $62;$freq$01 = $63;$h$03 = $61;$oct$04 = $64;
     }
    }
    $65 = ((($dst$05)) + 4|0);
    HEAPF32[$dst$05>>2] = $$lcssa;
    $66 = (($x$06) + 1)|0;
    $exitcond11 = ($66|0)==($width|0);
    if ($exitcond11) {
     break;
    } else {
     $dst$05 = $65;$x$06 = $66;
    }
   }
  }
  $67 = (($y$07) + 1)|0;
  $exitcond12 = ($67|0)==($height|0);
  if ($exitcond12) {
   break;
  } else {
   $y$07 = $67;
  }
 }
 $68 = HEAP32[$ctx>>2]|0;
 _open_simplex_noise_free($68);
 STACKTOP = sp;return ($2|0);
}
function _heman_image_texel($img,$x,$y) {
 $img = $img|0;
 $x = $x|0;
 $y = $y|0;
 var $$sum = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($img)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP32[$img>>2]|0;
 $3 = Math_imul($2, $y)|0;
 $4 = ((($img)) + 8|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (($3) + ($x))|0;
 $$sum = Math_imul($6, $5)|0;
 $7 = (($1) + ($$sum<<2)|0);
 return ($7|0);
}
function _heman_image_create($width,$height,$nbands) {
 $width = $width|0;
 $height = $height|0;
 $nbands = $nbands|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_malloc(16)|0);
 HEAP32[$0>>2] = $width;
 $1 = ((($0)) + 4|0);
 HEAP32[$1>>2] = $height;
 $2 = ((($0)) + 8|0);
 HEAP32[$2>>2] = $nbands;
 $3 = $width << 2;
 $4 = Math_imul($3, $height)|0;
 $5 = Math_imul($4, $nbands)|0;
 $6 = (_malloc($5)|0);
 $7 = ((($0)) + 12|0);
 HEAP32[$7>>2] = $6;
 return ($0|0);
}
function _heman_image_destroy($img) {
 $img = $img|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($img)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 _free($1);
 _free($img);
 return;
}
function _heman_image_sample($img,$u,$v,$result) {
 $img = $img|0;
 $u = +$u;
 $v = +$v;
 $result = $result|0;
 var $$ = 0.0, $$04 = 0, $$2 = 0.0, $$sum$i = 0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0.0, $30 = 0, $31 = 0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0.0, $b$06 = 0, $data$05 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$img>>2]|0;
 $1 = (($0) + -1)|0;
 $2 = (+($1|0));
 $3 = (+($0|0));
 $4 = $3 * $u;
 $5 = $2 > $4;
 $$ = $5 ? $4 : $2;
 $6 = ((($img)) + 4|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (($7) + -1)|0;
 $9 = (+($8|0));
 $10 = (+($7|0));
 $11 = $10 * $v;
 $12 = $9 > $11;
 $$2 = $12 ? $11 : $9;
 $13 = ((($img)) + 8|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ($14|0)>(0);
 if (!($15)) {
  return;
 }
 $16 = ((($img)) + 12|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = $$2 < 0.0;
 $19 = (~~(($$2)));
 $20 = $18 ? 0 : $19;
 $21 = Math_imul($20, $0)|0;
 $22 = $$ < 0.0;
 $23 = (~~(($$)));
 $24 = $22 ? 0 : $23;
 $25 = (($21) + ($24))|0;
 $$sum$i = Math_imul($25, $14)|0;
 $26 = (($17) + ($$sum$i<<2)|0);
 $$04 = $result;$b$06 = 0;$data$05 = $26;
 while(1) {
  $27 = ((($data$05)) + 4|0);
  $28 = HEAP32[$data$05>>2]|0;
  $29 = ((($$04)) + 4|0);
  HEAP32[$$04>>2] = $28;
  $30 = (($b$06) + 1)|0;
  $31 = ($30|0)<($14|0);
  if ($31) {
   $$04 = $29;$b$06 = $30;$data$05 = $27;
  } else {
   break;
  }
 }
 return;
}
function _heman_lighting_compute_normals($heightmap) {
 $heightmap = $heightmap|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0, $31 = 0.0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0, $43 = 0.0, $44 = 0;
 var $45 = 0, $46 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $exitcond = 0, $exitcond5 = 0, $n$02$us = 0, $p = 0, $px = 0, $py = 0, $x$01$us = 0, $y$03$us = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $p = sp + 24|0;
 $px = sp + 12|0;
 $py = sp;
 $0 = ((($heightmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((1224|0),(424|0),9,(440|0));
  // unreachable;
 }
 $3 = HEAP32[$heightmap>>2]|0;
 $4 = ((($heightmap)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,3)|0);
 $7 = (+($5|0));
 $8 = 1.0 / $7;
 $9 = (+($3|0));
 $10 = 1.0 / $9;
 $11 = (($3) + -1)|0;
 $12 = (($5) + -1)|0;
 $13 = ((($6)) + 12|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ($5|0)>(0);
 if (!($15)) {
  STACKTOP = sp;return ($6|0);
 }
 $16 = ($3|0)>(0);
 $17 = ((($p)) + 4|0);
 $18 = ((($p)) + 8|0);
 $19 = ((($px)) + 4|0);
 $20 = ((($px)) + 8|0);
 $21 = ((($py)) + 4|0);
 $22 = ((($py)) + 8|0);
 if ($16) {
  $y$03$us = 0;
 } else {
  STACKTOP = sp;return ($6|0);
 }
 while(1) {
  $43 = (+($y$03$us|0));
  $28 = $8 * $43;
  $42 = (($y$03$us) + 1)|0;
  $44 = ($42|0)>($12|0);
  $35 = $44 ? $12 : $42;
  $45 = Math_imul($y$03$us, $3)|0;
  $46 = (($14) + (($45*12)|0)|0);
  $34 = $8 + $28;
  $n$02$us = $46;$x$01$us = 0;
  while(1) {
   $23 = (+($x$01$us|0));
   $24 = $10 * $23;
   $25 = (($x$01$us) + 1)|0;
   $26 = ($25|0)>($11|0);
   $27 = $26 ? $11 : $25;
   HEAPF32[$p>>2] = $24;
   HEAPF32[$17>>2] = $28;
   $29 = (_heman_image_texel($heightmap,$x$01$us,$y$03$us)|0);
   $30 = HEAP32[$29>>2]|0;
   HEAP32[$18>>2] = $30;
   $31 = $10 + $24;
   HEAPF32[$px>>2] = $31;
   HEAPF32[$19>>2] = $28;
   $32 = (_heman_image_texel($heightmap,$27,$y$03$us)|0);
   $33 = HEAP32[$32>>2]|0;
   HEAP32[$20>>2] = $33;
   HEAPF32[$py>>2] = $24;
   HEAPF32[$21>>2] = $34;
   $36 = (_heman_image_texel($heightmap,$x$01$us,$35)|0);
   $37 = HEAP32[$36>>2]|0;
   HEAP32[$22>>2] = $37;
   (_kmVec3Subtract($px,$px,$p)|0);
   (_kmVec3Subtract($py,$py,$p)|0);
   (_kmVec3Cross($n$02$us,$px,$py)|0);
   (_kmVec3Normalize($n$02$us,$n$02$us)|0);
   $38 = ((($n$02$us)) + 4|0);
   $39 = +HEAPF32[$38>>2];
   $40 = -$39;
   HEAPF32[$38>>2] = $40;
   $41 = ((($n$02$us)) + 12|0);
   $exitcond = ($25|0)==($3|0);
   if ($exitcond) {
    break;
   } else {
    $n$02$us = $41;$x$01$us = $25;
   }
  }
  $exitcond5 = ($42|0)==($5|0);
  if ($exitcond5) {
   break;
  } else {
   $y$03$us = $42;
  }
 }
 STACKTOP = sp;return ($6|0);
}
function _heman_lighting_apply($heightmap,$albedo,$occlusion,$diffuse,$diffuse_softening,$light_position) {
 $heightmap = $heightmap|0;
 $albedo = $albedo|0;
 $occlusion = +$occlusion;
 $diffuse = +$diffuse;
 $diffuse_softening = +$diffuse_softening;
 $light_position = $light_position|0;
 var $$light_position = 0, $$phi$trans$insert10 = 0, $$phi$trans$insert8 = 0, $$pre = 0.0, $$pre$phi12Z2D = 0, $$pre$phi13Z2D = 0, $$pre$phiZ2D = 0, $$pre11 = 0.0, $$pre9 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0, $32 = 0.0, $33 = 0, $34 = 0, $35 = 0, $36 = 0.0;
 var $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0, $47 = 0, $48 = 0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0;
 var $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0.0;
 var $73 = 0.0, $74 = 0.0, $75 = 0.0, $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $9 = 0, $L = 0, $color$02 = 0, $exitcond = 0, $exitcond7 = 0, $x$01 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $L = sp;
 $0 = ((($heightmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((1224|0),(424|0),54,(472|0));
  // unreachable;
 }
 $3 = HEAP32[$heightmap>>2]|0;
 $4 = ((($heightmap)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,3)|0);
 $7 = (_heman_lighting_compute_normals($heightmap)|0);
 $8 = (_heman_lighting_compute_occlusion($heightmap)|0);
 $9 = ($albedo|0)!=(0|0);
 if ($9) {
  $10 = ((($albedo)) + 8|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = ($11|0)==(3);
  if (!($12)) {
   ___assert_fail((496|0),(424|0),62,(472|0));
   // unreachable;
  }
  $13 = HEAP32[$albedo>>2]|0;
  $14 = ($13|0)==($3|0);
  if (!($14)) {
   ___assert_fail((520|0),(424|0),63,(472|0));
   // unreachable;
  }
  $15 = ((($albedo)) + 4|0);
  $16 = HEAP32[$15>>2]|0;
  $17 = ($16|0)==($5|0);
  if (!($17)) {
   ___assert_fail((544|0),(424|0),64,(472|0));
   // unreachable;
  }
 }
 $18 = ($light_position|0)==(0|0);
 $$light_position = $18 ? 576 : $light_position;
 $19 = ((($6)) + 12|0);
 $20 = HEAP32[$19>>2]|0;
 $21 = +HEAPF32[8>>2];
 $22 = HEAP32[$$light_position>>2]|0;
 HEAP32[$L>>2] = $22;
 $23 = ((($$light_position)) + 4|0);
 $24 = HEAP32[$23>>2]|0;
 $25 = ((($L)) + 4|0);
 HEAP32[$25>>2] = $24;
 $26 = ((($$light_position)) + 8|0);
 $27 = HEAP32[$26>>2]|0;
 $28 = ((($L)) + 8|0);
 HEAP32[$28>>2] = $27;
 (_kmVec3Normalize($L,$L)|0);
 $29 = ($5|0)>(0);
 if (!($29)) {
  _heman_image_destroy($7);
  _heman_image_destroy($8);
  STACKTOP = sp;return ($6|0);
 }
 $30 = 1.0 / $21;
 $31 = ($3|0)>(0);
 $32 = $30;
 $y$03 = 0;
 while(1) {
  if ($31) {
   $33 = Math_imul($y$03, $3)|0;
   $34 = (($20) + (($33*12)|0)|0);
   $color$02 = $34;$x$01 = 0;
   while(1) {
    $35 = (_heman_image_texel($7,$x$01,$y$03)|0);
    (_kmVec3Lerp($35,$35,1392,$diffuse_softening)|0);
    $36 = (+_kmVec3Dot($35,$L));
    $37 = (+_kmClamp($36,0.0,1.0));
    $38 = 1.0 - $37;
    $39 = $38 * $diffuse;
    $40 = 1.0 - $39;
    $41 = (_heman_image_texel($8,$x$01,$y$03)|0);
    $42 = +HEAPF32[$41>>2];
    $43 = 1.0 - $42;
    $44 = $43 * $occlusion;
    $45 = 1.0 - $44;
    if ($9) {
     $46 = (_heman_image_texel($albedo,$x$01,$y$03)|0);
     ;HEAP32[$color$02>>2]=HEAP32[$46>>2]|0;HEAP32[$color$02+4>>2]=HEAP32[$46+4>>2]|0;HEAP32[$color$02+8>>2]=HEAP32[$46+8>>2]|0;
     $$pre = +HEAPF32[$color$02>>2];
     $$phi$trans$insert8 = ((($color$02)) + 4|0);
     $$pre9 = +HEAPF32[$$phi$trans$insert8>>2];
     $$phi$trans$insert10 = ((($color$02)) + 8|0);
     $$pre11 = +HEAPF32[$$phi$trans$insert10>>2];
     $$pre$phi12Z2D = $$phi$trans$insert8;$$pre$phi13Z2D = $$phi$trans$insert10;$$pre$phiZ2D = $color$02;$50 = $$pre;$56 = $$pre9;$62 = $$pre11;
    } else {
     $47 = ((($color$02)) + 8|0);
     HEAPF32[$47>>2] = 1.0;
     $48 = ((($color$02)) + 4|0);
     HEAPF32[$48>>2] = 1.0;
     HEAPF32[$color$02>>2] = 1.0;
     $$pre$phi12Z2D = $48;$$pre$phi13Z2D = $47;$$pre$phiZ2D = $color$02;$50 = 1.0;$56 = 1.0;$62 = 1.0;
    }
    $49 = $50;
    $51 = +HEAPF32[8>>2];
    $52 = $51;
    $53 = (+Math_pow((+$49),(+$52)));
    $54 = $53;
    HEAPF32[$$pre$phiZ2D>>2] = $54;
    $55 = $56;
    $57 = +HEAPF32[8>>2];
    $58 = $57;
    $59 = (+Math_pow((+$55),(+$58)));
    $60 = $59;
    HEAPF32[$$pre$phi12Z2D>>2] = $60;
    $61 = $62;
    $63 = +HEAPF32[8>>2];
    $64 = $63;
    $65 = (+Math_pow((+$61),(+$64)));
    $66 = $65;
    HEAPF32[$$pre$phi13Z2D>>2] = $66;
    $67 = $40 * $45;
    (_kmVec3Scale($color$02,$color$02,$67)|0);
    $68 = +HEAPF32[$$pre$phiZ2D>>2];
    $69 = $68;
    $70 = (+Math_pow((+$69),(+$32)));
    $71 = $70;
    HEAPF32[$$pre$phiZ2D>>2] = $71;
    $72 = +HEAPF32[$$pre$phi12Z2D>>2];
    $73 = $72;
    $74 = (+Math_pow((+$73),(+$32)));
    $75 = $74;
    HEAPF32[$$pre$phi12Z2D>>2] = $75;
    $76 = +HEAPF32[$$pre$phi13Z2D>>2];
    $77 = $76;
    $78 = (+Math_pow((+$77),(+$32)));
    $79 = $78;
    HEAPF32[$$pre$phi13Z2D>>2] = $79;
    $80 = (($x$01) + 1)|0;
    $81 = ((($color$02)) + 12|0);
    $exitcond = ($80|0)==($3|0);
    if ($exitcond) {
     break;
    } else {
     $color$02 = $81;$x$01 = $80;
    }
   }
  }
  $82 = (($y$03) + 1)|0;
  $exitcond7 = ($82|0)==($5|0);
  if ($exitcond7) {
   break;
  } else {
   $y$03 = $82;
  }
 }
 _heman_image_destroy($7);
 _heman_image_destroy($8);
 STACKTOP = sp;return ($6|0);
}
function _heman_lighting_compute_occlusion($heightmap) {
 $heightmap = $heightmap|0;
 var $$$i = 0, $$0$val46$i = 0, $$022$val43$i = 0, $$1$i = 0, $$1$i$i = 0, $$1$i34$i = 0, $$1$i41$i = 0, $$1$val47$i = 0, $$12$i$i = 0, $$12$i30$i = 0, $$12$i38$i = 0, $$123$i = 0, $$123$val44$i = 0, $$2$i = 0, $$2$i$i = 0, $$2$i35$i = 0, $$2$i42$i = 0, $$2$val48$i = 0, $$224$i = 0, $$224$val45$i = 0;
 var $$23$i$i = 0, $$23$i31$i = 0, $$23$i39$i = 0, $$lcssa = 0, $$neg$i = 0, $$neg49$i = 0, $$pn$i = 0, $$sum11$i = 0, $$sum13$i = 0, $$sum14$i = 0, $$sum14$i$lcssa = 0, $$sum15$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0.0, $103 = 0.0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0.0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0.0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0.0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0.0, $14 = 0.0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0.0, $145 = 0.0, $146 = 0.0, $147 = 0.0, $148 = 0.0, $149 = 0, $15 = 0, $150 = 0, $151 = 0.0, $152 = 0.0, $153 = 0.0, $154 = 0.0, $155 = 0.0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0.0, $169 = 0, $17 = 0, $170 = 0.0, $171 = 0.0, $172 = 0.0, $173 = 0.0, $174 = 0.0, $175 = 0.0, $176 = 0, $177 = 0.0;
 var $178 = 0.0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0.0, $188 = 0.0, $189 = 0, $19 = 0, $190 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $a$i$i = 0, $a$i32$i = 0, $b$i$i = 0, $b$i28$i = 0, $d$i$i = 0, $d$i36$i = 0, $direction$i$i = 0, $dx$lobit$i = 0, $dy$lobit$i = 0, $exitcond$i = 0, $exitcond87$i = 0, $exitcond88$i = 0, $exitcond89$i = 0, $exitcond90$i = 0, $exitcond91$i = 0, $exitcond92$i = 0, $horizonpt$i$i = 0;
 var $i$0$i = 0, $i$012 = 0, $i1$011 = 0, $i2$0$i = 0, $i2$051$i = 0, $i2$054$i = 0, $ispos$i = 0, $ispos9$i = 0, $j$0$i = 0, $j3$053$i = 0, $neg$i = 0, $neg10$i = 0, $or$cond = 0, $or$cond16$us$us$i = 0, $or$cond17$i = 0, $or$cond18$i = 0, $or$cond3$i = 0, $or$cond6$i = 0, $p$0$lcssa$i = 0, $p$082$i = 0;
 var $p$1$lcssa$i = 0, $p$160$i = 0, $p$160$us$i = 0, $p$160$us$us$i = 0, $p$160$us$us76$i = 0, $p$160$us64$i = 0, $p$160$us71$i = 0, $p$2$us$us$i = 0, $pathlen$0$i = 0, $scevgep = 0, $scevgep18 = 0, $scevgep19 = 0, $scevgep20 = 0, $scevgep21 = 0, $stack_top$052$i = 0, $stack_top$1$i = 0, $stack_top$1$i$lcssa = 0, $sweep$056$i = 0, $thispt$i$i = 0, $x$081$i = 0;
 var $y$058$i = 0, $y$058$us$i = 0, $y$058$us$us$i = 0, $y$058$us$us77$i = 0, $y$058$us65$i = 0, $y$058$us72$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $horizonpt$i$i = sp + 80|0;
 $thispt$i$i = sp + 48|0;
 $direction$i$i = sp + 104|0;
 $b$i28$i = sp + 16|0;
 $a$i32$i = sp;
 $d$i36$i = sp + 116|0;
 $b$i$i = sp + 64|0;
 $a$i$i = sp + 32|0;
 $d$i$i = sp + 92|0;
 $0 = ((($heightmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((1224|0),(424|0),217,(592|0));
  // unreachable;
 }
 $3 = HEAP32[$heightmap>>2]|0;
 $4 = ((($heightmap)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,1)|0);
 $7 = ((($6)) + 12|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $3 << 2;
 $10 = Math_imul($9, $5)|0;
 _memset(($8|0),0,($10|0))|0;
 $11 = (+($3|0));
 $12 = (+($5|0));
 $13 = (+_kmMax($11,$12));
 $14 = $13 * 24.0;
 $15 = (~~(($14))>>>0);
 $16 = (_malloc($15)|0);
 $17 = $16;
 $18 = ((($16)) + 4|0);
 $$12$i$i = ((($b$i$i)) + 4|0);
 $$23$i$i = ((($b$i$i)) + 8|0);
 $$1$i$i = ((($a$i$i)) + 4|0);
 $$2$i$i = ((($a$i$i)) + 8|0);
 $$12$i30$i = ((($b$i28$i)) + 4|0);
 $$23$i31$i = ((($b$i28$i)) + 8|0);
 $$1$i34$i = ((($a$i32$i)) + 4|0);
 $$2$i35$i = ((($a$i32$i)) + 8|0);
 $$12$i38$i = ((($horizonpt$i$i)) + 4|0);
 $$23$i39$i = ((($horizonpt$i$i)) + 8|0);
 $$1$i41$i = ((($thispt$i$i)) + 4|0);
 $$2$i42$i = ((($thispt$i$i)) + 8|0);
 $i$012 = 0;
 L4: while(1) {
  $22 = $i$012 << 1;
  $23 = (632 + ($22<<2)|0);
  $24 = HEAP32[$23>>2]|0;
  $25 = $22 | 1;
  $26 = (632 + ($25<<2)|0);
  $27 = HEAP32[$26>>2]|0;
  $28 = HEAP32[$heightmap>>2]|0;
  $29 = HEAP32[$4>>2]|0;
  $30 = 656905071 >>> $22;
  $31 = $30 & 1;
  $ispos$i = ($31|0)!=(0);
  $neg$i = (0 - ($24))|0;
  $32 = $ispos$i ? $24 : $neg$i;
  $33 = (0 - ($32))|0;
  $34 = 656905071 >>> $25;
  $35 = $34 & 1;
  $ispos9$i = ($35|0)!=(0);
  $neg10$i = (0 - ($27))|0;
  $36 = $ispos9$i ? $27 : $neg10$i;
  $37 = (0 - ($36))|0;
  $38 = Math_imul($28, $36)|0;
  $39 = Math_imul($29, $32)|0;
  $$neg$i = (1 - ($32))|0;
  $$neg49$i = (($$neg$i) - ($36))|0;
  $40 = (($$neg49$i) + ($38))|0;
  $41 = (($40) + ($39))|0;
  $42 = (($28) - ($32))|0;
  $43 = ($42|0)>($33|0);
  if ($43) {
   $dy$lobit$i = $27 >>> 31;
   $44 = 656904969 >>> $25;
   $45 = $44 & 1;
   $dx$lobit$i = $24 >>> 31;
   $46 = 656904969 >>> $22;
   $47 = $46 & 1;
   $48 = (($29) - ($36))|0;
   $49 = ($48|0)>($37|0);
   $50 = ($47>>>0)<($dx$lobit$i>>>0);
   $51 = (($28) + -1)|0;
   $52 = ($45>>>0)<($dy$lobit$i>>>0);
   $53 = (($29) + -1)|0;
   $54 = $29 << 1;
   $p$082$i = $16;$x$081$i = $33;
   while(1) {
    L10: do {
     if ($49) {
      $55 = ($x$081$i|0)>(-1);
      $56 = ($28|0)>($x$081$i|0);
      $57 = (($51) - ($x$081$i))|0;
      $58 = $50 ? $57 : $x$081$i;
      if (!($55)) {
       if ($56) {
        $p$160$us64$i = $p$082$i;$y$058$us65$i = $37;
        while(1) {
         $73 = ((($p$160$us64$i)) + 4|0);
         HEAP32[$p$160$us64$i>>2] = $58;
         $74 = (($53) - ($y$058$us65$i))|0;
         $75 = $52 ? $74 : $y$058$us65$i;
         $76 = ((($p$160$us64$i)) + 8|0);
         HEAP32[$73>>2] = $75;
         $77 = (($y$058$us65$i) + 1)|0;
         $exitcond88$i = ($77|0)==($48|0);
         if ($exitcond88$i) {
          break;
         } else {
          $p$160$us64$i = $76;$y$058$us65$i = $77;
         }
        }
        $scevgep19 = (($p$082$i) + ($54<<2)|0);
        $p$1$lcssa$i = $scevgep19;
        break;
       }
       if ($52) {
        $p$160$us71$i = $p$082$i;$y$058$us72$i = $37;
        while(1) {
         $78 = ((($p$160$us71$i)) + 4|0);
         HEAP32[$p$160$us71$i>>2] = $58;
         $79 = (($53) - ($y$058$us72$i))|0;
         $80 = ((($p$160$us71$i)) + 8|0);
         HEAP32[$78>>2] = $79;
         $81 = (($y$058$us72$i) + 1)|0;
         $exitcond89$i = ($81|0)==($48|0);
         if ($exitcond89$i) {
          break;
         } else {
          $p$160$us71$i = $80;$y$058$us72$i = $81;
         }
        }
        $scevgep18 = (($p$082$i) + ($54<<2)|0);
        $p$1$lcssa$i = $scevgep18;
        break;
       } else {
        $p$160$i = $p$082$i;$y$058$i = $37;
        while(1) {
         $82 = ((($p$160$i)) + 4|0);
         HEAP32[$p$160$i>>2] = $58;
         $83 = ((($p$160$i)) + 8|0);
         HEAP32[$82>>2] = $y$058$i;
         $84 = (($y$058$i) + 1)|0;
         $exitcond$i = ($84|0)==($48|0);
         if ($exitcond$i) {
          break;
         } else {
          $p$160$i = $83;$y$058$i = $84;
         }
        }
        $scevgep = (($p$082$i) + ($54<<2)|0);
        $p$1$lcssa$i = $scevgep;
        break;
       }
      }
      if ($56) {
       $p$160$us$us$i = $p$082$i;$y$058$us$us$i = $37;
       while(1) {
        $59 = ($y$058$us$us$i|0)>(-1);
        $60 = ($29|0)>($y$058$us$us$i|0);
        $or$cond16$us$us$i = $60 & $59;
        if ($or$cond16$us$us$i) {
         $p$2$us$us$i = $p$160$us$us$i;
        } else {
         $61 = ((($p$160$us$us$i)) + 4|0);
         HEAP32[$p$160$us$us$i>>2] = $58;
         $62 = (($53) - ($y$058$us$us$i))|0;
         $63 = $52 ? $62 : $y$058$us$us$i;
         $64 = ((($p$160$us$us$i)) + 8|0);
         HEAP32[$61>>2] = $63;
         $p$2$us$us$i = $64;
        }
        $65 = (($y$058$us$us$i) + 1)|0;
        $exitcond90$i = ($65|0)==($48|0);
        if ($exitcond90$i) {
         $p$1$lcssa$i = $p$2$us$us$i;
         break L10;
        } else {
         $p$160$us$us$i = $p$2$us$us$i;$y$058$us$us$i = $65;
        }
       }
      }
      if ($52) {
       $p$160$us$us76$i = $p$082$i;$y$058$us$us77$i = $37;
       while(1) {
        $66 = ((($p$160$us$us76$i)) + 4|0);
        HEAP32[$p$160$us$us76$i>>2] = $58;
        $67 = (($53) - ($y$058$us$us77$i))|0;
        $68 = ((($p$160$us$us76$i)) + 8|0);
        HEAP32[$66>>2] = $67;
        $69 = (($y$058$us$us77$i) + 1)|0;
        $exitcond91$i = ($69|0)==($48|0);
        if ($exitcond91$i) {
         break;
        } else {
         $p$160$us$us76$i = $68;$y$058$us$us77$i = $69;
        }
       }
       $scevgep21 = (($p$082$i) + ($54<<2)|0);
       $p$1$lcssa$i = $scevgep21;
       break;
      } else {
       $p$160$us$i = $p$082$i;$y$058$us$i = $37;
       while(1) {
        $70 = ((($p$160$us$i)) + 4|0);
        HEAP32[$p$160$us$i>>2] = $58;
        $71 = ((($p$160$us$i)) + 8|0);
        HEAP32[$70>>2] = $y$058$us$i;
        $72 = (($y$058$us$i) + 1)|0;
        $exitcond87$i = ($72|0)==($48|0);
        if ($exitcond87$i) {
         break;
        } else {
         $p$160$us$i = $71;$y$058$us$i = $72;
        }
       }
       $scevgep20 = (($p$082$i) + ($54<<2)|0);
       $p$1$lcssa$i = $scevgep20;
       break;
      }
     } else {
      $p$1$lcssa$i = $p$082$i;
     }
    } while(0);
    $85 = (($x$081$i) + 1)|0;
    $exitcond92$i = ($85|0)==($42|0);
    if ($exitcond92$i) {
     $p$0$lcssa$i = $p$1$lcssa$i;
     break;
    } else {
     $p$082$i = $p$1$lcssa$i;$x$081$i = $85;
    }
   }
  } else {
   $p$0$lcssa$i = $16;
  }
  $86 = $p$0$lcssa$i;
  $87 = (($86) - ($17))|0;
  $88 = $87 >> 2;
  $89 = (($88|0) / 2)&-1;
  $90 = ($41|0)==($89|0);
  if (!($90)) {
   label = 29;
   break;
  }
  $91 = HEAP32[$16>>2]|0;
  $92 = HEAP32[$18>>2]|0;
  $i$0$i = $91;$j$0$i = $92;$pathlen$0$i = 0;
  while(1) {
   $93 = (($i$0$i) + ($24))|0;
   $94 = (($j$0$i) + ($27))|0;
   $95 = (($pathlen$0$i) + 1)|0;
   $96 = ($93|0)>(-1);
   if (!($96)) {
    $$lcssa = $95;
    break;
   }
   $97 = ($93|0)<($28|0);
   $98 = ($94|0)>(-1);
   $or$cond3$i = $98 & $97;
   $99 = ($94|0)<($29|0);
   $or$cond17$i = $99 & $or$cond3$i;
   if ($or$cond17$i) {
    $i$0$i = $93;$j$0$i = $94;$pathlen$0$i = $95;
   } else {
    $$lcssa = $95;
    break;
   }
  }
  $100 = ($28|0)>($29|0);
  $101 = $100 ? $28 : $29;
  $102 = (+($101|0));
  $103 = 1.0 / $102;
  $104 = ($41*12)|0;
  $105 = Math_imul($104, $$lcssa)|0;
  $106 = (_malloc($105)|0);
  $107 = ($41|0)>(0);
  if ($107) {
   $108 = (($28) + -1)|0;
   $109 = (($29) + -1)|0;
   $sweep$056$i = 0;
   while(1) {
    $110 = Math_imul($sweep$056$i, $$lcssa)|0;
    $111 = $sweep$056$i << 1;
    $112 = (($16) + ($111<<2)|0);
    $113 = HEAP32[$112>>2]|0;
    $$sum11$i = $111 | 1;
    $114 = (($16) + ($$sum11$i<<2)|0);
    $115 = HEAP32[$114>>2]|0;
    $116 = (+($113|0));
    $117 = $103 * $116;
    $118 = (+($115|0));
    $119 = $103 * $118;
    $120 = ($108|0)>($113|0);
    $121 = $120 ? $113 : $108;
    $122 = ($121|0)<(0);
    $$$i = $122 ? 0 : $121;
    $123 = ($109|0)>($115|0);
    $124 = $123 ? $115 : $109;
    $125 = ($124|0)<(0);
    $126 = $125 ? 0 : $124;
    $127 = (_heman_image_texel($heightmap,$$$i,$126)|0);
    $128 = HEAP32[$127>>2]|0;
    $129 = (($106) + (($110*12)|0)|0);
    HEAPF32[$129>>2] = $117;
    $130 = (((($106) + (($110*12)|0)|0)) + 4|0);
    HEAPF32[$130>>2] = $119;
    $131 = (((($106) + (($110*12)|0)|0)) + 8|0);
    HEAP32[$131>>2] = $128;
    $i2$051$i = (($113) + ($24))|0;
    $132 = ($i2$051$i|0)>(-1);
    L52: do {
     if ($132) {
      $$pn$i = $115;$i2$054$i = $i2$051$i;$stack_top$052$i = 0;
      while(1) {
       $j3$053$i = (($$pn$i) + ($27))|0;
       $133 = ($i2$054$i|0)<($28|0);
       $134 = ($j3$053$i|0)>(-1);
       $or$cond6$i = $133 & $134;
       $135 = ($j3$053$i|0)<($29|0);
       $or$cond18$i = $135 & $or$cond6$i;
       if (!($or$cond18$i)) {
        break L52;
       }
       $136 = (+($i2$054$i|0));
       $137 = $103 * $136;
       $138 = (+($j3$053$i|0));
       $139 = $103 * $138;
       $140 = (_heman_image_texel($heightmap,$i2$054$i,$j3$053$i)|0);
       $141 = HEAP32[$140>>2]|0;
       $stack_top$1$i = $stack_top$052$i;
       while(1) {
        $142 = ($stack_top$1$i|0)>(0);
        $$sum14$i = (($stack_top$1$i) + ($110))|0;
        if (!($142)) {
         $$sum14$i$lcssa = $$sum14$i;$stack_top$1$i$lcssa = $stack_top$1$i;
         break;
        }
        $143 = (($106) + (($$sum14$i*12)|0)|0);
        $$022$val43$i = HEAP32[$143>>2]|0;
        $$123$i = (((($106) + (($$sum14$i*12)|0)|0)) + 4|0);
        $$123$val44$i = HEAP32[$$123$i>>2]|0;
        $$224$i = (((($106) + (($$sum14$i*12)|0)|0)) + 8|0);
        $$224$val45$i = HEAP32[$$224$i>>2]|0;
        HEAP32[$b$i$i>>2] = $$022$val43$i;
        HEAP32[$$12$i$i>>2] = $$123$val44$i;
        HEAP32[$$23$i$i>>2] = $$224$val45$i;
        HEAPF32[$a$i$i>>2] = $137;
        HEAPF32[$$1$i$i>>2] = $139;
        HEAP32[$$2$i$i>>2] = $141;
        (_kmVec3Subtract($d$i$i,$a$i$i,$b$i$i)|0);
        $144 = (+_kmVec3Length($d$i$i));
        $145 = +HEAPF32[$$23$i$i>>2];
        $146 = +HEAPF32[$$2$i$i>>2];
        $147 = $145 - $146;
        $148 = $147 / $144;
        $149 = (($stack_top$1$i) + -1)|0;
        $$sum15$i = (($149) + ($110))|0;
        $150 = (($106) + (($$sum15$i*12)|0)|0);
        $$0$val46$i = HEAP32[$150>>2]|0;
        $$1$i = (((($106) + (($$sum15$i*12)|0)|0)) + 4|0);
        $$1$val47$i = HEAP32[$$1$i>>2]|0;
        $$2$i = (((($106) + (($$sum15$i*12)|0)|0)) + 8|0);
        $$2$val48$i = HEAP32[$$2$i>>2]|0;
        HEAP32[$b$i28$i>>2] = $$0$val46$i;
        HEAP32[$$12$i30$i>>2] = $$1$val47$i;
        HEAP32[$$23$i31$i>>2] = $$2$val48$i;
        HEAPF32[$a$i32$i>>2] = $137;
        HEAPF32[$$1$i34$i>>2] = $139;
        HEAP32[$$2$i35$i>>2] = $141;
        (_kmVec3Subtract($d$i36$i,$a$i32$i,$b$i28$i)|0);
        $151 = (+_kmVec3Length($d$i36$i));
        $152 = +HEAPF32[$$23$i31$i>>2];
        $153 = +HEAPF32[$$2$i35$i>>2];
        $154 = $152 - $153;
        $155 = $154 / $151;
        $156 = !($148 >= $155);
        if ($156) {
         $stack_top$1$i = $149;
        } else {
         $$sum14$i$lcssa = $$sum14$i;$stack_top$1$i$lcssa = $stack_top$1$i;
         break;
        }
       }
       $157 = (($stack_top$1$i$lcssa) + 1)|0;
       $158 = ($157|0)<($$lcssa|0);
       if (!($158)) {
        label = 41;
        break L4;
       }
       $159 = (($106) + (($$sum14$i$lcssa*12)|0)|0);
       $160 = (((($106) + (($$sum14$i$lcssa*12)|0)|0)) + 8|0);
       $161 = HEAP32[$160>>2]|0;
       $162 = (((($106) + (($$sum14$i$lcssa*12)|0)|0)) + 4|0);
       $163 = HEAP32[$162>>2]|0;
       $164 = HEAP32[$159>>2]|0;
       $$sum13$i = (($157) + ($110))|0;
       $165 = (($106) + (($$sum13$i*12)|0)|0);
       HEAPF32[$165>>2] = $137;
       $166 = (((($106) + (($$sum13$i*12)|0)|0)) + 4|0);
       HEAPF32[$166>>2] = $139;
       $167 = (((($106) + (($$sum13$i*12)|0)|0)) + 8|0);
       HEAP32[$167>>2] = $141;
       HEAP32[$horizonpt$i$i>>2] = $164;
       HEAP32[$$12$i38$i>>2] = $163;
       HEAP32[$$23$i39$i>>2] = $161;
       HEAPF32[$thispt$i$i>>2] = $137;
       HEAPF32[$$1$i41$i>>2] = $139;
       HEAP32[$$2$i42$i>>2] = $141;
       (_kmVec3Subtract($direction$i$i,$horizonpt$i$i,$thispt$i$i)|0);
       (_kmVec3Normalize($direction$i$i,$direction$i$i)|0);
       $168 = (+_kmVec3Dot($direction$i$i,1392));
       $169 = $168 > 0.0;
       $170 = $168;
       $171 = $169 ? $170 : 0.0;
       $172 = (+Math_atan((+$171)));
       $173 = $172 * 0.63661977236;
       $174 = $173;
       $175 = $174 * 0.0625;
       $176 = (_heman_image_texel($6,$i2$054$i,$j3$053$i)|0);
       $177 = +HEAPF32[$176>>2];
       $178 = $175 + $177;
       HEAPF32[$176>>2] = $178;
       $i2$0$i = (($i2$054$i) + ($24))|0;
       $179 = ($i2$0$i|0)>(-1);
       if ($179) {
        $$pn$i = $j3$053$i;$i2$054$i = $i2$0$i;$stack_top$052$i = $157;
       } else {
        break;
       }
      }
     }
    } while(0);
    $180 = (($sweep$056$i) + 1)|0;
    $181 = ($180|0)<($41|0);
    if ($181) {
     $sweep$056$i = $180;
    } else {
     break;
    }
   }
  }
  _free($106);
  $182 = (($i$012) + 1)|0;
  $183 = ($182|0)<(16);
  if ($183) {
   $i$012 = $182;
  } else {
   label = 4;
   break;
  }
 }
 if ((label|0) == 4) {
  $19 = Math_imul($5, $3)|0;
  $20 = ($19|0)>(0);
  if (!($20)) {
   _free($16);
   STACKTOP = sp;return ($6|0);
  }
  $21 = HEAP32[$7>>2]|0;
  $i1$011 = 0;
  while(1) {
   $186 = (($21) + ($i1$011<<2)|0);
   $187 = +HEAPF32[$186>>2];
   $188 = 1.0 - $187;
   HEAPF32[$186>>2] = $188;
   $189 = !($188 >= 0.0);
   $190 = !($188 <= 1.0);
   $or$cond = $189 | $190;
   $185 = (($i1$011) + 1)|0;
   if ($or$cond) {
    label = 47;
    break;
   }
   $184 = ($185|0)<($19|0);
   if ($184) {
    $i1$011 = $185;
   } else {
    label = 48;
    break;
   }
  }
  if ((label|0) == 47) {
   ___assert_fail((832|0),(424|0),243,(592|0));
   // unreachable;
  }
  else if ((label|0) == 48) {
   _free($16);
   STACKTOP = sp;return ($6|0);
  }
 }
 else if ((label|0) == 29) {
  ___assert_fail((760|0),(424|0),152,(792|0));
  // unreachable;
 }
 else if ((label|0) == 41) {
  ___assert_fail((808|0),(424|0),203,(792|0));
  // unreachable;
 }
 return (0)|0;
}
function _open_simplex_noise($0,$1,$ctx) {
 $0 = $0|0;
 $1 = $1|0;
 $ctx = $ctx|0;
 var $$ = 0, $$0 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $i$06 = 0, $i$14 = 0, $source = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 512|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $source = sp;
 $2 = (_malloc(8)|0);
 HEAP32[$ctx>>2] = $2;
 $3 = ($2|0)==(0|0);
 if ($3) {
  $$0 = -12;
  STACKTOP = sp;return ($$0|0);
 }
 HEAP32[$2>>2] = 0;
 $4 = ((($2)) + 4|0);
 HEAP32[$4>>2] = 0;
 $5 = HEAP32[$ctx>>2]|0;
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(0|0);
 if (!($7)) {
  _free($6);
 }
 $8 = ((($5)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)==(0|0);
 if (!($10)) {
  _free($9);
 }
 $11 = (_malloc(512)|0);
 HEAP32[$5>>2] = $11;
 $12 = ($11|0)==(0|0);
 do {
  if (!($12)) {
   $13 = (_malloc(512)|0);
   HEAP32[$8>>2] = $13;
   $14 = ($13|0)==(0|0);
   if ($14) {
    _free($11);
    break;
   }
   $16 = HEAP32[$ctx>>2]|0;
   $17 = HEAP32[$16>>2]|0;
   $18 = ((($16)) + 4|0);
   $19 = HEAP32[$18>>2]|0;
   $i$06 = 0;
   while(1) {
    $20 = $i$06&65535;
    $21 = (($source) + ($i$06<<1)|0);
    HEAP16[$21>>1] = $20;
    $22 = (($i$06) + 1)|0;
    $exitcond = ($22|0)==(256);
    if ($exitcond) {
     break;
    } else {
     $i$06 = $22;
    }
   }
   $23 = (___muldi3(($0|0),($1|0),-232445707,184838518)|0);
   $24 = tempRet0;
   $25 = (_i64Add(($23|0),($24|0),779256089,-1695123422)|0);
   $26 = tempRet0;
   $27 = $25;$28 = $26;$i$14 = 255;
   while(1) {
    $29 = (___muldi3(($27|0),($28|0),1284865837,1481765933)|0);
    $30 = tempRet0;
    $31 = (_i64Add(($29|0),($30|0),-144211633,335903614)|0);
    $32 = tempRet0;
    $33 = (_i64Add(($29|0),($30|0),-144211602,335903614)|0);
    $34 = tempRet0;
    $35 = (($i$14) + 1)|0;
    $36 = ($35|0)<(0);
    $37 = $36 << 31 >> 31;
    $38 = (___remdi3(($33|0),($34|0),($35|0),($37|0))|0);
    $39 = tempRet0;
    $40 = ($38|0)<(0);
    $41 = $40 ? $35 : 0;
    $$ = (($41) + ($38))|0;
    $42 = (($source) + ($$<<1)|0);
    $43 = HEAP16[$42>>1]|0;
    $44 = (($17) + ($i$14<<1)|0);
    HEAP16[$44>>1] = $43;
    $45 = $43 << 16 >> 16;
    $46 = (($45>>>0) % 24)&-1;
    $47 = ($46*3)|0;
    $48 = $47&65535;
    $49 = (($19) + ($i$14<<1)|0);
    HEAP16[$49>>1] = $48;
    $50 = (($source) + ($i$14<<1)|0);
    $51 = HEAP16[$50>>1]|0;
    HEAP16[$42>>1] = $51;
    $52 = (($i$14) + -1)|0;
    $53 = ($i$14|0)>(0);
    if ($53) {
     $27 = $31;$28 = $32;$i$14 = $52;
    } else {
     $$0 = 0;
     break;
    }
   }
   STACKTOP = sp;return ($$0|0);
  }
 } while(0);
 $15 = HEAP32[$ctx>>2]|0;
 _free($15);
 $$0 = -12;
 STACKTOP = sp;return ($$0|0);
}
function _open_simplex_noise_free($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ctx|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = HEAP32[$ctx>>2]|0;
 $2 = ($1|0)==(0|0);
 if (!($2)) {
  _free($1);
  HEAP32[$ctx>>2] = 0;
 }
 $3 = ((($ctx)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)==(0|0);
 if (!($5)) {
  _free($4);
 }
 _free($ctx);
 return;
}
function _open_simplex_noise2($ctx,$x,$y) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $100 = 0, $101 = 0, $102 = 0.0, $103 = 0, $104 = 0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0.0;
 var $116 = 0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0, $122 = 0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0, $127 = 0.0, $128 = 0.0, $129 = 0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0.0, $145 = 0.0, $146 = 0, $147 = 0, $148 = 0, $149 = 0.0, $15 = 0.0, $150 = 0.0, $151 = 0.0;
 var $152 = 0.0, $153 = 0.0, $154 = 0.0, $155 = 0.0, $156 = 0.0, $157 = 0.0, $158 = 0, $159 = 0.0, $16 = 0.0, $160 = 0.0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0.0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0.0, $174 = 0.0, $175 = 0, $176 = 0, $177 = 0, $178 = 0.0, $179 = 0.0, $18 = 0.0, $180 = 0.0, $181 = 0.0, $182 = 0.0, $183 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0;
 var $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0.0, $5 = 0.0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0;
 var $6 = 0, $60 = 0.0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0, $67 = 0.0, $68 = 0.0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0, $86 = 0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0, $93 = 0.0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0.0, $ctx$idx$val = 0, $ctx$idx2$val = 0, $ctx$idx3$val = 0, $ctx$idx4$val = 0, $dx0$0 = 0.0, $dx_ext$0 = 0.0, $dx_ext$1 = 0.0, $dy0$0 = 0.0, $dy_ext$0 = 0.0, $dy_ext$1 = 0.0, $or$cond = 0, $or$cond1 = 0, $value$0 = 0.0, $value$1 = 0.0, $value$2 = 0.0, $value$3 = 0.0;
 var $xsb$0 = 0, $xsv_ext$0 = 0, $xsv_ext$1 = 0, $ysb$0 = 0, $ysv_ext$0 = 0, $ysv_ext$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x + $y;
 $1 = $0 * -0.211324865405187;
 $2 = $1 + $x;
 $3 = $1 + $y;
 $4 = (~~(($2)));
 $5 = (+($4|0));
 $6 = $5 > $2;
 $7 = $6 << 31 >> 31;
 $8 = (($7) + ($4))|0;
 $9 = (~~(($3)));
 $10 = (+($9|0));
 $11 = $10 > $3;
 $12 = $11 << 31 >> 31;
 $13 = (($12) + ($9))|0;
 $14 = (($8) + ($13))|0;
 $15 = (+($14|0));
 $16 = $15 * 0.36602540378443899;
 $17 = (+($8|0));
 $18 = $17 + $16;
 $19 = (+($13|0));
 $20 = $19 + $16;
 $21 = $2 - $17;
 $22 = $3 - $19;
 $23 = $21 + $22;
 $24 = $x - $18;
 $25 = $y - $20;
 $26 = $24 + -1.0;
 $27 = $26 + -0.36602540378443899;
 $28 = $25 + -0.36602540378443899;
 $29 = $27 * $27;
 $30 = 2.0 - $29;
 $31 = $28 * $28;
 $32 = $30 - $31;
 $33 = $32 > 0.0;
 if ($33) {
  $34 = $32 * $32;
  $35 = $34 * $34;
  $36 = (($8) + 1)|0;
  $ctx$idx4$val = HEAP32[$ctx>>2]|0;
  $37 = $36 & 255;
  $38 = (($ctx$idx4$val) + ($37<<1)|0);
  $39 = HEAP16[$38>>1]|0;
  $40 = $39&65535;
  $41 = (($40) + ($13))|0;
  $42 = $41 & 255;
  $43 = (($ctx$idx4$val) + ($42<<1)|0);
  $44 = HEAP16[$43>>1]|0;
  $45 = $44&65535;
  $46 = $45 & 14;
  $47 = (888 + ($46)|0);
  $48 = HEAP8[$47>>0]|0;
  $49 = (+($48<<24>>24));
  $50 = $27 * $49;
  $51 = $46 | 1;
  $52 = (888 + ($51)|0);
  $53 = HEAP8[$52>>0]|0;
  $54 = (+($53<<24>>24));
  $55 = $28 * $54;
  $56 = $50 + $55;
  $57 = $35 * $56;
  $58 = $57 + 0.0;
  $value$0 = $58;
 } else {
  $value$0 = 0.0;
 }
 $59 = $24 + -0.36602540378443899;
 $60 = $25 + -1.0;
 $61 = $60 + -0.36602540378443899;
 $62 = $59 * $59;
 $63 = 2.0 - $62;
 $64 = $61 * $61;
 $65 = $63 - $64;
 $66 = $65 > 0.0;
 if ($66) {
  $67 = $65 * $65;
  $68 = $67 * $67;
  $69 = (($13) + 1)|0;
  $ctx$idx3$val = HEAP32[$ctx>>2]|0;
  $70 = $8 & 255;
  $71 = (($ctx$idx3$val) + ($70<<1)|0);
  $72 = HEAP16[$71>>1]|0;
  $73 = $72&65535;
  $74 = (($69) + ($73))|0;
  $75 = $74 & 255;
  $76 = (($ctx$idx3$val) + ($75<<1)|0);
  $77 = HEAP16[$76>>1]|0;
  $78 = $77&65535;
  $79 = $78 & 14;
  $80 = (888 + ($79)|0);
  $81 = HEAP8[$80>>0]|0;
  $82 = (+($81<<24>>24));
  $83 = $59 * $82;
  $84 = $79 | 1;
  $85 = (888 + ($84)|0);
  $86 = HEAP8[$85>>0]|0;
  $87 = (+($86<<24>>24));
  $88 = $61 * $87;
  $89 = $83 + $88;
  $90 = $68 * $89;
  $91 = $value$0 + $90;
  $value$1 = $91;
 } else {
  $value$1 = $value$0;
 }
 $92 = !($23 <= 1.0);
 do {
  if ($92) {
   $107 = 2.0 - $23;
   $108 = $107 < $21;
   $109 = $107 < $22;
   $or$cond1 = $108 | $109;
   do {
    if ($or$cond1) {
     $110 = $21 > $22;
     if ($110) {
      $111 = (($8) + 2)|0;
      $112 = $24 + -2.0;
      $113 = $112 + -0.73205080756887797;
      $114 = $25 + 0.0;
      $115 = $114 + -0.73205080756887797;
      $dx_ext$0 = $113;$dy_ext$0 = $115;$xsv_ext$0 = $111;$ysv_ext$0 = $13;
      break;
     } else {
      $116 = (($13) + 2)|0;
      $117 = $24 + 0.0;
      $118 = $117 + -0.73205080756887797;
      $119 = $25 + -2.0;
      $120 = $119 + -0.73205080756887797;
      $dx_ext$0 = $118;$dy_ext$0 = $120;$xsv_ext$0 = $8;$ysv_ext$0 = $116;
      break;
     }
    } else {
     $dx_ext$0 = $24;$dy_ext$0 = $25;$xsv_ext$0 = $8;$ysv_ext$0 = $13;
    }
   } while(0);
   $121 = (($8) + 1)|0;
   $122 = (($13) + 1)|0;
   $123 = $26 + -0.73205080756887797;
   $124 = $60 + -0.73205080756887797;
   $dx0$0 = $123;$dx_ext$1 = $dx_ext$0;$dy0$0 = $124;$dy_ext$1 = $dy_ext$0;$xsb$0 = $121;$xsv_ext$1 = $xsv_ext$0;$ysb$0 = $122;$ysv_ext$1 = $ysv_ext$0;
  } else {
   $93 = 1.0 - $23;
   $94 = $93 > $21;
   $95 = $93 > $22;
   $or$cond = $94 | $95;
   if (!($or$cond)) {
    $103 = (($8) + 1)|0;
    $104 = (($13) + 1)|0;
    $105 = $26 + -0.73205080756887797;
    $106 = $60 + -0.73205080756887797;
    $dx0$0 = $24;$dx_ext$1 = $105;$dy0$0 = $25;$dy_ext$1 = $106;$xsb$0 = $8;$xsv_ext$1 = $103;$ysb$0 = $13;$ysv_ext$1 = $104;
    break;
   }
   $96 = $21 > $22;
   if ($96) {
    $97 = (($8) + 1)|0;
    $98 = (($13) + -1)|0;
    $99 = $25 + 1.0;
    $dx0$0 = $24;$dx_ext$1 = $26;$dy0$0 = $25;$dy_ext$1 = $99;$xsb$0 = $8;$xsv_ext$1 = $97;$ysb$0 = $13;$ysv_ext$1 = $98;
    break;
   } else {
    $100 = (($8) + -1)|0;
    $101 = (($13) + 1)|0;
    $102 = $24 + 1.0;
    $dx0$0 = $24;$dx_ext$1 = $102;$dy0$0 = $25;$dy_ext$1 = $60;$xsb$0 = $8;$xsv_ext$1 = $100;$ysb$0 = $13;$ysv_ext$1 = $101;
    break;
   }
  }
 } while(0);
 $125 = $dx0$0 * $dx0$0;
 $126 = 2.0 - $125;
 $127 = $dy0$0 * $dy0$0;
 $128 = $126 - $127;
 $129 = $128 > 0.0;
 if ($129) {
  $130 = $128 * $128;
  $131 = $130 * $130;
  $ctx$idx2$val = HEAP32[$ctx>>2]|0;
  $132 = $xsb$0 & 255;
  $133 = (($ctx$idx2$val) + ($132<<1)|0);
  $134 = HEAP16[$133>>1]|0;
  $135 = $134&65535;
  $136 = (($135) + ($ysb$0))|0;
  $137 = $136 & 255;
  $138 = (($ctx$idx2$val) + ($137<<1)|0);
  $139 = HEAP16[$138>>1]|0;
  $140 = $139&65535;
  $141 = $140 & 14;
  $142 = (888 + ($141)|0);
  $143 = HEAP8[$142>>0]|0;
  $144 = (+($143<<24>>24));
  $145 = $dx0$0 * $144;
  $146 = $141 | 1;
  $147 = (888 + ($146)|0);
  $148 = HEAP8[$147>>0]|0;
  $149 = (+($148<<24>>24));
  $150 = $dy0$0 * $149;
  $151 = $145 + $150;
  $152 = $131 * $151;
  $153 = $value$1 + $152;
  $value$2 = $153;
 } else {
  $value$2 = $value$1;
 }
 $154 = $dx_ext$1 * $dx_ext$1;
 $155 = 2.0 - $154;
 $156 = $dy_ext$1 * $dy_ext$1;
 $157 = $155 - $156;
 $158 = $157 > 0.0;
 if (!($158)) {
  $value$3 = $value$2;
  $183 = $value$3 / 47.0;
  return (+$183);
 }
 $159 = $157 * $157;
 $160 = $159 * $159;
 $ctx$idx$val = HEAP32[$ctx>>2]|0;
 $161 = $xsv_ext$1 & 255;
 $162 = (($ctx$idx$val) + ($161<<1)|0);
 $163 = HEAP16[$162>>1]|0;
 $164 = $163&65535;
 $165 = (($164) + ($ysv_ext$1))|0;
 $166 = $165 & 255;
 $167 = (($ctx$idx$val) + ($166<<1)|0);
 $168 = HEAP16[$167>>1]|0;
 $169 = $168&65535;
 $170 = $169 & 14;
 $171 = (888 + ($170)|0);
 $172 = HEAP8[$171>>0]|0;
 $173 = (+($172<<24>>24));
 $174 = $dx_ext$1 * $173;
 $175 = $170 | 1;
 $176 = (888 + ($175)|0);
 $177 = HEAP8[$176>>0]|0;
 $178 = (+($177<<24>>24));
 $179 = $dy_ext$1 * $178;
 $180 = $174 + $179;
 $181 = $160 * $180;
 $182 = $value$2 + $181;
 $value$3 = $182;
 $183 = $value$3 / 47.0;
 return (+$183);
}
function _open_simplex_noise3($ctx,$x,$y,$z) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 $z = +$z;
 var $$ = 0, $$10 = 0, $$11 = 0, $$12 = 0.0, $$13 = 0.0, $$18 = 0.0, $$19 = 0, $$20 = 0.0, $$21 = 0, $$4 = 0, $$5 = 0.0, $$6 = 0.0, $$bIsFurtherSide$0 = 0, $$bIsFurtherSide$023 = 0, $$bPoint25$0 = 0, $$bPoint25$022 = 0, $$sink = 0, $$sink1 = 0, $0 = 0.0, $1 = 0.0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0.0, $117 = 0.0;
 var $118 = 0, $119 = 0, $12 = 0.0, $120 = 0, $121 = 0.0, $122 = 0.0, $123 = 0.0, $124 = 0, $125 = 0, $126 = 0, $127 = 0.0, $128 = 0.0, $129 = 0.0, $13 = 0, $130 = 0.0, $131 = 0.0, $132 = 0.0, $133 = 0.0, $134 = 0.0, $135 = 0.0;
 var $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0.0, $142 = 0, $143 = 0.0, $144 = 0.0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0.0, $163 = 0.0, $164 = 0, $165 = 0, $166 = 0, $167 = 0.0, $168 = 0.0, $169 = 0.0, $17 = 0.0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0.0, $174 = 0.0, $175 = 0.0, $176 = 0.0, $177 = 0.0, $178 = 0.0, $179 = 0.0, $18 = 0, $180 = 0.0, $181 = 0.0, $182 = 0.0, $183 = 0.0, $184 = 0.0, $185 = 0.0, $186 = 0, $187 = 0.0, $188 = 0.0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0.0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0.0, $207 = 0.0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0.0, $212 = 0.0, $213 = 0.0, $214 = 0, $215 = 0, $216 = 0, $217 = 0.0, $218 = 0.0, $219 = 0.0, $22 = 0, $220 = 0.0, $221 = 0.0, $222 = 0.0, $223 = 0.0, $224 = 0.0, $225 = 0.0;
 var $226 = 0.0, $227 = 0, $228 = 0.0, $229 = 0.0, $23 = 0.0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0.0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0.0, $248 = 0.0, $249 = 0, $25 = 0.0, $250 = 0, $251 = 0, $252 = 0.0, $253 = 0.0, $254 = 0.0, $255 = 0, $256 = 0, $257 = 0, $258 = 0.0, $259 = 0.0, $26 = 0.0, $260 = 0.0, $261 = 0.0;
 var $262 = 0.0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0.0, $269 = 0, $27 = 0.0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0.0, $278 = 0.0, $279 = 0.0, $28 = 0.0;
 var $280 = 0.0, $281 = 0.0, $282 = 0, $283 = 0, $284 = 0, $285 = 0.0, $286 = 0.0, $287 = 0, $288 = 0.0, $289 = 0.0, $29 = 0.0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0.0, $295 = 0.0, $296 = 0.0, $297 = 0.0, $298 = 0.0;
 var $299 = 0, $3 = 0.0, $30 = 0.0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0.0, $306 = 0.0, $307 = 0, $308 = 0, $309 = 0, $31 = 0.0, $310 = 0, $311 = 0.0, $312 = 0.0, $313 = 0, $314 = 0, $315 = 0;
 var $316 = 0, $317 = 0.0, $318 = 0.0, $319 = 0.0, $32 = 0.0, $320 = 0.0, $321 = 0.0, $322 = 0.0, $323 = 0.0, $324 = 0.0, $325 = 0.0, $326 = 0.0, $327 = 0.0, $328 = 0.0, $329 = 0.0, $33 = 0.0, $330 = 0.0, $331 = 0.0, $332 = 0.0, $333 = 0.0;
 var $334 = 0, $335 = 0.0, $336 = 0.0, $337 = 0, $338 = 0, $339 = 0, $34 = 0.0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0.0, $350 = 0, $351 = 0;
 var $352 = 0, $353 = 0, $354 = 0, $355 = 0.0, $356 = 0.0, $357 = 0, $358 = 0, $359 = 0, $36 = 0.0, $360 = 0.0, $361 = 0.0, $362 = 0.0, $363 = 0, $364 = 0, $365 = 0, $366 = 0.0, $367 = 0.0, $368 = 0.0, $369 = 0.0, $37 = 0.0;
 var $370 = 0.0, $371 = 0.0, $372 = 0.0, $373 = 0.0, $374 = 0.0, $375 = 0.0, $376 = 0.0, $377 = 0.0, $378 = 0, $379 = 0.0, $38 = 0.0, $380 = 0.0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0;
 var $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0.0, $4 = 0.0, $40 = 0, $400 = 0.0, $401 = 0, $402 = 0, $403 = 0, $404 = 0.0, $405 = 0.0;
 var $406 = 0.0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0.0, $411 = 0.0, $412 = 0.0, $413 = 0.0, $414 = 0.0, $415 = 0.0, $416 = 0.0, $417 = 0.0, $418 = 0.0, $419 = 0.0, $42 = 0, $420 = 0, $421 = 0.0, $422 = 0.0, $423 = 0;
 var $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0.0, $440 = 0, $441 = 0.0;
 var $442 = 0.0, $443 = 0, $444 = 0, $445 = 0, $446 = 0.0, $447 = 0.0, $448 = 0.0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0.0, $453 = 0.0, $454 = 0.0, $455 = 0.0, $456 = 0.0, $457 = 0.0, $458 = 0.0, $459 = 0.0, $46 = 0;
 var $460 = 0.0, $461 = 0.0, $462 = 0.0, $463 = 0.0, $464 = 0.0, $465 = 0.0, $466 = 0, $467 = 0.0, $468 = 0.0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0;
 var $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0.0, $489 = 0.0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0.0, $494 = 0.0, $495 = 0.0, $496 = 0;
 var $497 = 0, $498 = 0, $499 = 0.0, $5 = 0.0, $50 = 0, $500 = 0.0, $501 = 0.0, $502 = 0.0, $503 = 0.0, $504 = 0, $505 = 0.0, $506 = 0.0, $507 = 0.0, $508 = 0, $509 = 0.0, $51 = 0, $510 = 0.0, $511 = 0.0, $512 = 0, $513 = 0.0;
 var $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0.0, $519 = 0, $52 = 0.0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0.0, $526 = 0.0, $527 = 0.0, $528 = 0.0, $529 = 0.0, $53 = 0, $530 = 0.0, $531 = 0;
 var $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0.0, $539 = 0.0, $54 = 0.0, $540 = 0.0, $541 = 0.0, $542 = 0, $543 = 0, $544 = 0, $545 = 0.0, $546 = 0.0, $547 = 0.0, $548 = 0.0, $549 = 0, $55 = 0;
 var $550 = 0.0, $551 = 0.0, $552 = 0.0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0.0, $559 = 0.0, $56 = 0, $560 = 0.0, $561 = 0.0, $562 = 0.0, $563 = 0.0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0;
 var $569 = 0.0, $57 = 0, $570 = 0.0, $571 = 0.0, $572 = 0.0, $573 = 0.0, $574 = 0.0, $575 = 0, $576 = 0, $577 = 0, $578 = 0.0, $579 = 0.0, $58 = 0.0, $580 = 0.0, $581 = 0.0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0;
 var $587 = 0, $588 = 0.0, $589 = 0.0, $59 = 0, $590 = 0.0, $591 = 0.0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0.0, $598 = 0.0, $599 = 0.0, $6 = 0, $60 = 0.0, $600 = 0.0, $601 = 0, $602 = 0, $603 = 0;
 var $604 = 0.0, $605 = 0.0, $606 = 0, $607 = 0, $608 = 0, $609 = 0.0, $61 = 0, $610 = 0.0, $611 = 0.0, $612 = 0, $613 = 0, $614 = 0, $615 = 0.0, $616 = 0, $617 = 0, $618 = 0, $619 = 0.0, $62 = 0, $620 = 0, $621 = 0.0;
 var $622 = 0, $623 = 0.0, $624 = 0.0, $625 = 0.0, $626 = 0.0, $627 = 0.0, $628 = 0.0, $629 = 0.0, $63 = 0, $630 = 0.0, $631 = 0.0, $632 = 0.0, $633 = 0, $634 = 0.0, $635 = 0.0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0.0;
 var $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0.0, $654 = 0.0, $655 = 0, $656 = 0, $657 = 0, $658 = 0.0;
 var $659 = 0.0, $66 = 0.0, $660 = 0.0, $661 = 0, $662 = 0, $663 = 0, $664 = 0.0, $665 = 0.0, $666 = 0.0, $667 = 0.0, $668 = 0.0, $669 = 0.0, $67 = 0, $670 = 0.0, $671 = 0.0, $672 = 0.0, $673 = 0.0, $674 = 0.0, $675 = 0.0, $676 = 0.0;
 var $677 = 0, $678 = 0.0, $679 = 0.0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0;
 var $695 = 0, $696 = 0, $697 = 0.0, $698 = 0.0, $699 = 0, $7 = 0.0, $70 = 0, $700 = 0, $701 = 0, $702 = 0.0, $703 = 0.0, $704 = 0.0, $705 = 0, $706 = 0, $707 = 0, $708 = 0.0, $709 = 0.0, $71 = 0, $710 = 0.0, $711 = 0.0;
 var $712 = 0.0, $713 = 0.0, $714 = 0.0, $715 = 0.0, $716 = 0.0, $717 = 0.0, $718 = 0, $719 = 0.0, $72 = 0.0, $720 = 0.0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0;
 var $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0.0, $739 = 0.0, $74 = 0.0, $740 = 0, $741 = 0, $742 = 0, $743 = 0.0, $744 = 0.0, $745 = 0.0, $746 = 0, $747 = 0, $748 = 0;
 var $749 = 0.0, $75 = 0, $750 = 0.0, $751 = 0.0, $752 = 0.0, $753 = 0.0, $754 = 0.0, $755 = 0.0, $756 = 0.0, $757 = 0.0, $758 = 0.0, $759 = 0.0, $76 = 0, $760 = 0.0, $761 = 0.0, $762 = 0.0, $763 = 0, $764 = 0.0, $765 = 0.0, $766 = 0;
 var $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0.0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0.0;
 var $785 = 0.0, $786 = 0, $787 = 0, $788 = 0, $789 = 0.0, $79 = 0, $790 = 0.0, $791 = 0.0, $792 = 0, $793 = 0, $794 = 0, $795 = 0.0, $796 = 0.0, $797 = 0.0, $798 = 0.0, $799 = 0.0, $8 = 0, $80 = 0.0, $800 = 0.0, $801 = 0.0;
 var $802 = 0.0, $803 = 0.0, $804 = 0.0, $805 = 0.0, $806 = 0, $807 = 0.0, $808 = 0.0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0;
 var $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0.0, $828 = 0.0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0.0, $833 = 0.0, $834 = 0.0, $835 = 0, $836 = 0, $837 = 0, $838 = 0.0;
 var $839 = 0.0, $84 = 0.0, $840 = 0.0, $841 = 0.0, $842 = 0.0, $843 = 0.0, $844 = 0.0, $845 = 0.0, $846 = 0.0, $847 = 0.0, $848 = 0, $849 = 0.0, $85 = 0.0, $850 = 0.0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0;
 var $857 = 0, $858 = 0, $859 = 0, $86 = 0.0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0.0, $87 = 0, $870 = 0.0, $871 = 0, $872 = 0, $873 = 0, $874 = 0.0;
 var $875 = 0.0, $876 = 0.0, $877 = 0, $878 = 0, $879 = 0, $88 = 0.0, $880 = 0.0, $881 = 0.0, $882 = 0.0, $883 = 0.0, $884 = 0.0, $885 = 0.0, $886 = 0.0, $887 = 0.0, $888 = 0.0, $889 = 0.0, $89 = 0.0, $890 = 0.0, $891 = 0, $892 = 0.0;
 var $893 = 0.0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0.0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0.0;
 var $910 = 0.0, $911 = 0.0, $912 = 0, $913 = 0, $914 = 0, $915 = 0.0, $916 = 0.0, $917 = 0.0, $918 = 0, $919 = 0, $92 = 0.0, $920 = 0, $921 = 0.0, $922 = 0.0, $923 = 0.0, $924 = 0.0, $925 = 0.0, $926 = 0.0, $927 = 0.0, $928 = 0.0;
 var $929 = 0.0, $93 = 0.0, $930 = 0.0, $931 = 0.0, $932 = 0, $933 = 0.0, $934 = 0.0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0.0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0;
 var $947 = 0, $948 = 0, $949 = 0, $95 = 0.0, $950 = 0, $951 = 0.0, $952 = 0.0, $953 = 0, $954 = 0, $955 = 0, $956 = 0.0, $957 = 0.0, $958 = 0.0, $959 = 0, $96 = 0.0, $960 = 0, $961 = 0, $962 = 0.0, $963 = 0.0, $964 = 0.0;
 var $965 = 0.0, $966 = 0.0, $967 = 0.0, $97 = 0, $98 = 0.0, $99 = 0.0, $aIsFurtherSide$0 = 0, $aIsFurtherSide$1 = 0, $aPoint$0 = 0, $aPoint2$0 = 0, $aPoint23$0 = 0, $aPoint23$1 = 0, $aPoint23$1$bPoint25$1 = 0, $aScore$0 = 0.0, $aScore22$0 = 0.0, $aScore3$0 = 0.0, $bIsFurtherSide$0 = 0, $bIsFurtherSide$1 = 0, $bPoint$0 = 0, $bPoint25$0 = 0;
 var $bPoint25$1 = 0, $bPoint25$1$aPoint23$1 = 0, $bPoint4$0 = 0, $bScore$0 = 0.0, $bScore24$0 = 0.0, $bScore5$0 = 0.0, $ctx$idx$val = 0, $ctx$idx24 = 0, $ctx$idx24$val = 0, $ctx$idx25$val = 0, $ctx$idx26 = 0, $ctx$idx26$val = 0, $ctx$idx27$val = 0, $ctx$idx28 = 0, $ctx$idx28$val = 0, $ctx$idx29$val = 0, $ctx$idx30 = 0, $ctx$idx30$val = 0, $ctx$idx31$val = 0, $ctx$idx32 = 0;
 var $ctx$idx32$val = 0, $ctx$idx33$val = 0, $ctx$idx34 = 0, $ctx$idx34$val = 0, $ctx$idx35$val = 0, $ctx$idx36 = 0, $ctx$idx36$val = 0, $ctx$idx37$val = 0, $ctx$idx38 = 0, $ctx$idx38$val = 0, $ctx$idx39$val = 0, $ctx$idx40 = 0, $ctx$idx40$val = 0, $ctx$idx41$val = 0, $ctx$idx42 = 0, $ctx$idx42$val = 0, $ctx$idx43$val = 0, $ctx$idx44 = 0, $ctx$idx44$val = 0, $ctx$idx45$val = 0;
 var $ctx$idx46 = 0, $ctx$idx46$val = 0, $ctx$idx47$val = 0, $ctx$idx48 = 0, $ctx$idx48$val = 0, $ctx$idx49$val = 0, $ctx$idx50 = 0, $ctx$idx50$val = 0, $ctx$idx51$val = 0, $ctx$idx52 = 0, $ctx$idx52$val = 0, $ctx$idx53$val = 0, $ctx$idx54 = 0, $ctx$idx54$val = 0, $dx_ext0$0 = 0.0, $dx_ext0$1 = 0.0, $dx_ext0$1$in = 0.0, $dx_ext0$2 = 0.0, $dx_ext0$3 = 0.0, $dx_ext0$4 = 0.0;
 var $dx_ext0$4$in = 0.0, $dx_ext0$5 = 0.0, $dx_ext0$6 = 0.0, $dx_ext0$7 = 0.0, $dx_ext0$8 = 0.0, $dx_ext1$0 = 0.0, $dx_ext1$1 = 0.0, $dx_ext1$1$in = 0.0, $dx_ext1$2 = 0.0, $dx_ext1$3 = 0.0, $dx_ext1$4 = 0.0, $dx_ext1$4$in = 0.0, $dx_ext1$5 = 0.0, $dx_ext1$6 = 0.0, $dx_ext1$7 = 0.0, $dy_ext0$0 = 0.0, $dy_ext0$1 = 0.0, $dy_ext0$1$in = 0.0, $dy_ext0$2 = 0.0, $dy_ext0$3 = 0.0;
 var $dy_ext0$4 = 0.0, $dy_ext0$4$in = 0.0, $dy_ext0$5 = 0.0, $dy_ext0$6 = 0.0, $dy_ext0$6$in = 0.0, $dy_ext0$7 = 0.0, $dy_ext0$8 = 0.0, $dy_ext1$0 = 0.0, $dy_ext1$1 = 0.0, $dy_ext1$1$in = 0.0, $dy_ext1$2 = 0.0, $dy_ext1$3 = 0.0, $dy_ext1$4 = 0.0, $dy_ext1$4$in = 0.0, $dy_ext1$5 = 0.0, $dy_ext1$6 = 0.0, $dy_ext1$7 = 0.0, $dz_ext0$0 = 0.0, $dz_ext0$1 = 0.0, $dz_ext0$2 = 0.0;
 var $dz_ext0$2$in = 0.0, $dz_ext0$3 = 0.0, $dz_ext0$4 = 0.0, $dz_ext1$0 = 0.0, $dz_ext1$1 = 0.0, $dz_ext1$2 = 0.0, $dz_ext1$3 = 0.0, $or$cond = 0, $or$cond14 = 0, $or$cond15 = 0, $or$cond16 = 0, $or$cond17 = 0, $or$cond2 = 0, $or$cond3 = 0, $or$cond7 = 0, $or$cond8 = 0, $or$cond9 = 0, $value$0 = 0.0, $value$1 = 0.0, $value$10 = 0.0;
 var $value$11 = 0.0, $value$12 = 0.0, $value$13 = 0.0, $value$2 = 0.0, $value$3 = 0.0, $value$4 = 0.0, $value$5 = 0.0, $value$6 = 0.0, $value$7 = 0.0, $value$8 = 0.0, $value$9 = 0.0, $xsv_ext0$0 = 0, $xsv_ext0$1 = 0, $xsv_ext0$2 = 0, $xsv_ext0$3 = 0, $xsv_ext0$4 = 0, $xsv_ext0$5 = 0, $xsv_ext0$6 = 0, $xsv_ext0$7 = 0, $xsv_ext0$8 = 0;
 var $xsv_ext1$0 = 0, $xsv_ext1$1 = 0, $xsv_ext1$2 = 0, $xsv_ext1$3 = 0, $xsv_ext1$4 = 0, $xsv_ext1$5 = 0, $xsv_ext1$6 = 0, $xsv_ext1$7 = 0, $ysv_ext0$0 = 0, $ysv_ext0$1 = 0, $ysv_ext0$2 = 0, $ysv_ext0$3 = 0, $ysv_ext0$4 = 0, $ysv_ext0$5 = 0, $ysv_ext0$6 = 0, $ysv_ext0$7 = 0, $ysv_ext0$8 = 0, $ysv_ext1$0 = 0, $ysv_ext1$1 = 0, $ysv_ext1$2 = 0;
 var $ysv_ext1$3 = 0, $ysv_ext1$4 = 0, $ysv_ext1$5 = 0, $ysv_ext1$6 = 0, $ysv_ext1$7 = 0, $zsv_ext0$0 = 0, $zsv_ext0$1 = 0, $zsv_ext0$2 = 0, $zsv_ext0$3 = 0, $zsv_ext0$4 = 0, $zsv_ext1$0 = 0, $zsv_ext1$1 = 0, $zsv_ext1$2 = 0, $zsv_ext1$3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x + $y;
 $1 = $0 + $z;
 $2 = $1 * -0.16666666666666666;
 $3 = $2 + $x;
 $4 = $2 + $y;
 $5 = $2 + $z;
 $6 = (~~(($3)));
 $7 = (+($6|0));
 $8 = $7 > $3;
 $9 = $8 << 31 >> 31;
 $10 = (($9) + ($6))|0;
 $11 = (~~(($4)));
 $12 = (+($11|0));
 $13 = $12 > $4;
 $14 = $13 << 31 >> 31;
 $15 = (($14) + ($11))|0;
 $16 = (~~(($5)));
 $17 = (+($16|0));
 $18 = $17 > $5;
 $19 = $18 << 31 >> 31;
 $20 = (($19) + ($16))|0;
 $21 = (($10) + ($15))|0;
 $22 = (($21) + ($20))|0;
 $23 = (+($22|0));
 $24 = $23 * 0.33333333333333331;
 $25 = (+($10|0));
 $26 = $25 + $24;
 $27 = (+($15|0));
 $28 = $27 + $24;
 $29 = (+($20|0));
 $30 = $29 + $24;
 $31 = $3 - $25;
 $32 = $4 - $27;
 $33 = $5 - $29;
 $34 = $31 + $32;
 $35 = $33 + $34;
 $36 = $x - $26;
 $37 = $y - $28;
 $38 = $z - $30;
 $39 = !($35 <= 1.0);
 do {
  if ($39) {
   $263 = !($35 >= 2.0);
   if (!($263)) {
    $264 = $31 <= $32;
    $265 = $33 < $32;
    $or$cond7 = $264 & $265;
    if ($or$cond7) {
     $aPoint2$0 = 6;$aScore3$0 = $31;$bPoint4$0 = 3;$bScore5$0 = $33;
    } else {
     $266 = $31 > $32;
     $267 = $33 < $31;
     $or$cond8 = $266 & $267;
     $$20 = $or$cond8 ? $33 : $31;
     $$21 = $or$cond8 ? 3 : 6;
     $aPoint2$0 = $$21;$aScore3$0 = $$20;$bPoint4$0 = 5;$bScore5$0 = $32;
    }
    $268 = 3.0 - $35;
    $269 = $268 < $aScore3$0;
    $270 = $268 < $bScore5$0;
    $or$cond9 = $270 | $269;
    do {
     if ($or$cond9) {
      $271 = $bScore5$0 < $aScore3$0;
      $$sink1 = $271 ? $bPoint4$0 : $aPoint2$0;
      $272 = $$sink1&255;
      $273 = $272 & 1;
      $274 = ($273|0)!=(0);
      if ($274) {
       $275 = (($10) + 2)|0;
       $276 = (($10) + 1)|0;
       $277 = $36 + -2.0;
       $278 = $277 + -1.0;
       $279 = $36 + -1.0;
       $280 = $279 + -1.0;
       $dx_ext0$3 = $278;$dx_ext1$3 = $280;$xsv_ext0$3 = $275;$xsv_ext1$3 = $276;
      } else {
       $281 = $36 + -1.0;
       $dx_ext0$3 = $281;$dx_ext1$3 = $281;$xsv_ext0$3 = $10;$xsv_ext1$3 = $10;
      }
      $282 = $272 & 2;
      $283 = ($282|0)==(0);
      if ($283) {
       $289 = $37 + -1.0;
       $dy_ext0$3 = $289;$dy_ext1$3 = $289;$ysv_ext0$3 = $15;$ysv_ext1$3 = $15;
      } else {
       $284 = (($15) + 1)|0;
       $285 = $37 + -1.0;
       $286 = $285 + -1.0;
       $287 = (($15) + 2)|0;
       $288 = $286 + -1.0;
       $$10 = $274 ? $287 : $284;
       $$11 = $274 ? $284 : $287;
       $$12 = $274 ? $288 : $286;
       $$13 = $274 ? $286 : $288;
       $dy_ext0$3 = $$13;$dy_ext1$3 = $$12;$ysv_ext0$3 = $$11;$ysv_ext1$3 = $$10;
      }
      $290 = $272 & 4;
      $291 = ($290|0)==(0);
      if ($291) {
       $298 = $38 + -1.0;
       $dx_ext0$5 = $dx_ext0$3;$dx_ext1$5 = $dx_ext1$3;$dy_ext0$5 = $dy_ext0$3;$dy_ext1$5 = $dy_ext1$3;$dz_ext0$1 = $298;$dz_ext1$1 = $298;$xsv_ext0$5 = $xsv_ext0$3;$xsv_ext1$5 = $xsv_ext1$3;$ysv_ext0$5 = $ysv_ext0$3;$ysv_ext1$5 = $ysv_ext1$3;$zsv_ext0$1 = $20;$zsv_ext1$1 = $20;
       break;
      } else {
       $292 = (($20) + 1)|0;
       $293 = (($20) + 2)|0;
       $294 = $38 + -1.0;
       $295 = $294 + -1.0;
       $296 = $38 + -2.0;
       $297 = $296 + -1.0;
       $dx_ext0$5 = $dx_ext0$3;$dx_ext1$5 = $dx_ext1$3;$dy_ext0$5 = $dy_ext0$3;$dy_ext1$5 = $dy_ext1$3;$dz_ext0$1 = $295;$dz_ext1$1 = $297;$xsv_ext0$5 = $xsv_ext0$3;$xsv_ext1$5 = $xsv_ext1$3;$ysv_ext0$5 = $ysv_ext0$3;$ysv_ext1$5 = $ysv_ext1$3;$zsv_ext0$1 = $292;$zsv_ext1$1 = $293;
       break;
      }
     } else {
      $299 = $aPoint2$0 & $bPoint4$0;
      $300 = $299&255;
      $301 = $300 & 1;
      $302 = ($301|0)==(0);
      if ($302) {
       $dx_ext0$4$in = $36;$dx_ext1$4$in = $36;$xsv_ext0$4 = $10;$xsv_ext1$4 = $10;
      } else {
       $303 = (($10) + 1)|0;
       $304 = (($10) + 2)|0;
       $305 = $36 + -1.0;
       $306 = $36 + -2.0;
       $dx_ext0$4$in = $305;$dx_ext1$4$in = $306;$xsv_ext0$4 = $303;$xsv_ext1$4 = $304;
      }
      $dx_ext1$4 = $dx_ext1$4$in + -0.66666666666666663;
      $dx_ext0$4 = $dx_ext0$4$in + -0.33333333333333331;
      $307 = $300 & 2;
      $308 = ($307|0)==(0);
      if ($308) {
       $dy_ext0$4$in = $37;$dy_ext1$4$in = $37;$ysv_ext0$4 = $15;$ysv_ext1$4 = $15;
      } else {
       $309 = (($15) + 1)|0;
       $310 = (($15) + 2)|0;
       $311 = $37 + -1.0;
       $312 = $37 + -2.0;
       $dy_ext0$4$in = $311;$dy_ext1$4$in = $312;$ysv_ext0$4 = $309;$ysv_ext1$4 = $310;
      }
      $dy_ext1$4 = $dy_ext1$4$in + -0.66666666666666663;
      $dy_ext0$4 = $dy_ext0$4$in + -0.33333333333333331;
      $313 = $300 & 4;
      $314 = ($313|0)==(0);
      if ($314) {
       $321 = $38 + -0.33333333333333331;
       $322 = $38 + -0.66666666666666663;
       $dx_ext0$5 = $dx_ext0$4;$dx_ext1$5 = $dx_ext1$4;$dy_ext0$5 = $dy_ext0$4;$dy_ext1$5 = $dy_ext1$4;$dz_ext0$1 = $321;$dz_ext1$1 = $322;$xsv_ext0$5 = $xsv_ext0$4;$xsv_ext1$5 = $xsv_ext1$4;$ysv_ext0$5 = $ysv_ext0$4;$ysv_ext1$5 = $ysv_ext1$4;$zsv_ext0$1 = $20;$zsv_ext1$1 = $20;
       break;
      } else {
       $315 = (($20) + 1)|0;
       $316 = (($20) + 2)|0;
       $317 = $38 + -1.0;
       $318 = $317 + -0.33333333333333331;
       $319 = $38 + -2.0;
       $320 = $319 + -0.66666666666666663;
       $dx_ext0$5 = $dx_ext0$4;$dx_ext1$5 = $dx_ext1$4;$dy_ext0$5 = $dy_ext0$4;$dy_ext1$5 = $dy_ext1$4;$dz_ext0$1 = $318;$dz_ext1$1 = $320;$xsv_ext0$5 = $xsv_ext0$4;$xsv_ext1$5 = $xsv_ext1$4;$ysv_ext0$5 = $ysv_ext0$4;$ysv_ext1$5 = $ysv_ext1$4;$zsv_ext0$1 = $315;$zsv_ext1$1 = $316;
       break;
      }
     }
    } while(0);
    $323 = $36 + -1.0;
    $324 = $323 + -0.66666666666666663;
    $325 = $37 + -1.0;
    $326 = $325 + -0.66666666666666663;
    $327 = $38 + -0.66666666666666663;
    $328 = $324 * $324;
    $329 = 2.0 - $328;
    $330 = $326 * $326;
    $331 = $329 - $330;
    $332 = $327 * $327;
    $333 = $331 - $332;
    $334 = $333 > 0.0;
    if ($334) {
     $335 = $333 * $333;
     $336 = $335 * $335;
     $337 = (($10) + 1)|0;
     $338 = (($15) + 1)|0;
     $ctx$idx45$val = HEAP32[$ctx>>2]|0;
     $ctx$idx46 = ((($ctx)) + 4|0);
     $ctx$idx46$val = HEAP32[$ctx$idx46>>2]|0;
     $339 = $337 & 255;
     $340 = (($ctx$idx45$val) + ($339<<1)|0);
     $341 = HEAP16[$340>>1]|0;
     $342 = $341&65535;
     $343 = (($338) + ($342))|0;
     $344 = $343 & 255;
     $345 = (($ctx$idx45$val) + ($344<<1)|0);
     $346 = HEAP16[$345>>1]|0;
     $347 = $346&65535;
     $348 = (($347) + ($20))|0;
     $349 = $348 & 255;
     $350 = (($ctx$idx46$val) + ($349<<1)|0);
     $351 = HEAP16[$350>>1]|0;
     $352 = $351 << 16 >> 16;
     $353 = (904 + ($352)|0);
     $354 = HEAP8[$353>>0]|0;
     $355 = (+($354<<24>>24));
     $356 = $324 * $355;
     $357 = (($352) + 1)|0;
     $358 = (904 + ($357)|0);
     $359 = HEAP8[$358>>0]|0;
     $360 = (+($359<<24>>24));
     $361 = $326 * $360;
     $362 = $356 + $361;
     $363 = (($352) + 2)|0;
     $364 = (904 + ($363)|0);
     $365 = HEAP8[$364>>0]|0;
     $366 = (+($365<<24>>24));
     $367 = $327 * $366;
     $368 = $362 + $367;
     $369 = $336 * $368;
     $370 = $369 + 0.0;
     $value$3 = $370;
    } else {
     $value$3 = 0.0;
    }
    $371 = $37 + -0.66666666666666663;
    $372 = $38 + -1.0;
    $373 = $372 + -0.66666666666666663;
    $374 = $371 * $371;
    $375 = $329 - $374;
    $376 = $373 * $373;
    $377 = $375 - $376;
    $378 = $377 > 0.0;
    if ($378) {
     $379 = $377 * $377;
     $380 = $379 * $379;
     $381 = (($10) + 1)|0;
     $382 = (($20) + 1)|0;
     $ctx$idx43$val = HEAP32[$ctx>>2]|0;
     $ctx$idx44 = ((($ctx)) + 4|0);
     $ctx$idx44$val = HEAP32[$ctx$idx44>>2]|0;
     $383 = $381 & 255;
     $384 = (($ctx$idx43$val) + ($383<<1)|0);
     $385 = HEAP16[$384>>1]|0;
     $386 = $385&65535;
     $387 = (($386) + ($15))|0;
     $388 = $387 & 255;
     $389 = (($ctx$idx43$val) + ($388<<1)|0);
     $390 = HEAP16[$389>>1]|0;
     $391 = $390&65535;
     $392 = (($382) + ($391))|0;
     $393 = $392 & 255;
     $394 = (($ctx$idx44$val) + ($393<<1)|0);
     $395 = HEAP16[$394>>1]|0;
     $396 = $395 << 16 >> 16;
     $397 = (904 + ($396)|0);
     $398 = HEAP8[$397>>0]|0;
     $399 = (+($398<<24>>24));
     $400 = $324 * $399;
     $401 = (($396) + 1)|0;
     $402 = (904 + ($401)|0);
     $403 = HEAP8[$402>>0]|0;
     $404 = (+($403<<24>>24));
     $405 = $371 * $404;
     $406 = $400 + $405;
     $407 = (($396) + 2)|0;
     $408 = (904 + ($407)|0);
     $409 = HEAP8[$408>>0]|0;
     $410 = (+($409<<24>>24));
     $411 = $373 * $410;
     $412 = $406 + $411;
     $413 = $380 * $412;
     $414 = $value$3 + $413;
     $value$4 = $414;
    } else {
     $value$4 = $value$3;
    }
    $415 = $36 + -0.66666666666666663;
    $416 = $415 * $415;
    $417 = 2.0 - $416;
    $418 = $417 - $330;
    $419 = $418 - $376;
    $420 = $419 > 0.0;
    if ($420) {
     $421 = $419 * $419;
     $422 = $421 * $421;
     $423 = (($15) + 1)|0;
     $424 = (($20) + 1)|0;
     $ctx$idx41$val = HEAP32[$ctx>>2]|0;
     $ctx$idx42 = ((($ctx)) + 4|0);
     $ctx$idx42$val = HEAP32[$ctx$idx42>>2]|0;
     $425 = $10 & 255;
     $426 = (($ctx$idx41$val) + ($425<<1)|0);
     $427 = HEAP16[$426>>1]|0;
     $428 = $427&65535;
     $429 = (($423) + ($428))|0;
     $430 = $429 & 255;
     $431 = (($ctx$idx41$val) + ($430<<1)|0);
     $432 = HEAP16[$431>>1]|0;
     $433 = $432&65535;
     $434 = (($424) + ($433))|0;
     $435 = $434 & 255;
     $436 = (($ctx$idx42$val) + ($435<<1)|0);
     $437 = HEAP16[$436>>1]|0;
     $438 = $437 << 16 >> 16;
     $439 = (904 + ($438)|0);
     $440 = HEAP8[$439>>0]|0;
     $441 = (+($440<<24>>24));
     $442 = $415 * $441;
     $443 = (($438) + 1)|0;
     $444 = (904 + ($443)|0);
     $445 = HEAP8[$444>>0]|0;
     $446 = (+($445<<24>>24));
     $447 = $326 * $446;
     $448 = $442 + $447;
     $449 = (($438) + 2)|0;
     $450 = (904 + ($449)|0);
     $451 = HEAP8[$450>>0]|0;
     $452 = (+($451<<24>>24));
     $453 = $373 * $452;
     $454 = $448 + $453;
     $455 = $422 * $454;
     $456 = $value$4 + $455;
     $value$5 = $456;
    } else {
     $value$5 = $value$4;
    }
    $457 = $323 + -1.0;
    $458 = $325 + -1.0;
    $459 = $372 + -1.0;
    $460 = $457 * $457;
    $461 = 2.0 - $460;
    $462 = $458 * $458;
    $463 = $461 - $462;
    $464 = $459 * $459;
    $465 = $463 - $464;
    $466 = $465 > 0.0;
    if (!($466)) {
     $dx_ext0$8 = $dx_ext0$5;$dx_ext1$7 = $dx_ext1$5;$dy_ext0$8 = $dy_ext0$5;$dy_ext1$7 = $dy_ext1$5;$dz_ext0$4 = $dz_ext0$1;$dz_ext1$3 = $dz_ext1$1;$value$11 = $value$5;$xsv_ext0$8 = $xsv_ext0$5;$xsv_ext1$7 = $xsv_ext1$5;$ysv_ext0$8 = $ysv_ext0$5;$ysv_ext1$7 = $ysv_ext1$5;$zsv_ext0$4 = $zsv_ext0$1;$zsv_ext1$3 = $zsv_ext1$1;
     break;
    }
    $467 = $465 * $465;
    $468 = $467 * $467;
    $469 = (($10) + 1)|0;
    $470 = (($15) + 1)|0;
    $471 = (($20) + 1)|0;
    $ctx$idx39$val = HEAP32[$ctx>>2]|0;
    $ctx$idx40 = ((($ctx)) + 4|0);
    $ctx$idx40$val = HEAP32[$ctx$idx40>>2]|0;
    $472 = $469 & 255;
    $473 = (($ctx$idx39$val) + ($472<<1)|0);
    $474 = HEAP16[$473>>1]|0;
    $475 = $474&65535;
    $476 = (($470) + ($475))|0;
    $477 = $476 & 255;
    $478 = (($ctx$idx39$val) + ($477<<1)|0);
    $479 = HEAP16[$478>>1]|0;
    $480 = $479&65535;
    $481 = (($471) + ($480))|0;
    $482 = $481 & 255;
    $483 = (($ctx$idx40$val) + ($482<<1)|0);
    $484 = HEAP16[$483>>1]|0;
    $485 = $484 << 16 >> 16;
    $486 = (904 + ($485)|0);
    $487 = HEAP8[$486>>0]|0;
    $488 = (+($487<<24>>24));
    $489 = $457 * $488;
    $490 = (($485) + 1)|0;
    $491 = (904 + ($490)|0);
    $492 = HEAP8[$491>>0]|0;
    $493 = (+($492<<24>>24));
    $494 = $458 * $493;
    $495 = $489 + $494;
    $496 = (($485) + 2)|0;
    $497 = (904 + ($496)|0);
    $498 = HEAP8[$497>>0]|0;
    $499 = (+($498<<24>>24));
    $500 = $459 * $499;
    $501 = $495 + $500;
    $502 = $468 * $501;
    $503 = $value$5 + $502;
    $dx_ext0$8 = $dx_ext0$5;$dx_ext1$7 = $dx_ext1$5;$dy_ext0$8 = $dy_ext0$5;$dy_ext1$7 = $dy_ext1$5;$dz_ext0$4 = $dz_ext0$1;$dz_ext1$3 = $dz_ext1$1;$value$11 = $503;$xsv_ext0$8 = $xsv_ext0$5;$xsv_ext1$7 = $xsv_ext1$5;$ysv_ext0$8 = $ysv_ext0$5;$ysv_ext1$7 = $ysv_ext1$5;$zsv_ext0$4 = $zsv_ext0$1;$zsv_ext1$3 = $zsv_ext1$1;
    break;
   }
   $504 = $34 > 1.0;
   $505 = $34 + -1.0;
   $506 = 1.0 - $34;
   $aScore22$0 = $504 ? $505 : $506;
   $aPoint23$0 = $504 ? 3 : 4;
   $aIsFurtherSide$0 = $504&1;
   $507 = $31 + $33;
   $508 = $507 > 1.0;
   $509 = $507 + -1.0;
   $510 = 1.0 - $507;
   $bScore24$0 = $508 ? $509 : $510;
   $bPoint25$0 = $508 ? 5 : 2;
   $bIsFurtherSide$0 = $508&1;
   $511 = $32 + $33;
   $512 = $511 > 1.0;
   if ($512) {
    $513 = $511 + -1.0;
    $514 = $aScore22$0 <= $bScore24$0;
    $515 = $aScore22$0 < $513;
    $or$cond14 = $514 & $515;
    if ($or$cond14) {
     $aIsFurtherSide$1 = 1;$aPoint23$1 = 6;$bIsFurtherSide$1 = $bIsFurtherSide$0;$bPoint25$1 = $bPoint25$0;
    } else {
     $516 = $aScore22$0 > $bScore24$0;
     $517 = $bScore24$0 < $513;
     $or$cond15 = $516 & $517;
     $$bPoint25$0 = $or$cond15 ? 6 : $bPoint25$0;
     $$bIsFurtherSide$0 = $or$cond15 ? 1 : $bIsFurtherSide$0;
     $aIsFurtherSide$1 = $aIsFurtherSide$0;$aPoint23$1 = $aPoint23$0;$bIsFurtherSide$1 = $$bIsFurtherSide$0;$bPoint25$1 = $$bPoint25$0;
    }
   } else {
    $518 = 1.0 - $511;
    $519 = $aScore22$0 <= $bScore24$0;
    $520 = $aScore22$0 < $518;
    $or$cond16 = $519 & $520;
    if ($or$cond16) {
     $aIsFurtherSide$1 = 0;$aPoint23$1 = 1;$bIsFurtherSide$1 = $bIsFurtherSide$0;$bPoint25$1 = $bPoint25$0;
    } else {
     $521 = $aScore22$0 > $bScore24$0;
     $522 = $bScore24$0 < $518;
     $or$cond17 = $521 & $522;
     $$bPoint25$022 = $or$cond17 ? 1 : $bPoint25$0;
     $$bIsFurtherSide$023 = $or$cond17 ? 0 : $bIsFurtherSide$0;
     $aIsFurtherSide$1 = $aIsFurtherSide$0;$aPoint23$1 = $aPoint23$0;$bIsFurtherSide$1 = $$bIsFurtherSide$023;$bPoint25$1 = $$bPoint25$022;
    }
   }
   $523 = ($aIsFurtherSide$1|0)==($bIsFurtherSide$1|0);
   $524 = ($aIsFurtherSide$1|0)!=(0);
   do {
    if ($523) {
     if ($524) {
      $525 = $36 + -1.0;
      $526 = $525 + -1.0;
      $527 = $37 + -1.0;
      $528 = $527 + -1.0;
      $529 = $38 + -1.0;
      $530 = $529 + -1.0;
      $531 = (($10) + 1)|0;
      $532 = (($15) + 1)|0;
      $533 = (($20) + 1)|0;
      $534 = $bPoint25$1 & $aPoint23$1;
      $535 = $534&255;
      $536 = $535 & 1;
      $537 = ($536|0)==(0);
      if (!($537)) {
       $538 = $36 + -2.0;
       $539 = $538 + -0.66666666666666663;
       $540 = $37 + -0.66666666666666663;
       $541 = $38 + -0.66666666666666663;
       $542 = (($10) + 2)|0;
       $dx_ext0$7 = $526;$dx_ext1$6 = $539;$dy_ext0$7 = $528;$dy_ext1$6 = $540;$dz_ext0$3 = $530;$dz_ext1$2 = $541;$xsv_ext0$7 = $531;$xsv_ext1$6 = $542;$ysv_ext0$7 = $532;$ysv_ext1$6 = $15;$zsv_ext0$3 = $533;$zsv_ext1$2 = $20;
       break;
      }
      $543 = $535 & 2;
      $544 = ($543|0)==(0);
      $545 = $36 + -0.66666666666666663;
      if ($544) {
       $550 = $37 + -0.66666666666666663;
       $551 = $38 + -2.0;
       $552 = $551 + -0.66666666666666663;
       $553 = (($20) + 2)|0;
       $dx_ext0$7 = $526;$dx_ext1$6 = $545;$dy_ext0$7 = $528;$dy_ext1$6 = $550;$dz_ext0$3 = $530;$dz_ext1$2 = $552;$xsv_ext0$7 = $531;$xsv_ext1$6 = $10;$ysv_ext0$7 = $532;$ysv_ext1$6 = $15;$zsv_ext0$3 = $533;$zsv_ext1$2 = $553;
       break;
      } else {
       $546 = $37 + -2.0;
       $547 = $546 + -0.66666666666666663;
       $548 = $38 + -0.66666666666666663;
       $549 = (($15) + 2)|0;
       $dx_ext0$7 = $526;$dx_ext1$6 = $545;$dy_ext0$7 = $528;$dy_ext1$6 = $547;$dz_ext0$3 = $530;$dz_ext1$2 = $548;$xsv_ext0$7 = $531;$xsv_ext1$6 = $10;$ysv_ext0$7 = $532;$ysv_ext1$6 = $549;$zsv_ext0$3 = $533;$zsv_ext1$2 = $20;
       break;
      }
     } else {
      $554 = $bPoint25$1 | $aPoint23$1;
      $555 = $554 << 24 >> 24;
      $556 = $555 & 1;
      $557 = ($556|0)==(0);
      if ($557) {
       $558 = $36 + 1.0;
       $559 = $558 + -0.33333333333333331;
       $560 = $37 + -1.0;
       $561 = $560 + -0.33333333333333331;
       $562 = $38 + -1.0;
       $563 = $562 + -0.33333333333333331;
       $564 = (($10) + -1)|0;
       $565 = (($15) + 1)|0;
       $566 = (($20) + 1)|0;
       $dx_ext0$7 = $36;$dx_ext1$6 = $559;$dy_ext0$7 = $37;$dy_ext1$6 = $561;$dz_ext0$3 = $38;$dz_ext1$2 = $563;$xsv_ext0$7 = $10;$xsv_ext1$6 = $564;$ysv_ext0$7 = $15;$ysv_ext1$6 = $565;$zsv_ext0$3 = $20;$zsv_ext1$2 = $566;
       break;
      }
      $567 = $555 & 2;
      $568 = ($567|0)==(0);
      $569 = $36 + -1.0;
      $570 = $569 + -0.33333333333333331;
      if ($568) {
       $571 = $37 + 1.0;
       $572 = $571 + -0.33333333333333331;
       $573 = $38 + -1.0;
       $574 = $573 + -0.33333333333333331;
       $575 = (($10) + 1)|0;
       $576 = (($15) + -1)|0;
       $577 = (($20) + 1)|0;
       $dx_ext0$7 = $36;$dx_ext1$6 = $570;$dy_ext0$7 = $37;$dy_ext1$6 = $572;$dz_ext0$3 = $38;$dz_ext1$2 = $574;$xsv_ext0$7 = $10;$xsv_ext1$6 = $575;$ysv_ext0$7 = $15;$ysv_ext1$6 = $576;$zsv_ext0$3 = $20;$zsv_ext1$2 = $577;
       break;
      } else {
       $578 = $37 + -1.0;
       $579 = $578 + -0.33333333333333331;
       $580 = $38 + 1.0;
       $581 = $580 + -0.33333333333333331;
       $582 = (($10) + 1)|0;
       $583 = (($15) + 1)|0;
       $584 = (($20) + -1)|0;
       $dx_ext0$7 = $36;$dx_ext1$6 = $570;$dy_ext0$7 = $37;$dy_ext1$6 = $579;$dz_ext0$3 = $38;$dz_ext1$2 = $581;$xsv_ext0$7 = $10;$xsv_ext1$6 = $582;$ysv_ext0$7 = $15;$ysv_ext1$6 = $583;$zsv_ext0$3 = $20;$zsv_ext1$2 = $584;
       break;
      }
     }
    } else {
     $aPoint23$1$bPoint25$1 = $524 ? $aPoint23$1 : $bPoint25$1;
     $bPoint25$1$aPoint23$1 = $524 ? $bPoint25$1 : $aPoint23$1;
     $585 = $aPoint23$1$bPoint25$1 << 24 >> 24;
     $586 = $585 & 1;
     $587 = ($586|0)==(0);
     do {
      if ($587) {
       $588 = $36 + 1.0;
       $589 = $588 + -0.33333333333333331;
       $590 = $37 + -1.0;
       $591 = $38 + -1.0;
       $592 = (($10) + -1)|0;
       $593 = (($15) + 1)|0;
       $594 = (($20) + 1)|0;
       $dx_ext0$6 = $589;$dy_ext0$6$in = $590;$dz_ext0$2$in = $591;$xsv_ext0$6 = $592;$ysv_ext0$6 = $593;$zsv_ext0$2 = $594;
      } else {
       $595 = $585 & 2;
       $596 = ($595|0)==(0);
       $597 = $36 + -1.0;
       $598 = $597 + -0.33333333333333331;
       if ($596) {
        $599 = $37 + 1.0;
        $600 = $38 + -1.0;
        $601 = (($10) + 1)|0;
        $602 = (($15) + -1)|0;
        $603 = (($20) + 1)|0;
        $dx_ext0$6 = $598;$dy_ext0$6$in = $599;$dz_ext0$2$in = $600;$xsv_ext0$6 = $601;$ysv_ext0$6 = $602;$zsv_ext0$2 = $603;
        break;
       } else {
        $604 = $37 + -1.0;
        $605 = $38 + 1.0;
        $606 = (($10) + 1)|0;
        $607 = (($15) + 1)|0;
        $608 = (($20) + -1)|0;
        $dx_ext0$6 = $598;$dy_ext0$6$in = $604;$dz_ext0$2$in = $605;$xsv_ext0$6 = $606;$ysv_ext0$6 = $607;$zsv_ext0$2 = $608;
        break;
       }
      }
     } while(0);
     $dz_ext0$2 = $dz_ext0$2$in + -0.33333333333333331;
     $dy_ext0$6 = $dy_ext0$6$in + -0.33333333333333331;
     $609 = $36 + -0.66666666666666663;
     $610 = $37 + -0.66666666666666663;
     $611 = $38 + -0.66666666666666663;
     $612 = $bPoint25$1$aPoint23$1 << 24 >> 24;
     $613 = $612 & 1;
     $614 = ($613|0)==(0);
     if (!($614)) {
      $615 = $609 + -2.0;
      $616 = (($10) + 2)|0;
      $dx_ext0$7 = $dx_ext0$6;$dx_ext1$6 = $615;$dy_ext0$7 = $dy_ext0$6;$dy_ext1$6 = $610;$dz_ext0$3 = $dz_ext0$2;$dz_ext1$2 = $611;$xsv_ext0$7 = $xsv_ext0$6;$xsv_ext1$6 = $616;$ysv_ext0$7 = $ysv_ext0$6;$ysv_ext1$6 = $15;$zsv_ext0$3 = $zsv_ext0$2;$zsv_ext1$2 = $20;
      break;
     }
     $617 = $612 & 2;
     $618 = ($617|0)==(0);
     if ($618) {
      $621 = $611 + -2.0;
      $622 = (($20) + 2)|0;
      $dx_ext0$7 = $dx_ext0$6;$dx_ext1$6 = $609;$dy_ext0$7 = $dy_ext0$6;$dy_ext1$6 = $610;$dz_ext0$3 = $dz_ext0$2;$dz_ext1$2 = $621;$xsv_ext0$7 = $xsv_ext0$6;$xsv_ext1$6 = $10;$ysv_ext0$7 = $ysv_ext0$6;$ysv_ext1$6 = $15;$zsv_ext0$3 = $zsv_ext0$2;$zsv_ext1$2 = $622;
      break;
     } else {
      $619 = $610 + -2.0;
      $620 = (($15) + 2)|0;
      $dx_ext0$7 = $dx_ext0$6;$dx_ext1$6 = $609;$dy_ext0$7 = $dy_ext0$6;$dy_ext1$6 = $619;$dz_ext0$3 = $dz_ext0$2;$dz_ext1$2 = $611;$xsv_ext0$7 = $xsv_ext0$6;$xsv_ext1$6 = $10;$ysv_ext0$7 = $ysv_ext0$6;$ysv_ext1$6 = $620;$zsv_ext0$3 = $zsv_ext0$2;$zsv_ext1$2 = $20;
      break;
     }
    }
   } while(0);
   $623 = $36 + -1.0;
   $624 = $623 + -0.33333333333333331;
   $625 = $37 + -0.33333333333333331;
   $626 = $38 + -0.33333333333333331;
   $627 = $624 * $624;
   $628 = 2.0 - $627;
   $629 = $625 * $625;
   $630 = $628 - $629;
   $631 = $626 * $626;
   $632 = $630 - $631;
   $633 = $632 > 0.0;
   if ($633) {
    $634 = $632 * $632;
    $635 = $634 * $634;
    $636 = (($10) + 1)|0;
    $ctx$idx37$val = HEAP32[$ctx>>2]|0;
    $ctx$idx38 = ((($ctx)) + 4|0);
    $ctx$idx38$val = HEAP32[$ctx$idx38>>2]|0;
    $637 = $636 & 255;
    $638 = (($ctx$idx37$val) + ($637<<1)|0);
    $639 = HEAP16[$638>>1]|0;
    $640 = $639&65535;
    $641 = (($640) + ($15))|0;
    $642 = $641 & 255;
    $643 = (($ctx$idx37$val) + ($642<<1)|0);
    $644 = HEAP16[$643>>1]|0;
    $645 = $644&65535;
    $646 = (($645) + ($20))|0;
    $647 = $646 & 255;
    $648 = (($ctx$idx38$val) + ($647<<1)|0);
    $649 = HEAP16[$648>>1]|0;
    $650 = $649 << 16 >> 16;
    $651 = (904 + ($650)|0);
    $652 = HEAP8[$651>>0]|0;
    $653 = (+($652<<24>>24));
    $654 = $624 * $653;
    $655 = (($650) + 1)|0;
    $656 = (904 + ($655)|0);
    $657 = HEAP8[$656>>0]|0;
    $658 = (+($657<<24>>24));
    $659 = $625 * $658;
    $660 = $654 + $659;
    $661 = (($650) + 2)|0;
    $662 = (904 + ($661)|0);
    $663 = HEAP8[$662>>0]|0;
    $664 = (+($663<<24>>24));
    $665 = $626 * $664;
    $666 = $660 + $665;
    $667 = $635 * $666;
    $668 = $667 + 0.0;
    $value$6 = $668;
   } else {
    $value$6 = 0.0;
   }
   $669 = $36 + -0.33333333333333331;
   $670 = $37 + -1.0;
   $671 = $670 + -0.33333333333333331;
   $672 = $669 * $669;
   $673 = 2.0 - $672;
   $674 = $671 * $671;
   $675 = $673 - $674;
   $676 = $675 - $631;
   $677 = $676 > 0.0;
   if ($677) {
    $678 = $676 * $676;
    $679 = $678 * $678;
    $680 = (($15) + 1)|0;
    $ctx$idx35$val = HEAP32[$ctx>>2]|0;
    $ctx$idx36 = ((($ctx)) + 4|0);
    $ctx$idx36$val = HEAP32[$ctx$idx36>>2]|0;
    $681 = $10 & 255;
    $682 = (($ctx$idx35$val) + ($681<<1)|0);
    $683 = HEAP16[$682>>1]|0;
    $684 = $683&65535;
    $685 = (($680) + ($684))|0;
    $686 = $685 & 255;
    $687 = (($ctx$idx35$val) + ($686<<1)|0);
    $688 = HEAP16[$687>>1]|0;
    $689 = $688&65535;
    $690 = (($689) + ($20))|0;
    $691 = $690 & 255;
    $692 = (($ctx$idx36$val) + ($691<<1)|0);
    $693 = HEAP16[$692>>1]|0;
    $694 = $693 << 16 >> 16;
    $695 = (904 + ($694)|0);
    $696 = HEAP8[$695>>0]|0;
    $697 = (+($696<<24>>24));
    $698 = $669 * $697;
    $699 = (($694) + 1)|0;
    $700 = (904 + ($699)|0);
    $701 = HEAP8[$700>>0]|0;
    $702 = (+($701<<24>>24));
    $703 = $671 * $702;
    $704 = $698 + $703;
    $705 = (($694) + 2)|0;
    $706 = (904 + ($705)|0);
    $707 = HEAP8[$706>>0]|0;
    $708 = (+($707<<24>>24));
    $709 = $626 * $708;
    $710 = $704 + $709;
    $711 = $679 * $710;
    $712 = $value$6 + $711;
    $value$7 = $712;
   } else {
    $value$7 = $value$6;
   }
   $713 = $38 + -1.0;
   $714 = $713 + -0.33333333333333331;
   $715 = $673 - $629;
   $716 = $714 * $714;
   $717 = $715 - $716;
   $718 = $717 > 0.0;
   if ($718) {
    $719 = $717 * $717;
    $720 = $719 * $719;
    $721 = (($20) + 1)|0;
    $ctx$idx33$val = HEAP32[$ctx>>2]|0;
    $ctx$idx34 = ((($ctx)) + 4|0);
    $ctx$idx34$val = HEAP32[$ctx$idx34>>2]|0;
    $722 = $10 & 255;
    $723 = (($ctx$idx33$val) + ($722<<1)|0);
    $724 = HEAP16[$723>>1]|0;
    $725 = $724&65535;
    $726 = (($725) + ($15))|0;
    $727 = $726 & 255;
    $728 = (($ctx$idx33$val) + ($727<<1)|0);
    $729 = HEAP16[$728>>1]|0;
    $730 = $729&65535;
    $731 = (($721) + ($730))|0;
    $732 = $731 & 255;
    $733 = (($ctx$idx34$val) + ($732<<1)|0);
    $734 = HEAP16[$733>>1]|0;
    $735 = $734 << 16 >> 16;
    $736 = (904 + ($735)|0);
    $737 = HEAP8[$736>>0]|0;
    $738 = (+($737<<24>>24));
    $739 = $669 * $738;
    $740 = (($735) + 1)|0;
    $741 = (904 + ($740)|0);
    $742 = HEAP8[$741>>0]|0;
    $743 = (+($742<<24>>24));
    $744 = $625 * $743;
    $745 = $739 + $744;
    $746 = (($735) + 2)|0;
    $747 = (904 + ($746)|0);
    $748 = HEAP8[$747>>0]|0;
    $749 = (+($748<<24>>24));
    $750 = $714 * $749;
    $751 = $745 + $750;
    $752 = $720 * $751;
    $753 = $value$7 + $752;
    $value$8 = $753;
   } else {
    $value$8 = $value$7;
   }
   $754 = $623 + -0.66666666666666663;
   $755 = $670 + -0.66666666666666663;
   $756 = $38 + -0.66666666666666663;
   $757 = $754 * $754;
   $758 = 2.0 - $757;
   $759 = $755 * $755;
   $760 = $758 - $759;
   $761 = $756 * $756;
   $762 = $760 - $761;
   $763 = $762 > 0.0;
   if ($763) {
    $764 = $762 * $762;
    $765 = $764 * $764;
    $766 = (($10) + 1)|0;
    $767 = (($15) + 1)|0;
    $ctx$idx31$val = HEAP32[$ctx>>2]|0;
    $ctx$idx32 = ((($ctx)) + 4|0);
    $ctx$idx32$val = HEAP32[$ctx$idx32>>2]|0;
    $768 = $766 & 255;
    $769 = (($ctx$idx31$val) + ($768<<1)|0);
    $770 = HEAP16[$769>>1]|0;
    $771 = $770&65535;
    $772 = (($767) + ($771))|0;
    $773 = $772 & 255;
    $774 = (($ctx$idx31$val) + ($773<<1)|0);
    $775 = HEAP16[$774>>1]|0;
    $776 = $775&65535;
    $777 = (($776) + ($20))|0;
    $778 = $777 & 255;
    $779 = (($ctx$idx32$val) + ($778<<1)|0);
    $780 = HEAP16[$779>>1]|0;
    $781 = $780 << 16 >> 16;
    $782 = (904 + ($781)|0);
    $783 = HEAP8[$782>>0]|0;
    $784 = (+($783<<24>>24));
    $785 = $754 * $784;
    $786 = (($781) + 1)|0;
    $787 = (904 + ($786)|0);
    $788 = HEAP8[$787>>0]|0;
    $789 = (+($788<<24>>24));
    $790 = $755 * $789;
    $791 = $785 + $790;
    $792 = (($781) + 2)|0;
    $793 = (904 + ($792)|0);
    $794 = HEAP8[$793>>0]|0;
    $795 = (+($794<<24>>24));
    $796 = $756 * $795;
    $797 = $791 + $796;
    $798 = $765 * $797;
    $799 = $value$8 + $798;
    $value$9 = $799;
   } else {
    $value$9 = $value$8;
   }
   $800 = $37 + -0.66666666666666663;
   $801 = $713 + -0.66666666666666663;
   $802 = $800 * $800;
   $803 = $758 - $802;
   $804 = $801 * $801;
   $805 = $803 - $804;
   $806 = $805 > 0.0;
   if ($806) {
    $807 = $805 * $805;
    $808 = $807 * $807;
    $809 = (($10) + 1)|0;
    $810 = (($20) + 1)|0;
    $ctx$idx29$val = HEAP32[$ctx>>2]|0;
    $ctx$idx30 = ((($ctx)) + 4|0);
    $ctx$idx30$val = HEAP32[$ctx$idx30>>2]|0;
    $811 = $809 & 255;
    $812 = (($ctx$idx29$val) + ($811<<1)|0);
    $813 = HEAP16[$812>>1]|0;
    $814 = $813&65535;
    $815 = (($814) + ($15))|0;
    $816 = $815 & 255;
    $817 = (($ctx$idx29$val) + ($816<<1)|0);
    $818 = HEAP16[$817>>1]|0;
    $819 = $818&65535;
    $820 = (($810) + ($819))|0;
    $821 = $820 & 255;
    $822 = (($ctx$idx30$val) + ($821<<1)|0);
    $823 = HEAP16[$822>>1]|0;
    $824 = $823 << 16 >> 16;
    $825 = (904 + ($824)|0);
    $826 = HEAP8[$825>>0]|0;
    $827 = (+($826<<24>>24));
    $828 = $754 * $827;
    $829 = (($824) + 1)|0;
    $830 = (904 + ($829)|0);
    $831 = HEAP8[$830>>0]|0;
    $832 = (+($831<<24>>24));
    $833 = $800 * $832;
    $834 = $828 + $833;
    $835 = (($824) + 2)|0;
    $836 = (904 + ($835)|0);
    $837 = HEAP8[$836>>0]|0;
    $838 = (+($837<<24>>24));
    $839 = $801 * $838;
    $840 = $834 + $839;
    $841 = $808 * $840;
    $842 = $value$9 + $841;
    $value$10 = $842;
   } else {
    $value$10 = $value$9;
   }
   $843 = $36 + -0.66666666666666663;
   $844 = $843 * $843;
   $845 = 2.0 - $844;
   $846 = $845 - $759;
   $847 = $846 - $804;
   $848 = $847 > 0.0;
   if ($848) {
    $849 = $847 * $847;
    $850 = $849 * $849;
    $851 = (($15) + 1)|0;
    $852 = (($20) + 1)|0;
    $ctx$idx27$val = HEAP32[$ctx>>2]|0;
    $ctx$idx28 = ((($ctx)) + 4|0);
    $ctx$idx28$val = HEAP32[$ctx$idx28>>2]|0;
    $853 = $10 & 255;
    $854 = (($ctx$idx27$val) + ($853<<1)|0);
    $855 = HEAP16[$854>>1]|0;
    $856 = $855&65535;
    $857 = (($851) + ($856))|0;
    $858 = $857 & 255;
    $859 = (($ctx$idx27$val) + ($858<<1)|0);
    $860 = HEAP16[$859>>1]|0;
    $861 = $860&65535;
    $862 = (($852) + ($861))|0;
    $863 = $862 & 255;
    $864 = (($ctx$idx28$val) + ($863<<1)|0);
    $865 = HEAP16[$864>>1]|0;
    $866 = $865 << 16 >> 16;
    $867 = (904 + ($866)|0);
    $868 = HEAP8[$867>>0]|0;
    $869 = (+($868<<24>>24));
    $870 = $843 * $869;
    $871 = (($866) + 1)|0;
    $872 = (904 + ($871)|0);
    $873 = HEAP8[$872>>0]|0;
    $874 = (+($873<<24>>24));
    $875 = $755 * $874;
    $876 = $870 + $875;
    $877 = (($866) + 2)|0;
    $878 = (904 + ($877)|0);
    $879 = HEAP8[$878>>0]|0;
    $880 = (+($879<<24>>24));
    $881 = $801 * $880;
    $882 = $876 + $881;
    $883 = $850 * $882;
    $884 = $value$10 + $883;
    $dx_ext0$8 = $dx_ext0$7;$dx_ext1$7 = $dx_ext1$6;$dy_ext0$8 = $dy_ext0$7;$dy_ext1$7 = $dy_ext1$6;$dz_ext0$4 = $dz_ext0$3;$dz_ext1$3 = $dz_ext1$2;$value$11 = $884;$xsv_ext0$8 = $xsv_ext0$7;$xsv_ext1$7 = $xsv_ext1$6;$ysv_ext0$8 = $ysv_ext0$7;$ysv_ext1$7 = $ysv_ext1$6;$zsv_ext0$4 = $zsv_ext0$3;$zsv_ext1$3 = $zsv_ext1$2;
   } else {
    $dx_ext0$8 = $dx_ext0$7;$dx_ext1$7 = $dx_ext1$6;$dy_ext0$8 = $dy_ext0$7;$dy_ext1$7 = $dy_ext1$6;$dz_ext0$4 = $dz_ext0$3;$dz_ext1$3 = $dz_ext1$2;$value$11 = $value$10;$xsv_ext0$8 = $xsv_ext0$7;$xsv_ext1$7 = $xsv_ext1$6;$ysv_ext0$8 = $ysv_ext0$7;$ysv_ext1$7 = $ysv_ext1$6;$zsv_ext0$4 = $zsv_ext0$3;$zsv_ext1$3 = $zsv_ext1$2;
   }
  } else {
   $40 = $31 >= $32;
   $41 = $33 > $32;
   $or$cond = $40 & $41;
   if ($or$cond) {
    $aPoint$0 = 1;$aScore$0 = $31;$bPoint$0 = 4;$bScore$0 = $33;
   } else {
    $42 = $31 < $32;
    $43 = $33 > $31;
    $or$cond2 = $42 & $43;
    $$18 = $or$cond2 ? $33 : $31;
    $$19 = $or$cond2 ? 4 : 1;
    $aPoint$0 = $$19;$aScore$0 = $$18;$bPoint$0 = 2;$bScore$0 = $32;
   }
   $44 = 1.0 - $35;
   $45 = $44 > $aScore$0;
   $46 = $44 > $bScore$0;
   $or$cond3 = $46 | $45;
   do {
    if ($or$cond3) {
     $47 = $bScore$0 > $aScore$0;
     $$sink = $47 ? $bPoint$0 : $aPoint$0;
     $48 = $$sink&255;
     $49 = $48 & 1;
     $50 = ($49|0)==(0);
     if ($50) {
      $51 = (($10) + -1)|0;
      $52 = $36 + 1.0;
      $dx_ext0$0 = $52;$dx_ext1$0 = $36;$xsv_ext0$0 = $51;$xsv_ext1$0 = $10;
     } else {
      $53 = (($10) + 1)|0;
      $54 = $36 + -1.0;
      $dx_ext0$0 = $54;$dx_ext1$0 = $54;$xsv_ext0$0 = $53;$xsv_ext1$0 = $53;
     }
     $55 = $48 & 2;
     $56 = ($55|0)==(0);
     if ($56) {
      $57 = (($15) + -1)|0;
      $58 = $37 + 1.0;
      $$ = $50 ? $57 : $15;
      $$4 = $50 ? $15 : $57;
      $$5 = $50 ? $58 : $37;
      $$6 = $50 ? $37 : $58;
      $dy_ext0$0 = $$6;$dy_ext1$0 = $$5;$ysv_ext0$0 = $$4;$ysv_ext1$0 = $$;
     } else {
      $59 = (($15) + 1)|0;
      $60 = $37 + -1.0;
      $dy_ext0$0 = $60;$dy_ext1$0 = $60;$ysv_ext0$0 = $59;$ysv_ext1$0 = $59;
     }
     $61 = $48 & 4;
     $62 = ($61|0)==(0);
     if ($62) {
      $63 = (($20) + -1)|0;
      $64 = $38 + 1.0;
      $dx_ext0$2 = $dx_ext0$0;$dx_ext1$2 = $dx_ext1$0;$dy_ext0$2 = $dy_ext0$0;$dy_ext1$2 = $dy_ext1$0;$dz_ext0$0 = $38;$dz_ext1$0 = $64;$xsv_ext0$2 = $xsv_ext0$0;$xsv_ext1$2 = $xsv_ext1$0;$ysv_ext0$2 = $ysv_ext0$0;$ysv_ext1$2 = $ysv_ext1$0;$zsv_ext0$0 = $20;$zsv_ext1$0 = $63;
      break;
     } else {
      $65 = (($20) + 1)|0;
      $66 = $38 + -1.0;
      $dx_ext0$2 = $dx_ext0$0;$dx_ext1$2 = $dx_ext1$0;$dy_ext0$2 = $dy_ext0$0;$dy_ext1$2 = $dy_ext1$0;$dz_ext0$0 = $66;$dz_ext1$0 = $66;$xsv_ext0$2 = $xsv_ext0$0;$xsv_ext1$2 = $xsv_ext1$0;$ysv_ext0$2 = $ysv_ext0$0;$ysv_ext1$2 = $ysv_ext1$0;$zsv_ext0$0 = $65;$zsv_ext1$0 = $65;
      break;
     }
    } else {
     $67 = $aPoint$0 | $bPoint$0;
     $68 = $67&255;
     $69 = $68 & 1;
     $70 = ($69|0)==(0);
     if ($70) {
      $71 = (($10) + -1)|0;
      $72 = $36 + 1.0;
      $dx_ext0$1$in = $36;$dx_ext1$1$in = $72;$xsv_ext0$1 = $10;$xsv_ext1$1 = $71;
     } else {
      $73 = (($10) + 1)|0;
      $74 = $36 + -1.0;
      $dx_ext0$1$in = $74;$dx_ext1$1$in = $74;$xsv_ext0$1 = $73;$xsv_ext1$1 = $73;
     }
     $dx_ext1$1 = $dx_ext1$1$in + -0.33333333333333331;
     $dx_ext0$1 = $dx_ext0$1$in + -0.66666666666666663;
     $75 = $68 & 2;
     $76 = ($75|0)==(0);
     if ($76) {
      $77 = (($15) + -1)|0;
      $78 = $37 + 1.0;
      $dy_ext0$1$in = $37;$dy_ext1$1$in = $78;$ysv_ext0$1 = $15;$ysv_ext1$1 = $77;
     } else {
      $79 = (($15) + 1)|0;
      $80 = $37 + -1.0;
      $dy_ext0$1$in = $80;$dy_ext1$1$in = $80;$ysv_ext0$1 = $79;$ysv_ext1$1 = $79;
     }
     $dy_ext1$1 = $dy_ext1$1$in + -0.33333333333333331;
     $dy_ext0$1 = $dy_ext0$1$in + -0.66666666666666663;
     $81 = $68 & 4;
     $82 = ($81|0)==(0);
     if ($82) {
      $83 = (($20) + -1)|0;
      $84 = $38 + -0.66666666666666663;
      $85 = $38 + 1.0;
      $86 = $85 + -0.33333333333333331;
      $dx_ext0$2 = $dx_ext0$1;$dx_ext1$2 = $dx_ext1$1;$dy_ext0$2 = $dy_ext0$1;$dy_ext1$2 = $dy_ext1$1;$dz_ext0$0 = $84;$dz_ext1$0 = $86;$xsv_ext0$2 = $xsv_ext0$1;$xsv_ext1$2 = $xsv_ext1$1;$ysv_ext0$2 = $ysv_ext0$1;$ysv_ext1$2 = $ysv_ext1$1;$zsv_ext0$0 = $20;$zsv_ext1$0 = $83;
      break;
     } else {
      $87 = (($20) + 1)|0;
      $88 = $38 + -1.0;
      $89 = $88 + -0.66666666666666663;
      $90 = $88 + -0.33333333333333331;
      $dx_ext0$2 = $dx_ext0$1;$dx_ext1$2 = $dx_ext1$1;$dy_ext0$2 = $dy_ext0$1;$dy_ext1$2 = $dy_ext1$1;$dz_ext0$0 = $89;$dz_ext1$0 = $90;$xsv_ext0$2 = $xsv_ext0$1;$xsv_ext1$2 = $xsv_ext1$1;$ysv_ext0$2 = $ysv_ext0$1;$ysv_ext1$2 = $ysv_ext1$1;$zsv_ext0$0 = $87;$zsv_ext1$0 = $87;
      break;
     }
    }
   } while(0);
   $91 = $36 * $36;
   $92 = 2.0 - $91;
   $93 = $37 * $37;
   $94 = $92 - $93;
   $95 = $38 * $38;
   $96 = $94 - $95;
   $97 = $96 > 0.0;
   if ($97) {
    $98 = $96 * $96;
    $99 = $98 * $98;
    $ctx$idx53$val = HEAP32[$ctx>>2]|0;
    $ctx$idx54 = ((($ctx)) + 4|0);
    $ctx$idx54$val = HEAP32[$ctx$idx54>>2]|0;
    $100 = $10 & 255;
    $101 = (($ctx$idx53$val) + ($100<<1)|0);
    $102 = HEAP16[$101>>1]|0;
    $103 = $102&65535;
    $104 = (($103) + ($15))|0;
    $105 = $104 & 255;
    $106 = (($ctx$idx53$val) + ($105<<1)|0);
    $107 = HEAP16[$106>>1]|0;
    $108 = $107&65535;
    $109 = (($108) + ($20))|0;
    $110 = $109 & 255;
    $111 = (($ctx$idx54$val) + ($110<<1)|0);
    $112 = HEAP16[$111>>1]|0;
    $113 = $112 << 16 >> 16;
    $114 = (904 + ($113)|0);
    $115 = HEAP8[$114>>0]|0;
    $116 = (+($115<<24>>24));
    $117 = $36 * $116;
    $118 = (($113) + 1)|0;
    $119 = (904 + ($118)|0);
    $120 = HEAP8[$119>>0]|0;
    $121 = (+($120<<24>>24));
    $122 = $37 * $121;
    $123 = $117 + $122;
    $124 = (($113) + 2)|0;
    $125 = (904 + ($124)|0);
    $126 = HEAP8[$125>>0]|0;
    $127 = (+($126<<24>>24));
    $128 = $38 * $127;
    $129 = $123 + $128;
    $130 = $99 * $129;
    $131 = $130 + 0.0;
    $value$0 = $131;
   } else {
    $value$0 = 0.0;
   }
   $132 = $36 + -1.0;
   $133 = $132 + -0.33333333333333331;
   $134 = $37 + -0.33333333333333331;
   $135 = $38 + -0.33333333333333331;
   $136 = $133 * $133;
   $137 = 2.0 - $136;
   $138 = $134 * $134;
   $139 = $137 - $138;
   $140 = $135 * $135;
   $141 = $139 - $140;
   $142 = $141 > 0.0;
   if ($142) {
    $143 = $141 * $141;
    $144 = $143 * $143;
    $145 = (($10) + 1)|0;
    $ctx$idx51$val = HEAP32[$ctx>>2]|0;
    $ctx$idx52 = ((($ctx)) + 4|0);
    $ctx$idx52$val = HEAP32[$ctx$idx52>>2]|0;
    $146 = $145 & 255;
    $147 = (($ctx$idx51$val) + ($146<<1)|0);
    $148 = HEAP16[$147>>1]|0;
    $149 = $148&65535;
    $150 = (($149) + ($15))|0;
    $151 = $150 & 255;
    $152 = (($ctx$idx51$val) + ($151<<1)|0);
    $153 = HEAP16[$152>>1]|0;
    $154 = $153&65535;
    $155 = (($154) + ($20))|0;
    $156 = $155 & 255;
    $157 = (($ctx$idx52$val) + ($156<<1)|0);
    $158 = HEAP16[$157>>1]|0;
    $159 = $158 << 16 >> 16;
    $160 = (904 + ($159)|0);
    $161 = HEAP8[$160>>0]|0;
    $162 = (+($161<<24>>24));
    $163 = $133 * $162;
    $164 = (($159) + 1)|0;
    $165 = (904 + ($164)|0);
    $166 = HEAP8[$165>>0]|0;
    $167 = (+($166<<24>>24));
    $168 = $134 * $167;
    $169 = $163 + $168;
    $170 = (($159) + 2)|0;
    $171 = (904 + ($170)|0);
    $172 = HEAP8[$171>>0]|0;
    $173 = (+($172<<24>>24));
    $174 = $135 * $173;
    $175 = $169 + $174;
    $176 = $144 * $175;
    $177 = $value$0 + $176;
    $value$1 = $177;
   } else {
    $value$1 = $value$0;
   }
   $178 = $36 + -0.33333333333333331;
   $179 = $37 + -1.0;
   $180 = $179 + -0.33333333333333331;
   $181 = $178 * $178;
   $182 = 2.0 - $181;
   $183 = $180 * $180;
   $184 = $182 - $183;
   $185 = $184 - $140;
   $186 = $185 > 0.0;
   if ($186) {
    $187 = $185 * $185;
    $188 = $187 * $187;
    $189 = (($15) + 1)|0;
    $ctx$idx49$val = HEAP32[$ctx>>2]|0;
    $ctx$idx50 = ((($ctx)) + 4|0);
    $ctx$idx50$val = HEAP32[$ctx$idx50>>2]|0;
    $190 = $10 & 255;
    $191 = (($ctx$idx49$val) + ($190<<1)|0);
    $192 = HEAP16[$191>>1]|0;
    $193 = $192&65535;
    $194 = (($189) + ($193))|0;
    $195 = $194 & 255;
    $196 = (($ctx$idx49$val) + ($195<<1)|0);
    $197 = HEAP16[$196>>1]|0;
    $198 = $197&65535;
    $199 = (($198) + ($20))|0;
    $200 = $199 & 255;
    $201 = (($ctx$idx50$val) + ($200<<1)|0);
    $202 = HEAP16[$201>>1]|0;
    $203 = $202 << 16 >> 16;
    $204 = (904 + ($203)|0);
    $205 = HEAP8[$204>>0]|0;
    $206 = (+($205<<24>>24));
    $207 = $178 * $206;
    $208 = (($203) + 1)|0;
    $209 = (904 + ($208)|0);
    $210 = HEAP8[$209>>0]|0;
    $211 = (+($210<<24>>24));
    $212 = $180 * $211;
    $213 = $207 + $212;
    $214 = (($203) + 2)|0;
    $215 = (904 + ($214)|0);
    $216 = HEAP8[$215>>0]|0;
    $217 = (+($216<<24>>24));
    $218 = $135 * $217;
    $219 = $213 + $218;
    $220 = $188 * $219;
    $221 = $value$1 + $220;
    $value$2 = $221;
   } else {
    $value$2 = $value$1;
   }
   $222 = $38 + -1.0;
   $223 = $222 + -0.33333333333333331;
   $224 = $182 - $138;
   $225 = $223 * $223;
   $226 = $224 - $225;
   $227 = $226 > 0.0;
   if ($227) {
    $228 = $226 * $226;
    $229 = $228 * $228;
    $230 = (($20) + 1)|0;
    $ctx$idx47$val = HEAP32[$ctx>>2]|0;
    $ctx$idx48 = ((($ctx)) + 4|0);
    $ctx$idx48$val = HEAP32[$ctx$idx48>>2]|0;
    $231 = $10 & 255;
    $232 = (($ctx$idx47$val) + ($231<<1)|0);
    $233 = HEAP16[$232>>1]|0;
    $234 = $233&65535;
    $235 = (($234) + ($15))|0;
    $236 = $235 & 255;
    $237 = (($ctx$idx47$val) + ($236<<1)|0);
    $238 = HEAP16[$237>>1]|0;
    $239 = $238&65535;
    $240 = (($230) + ($239))|0;
    $241 = $240 & 255;
    $242 = (($ctx$idx48$val) + ($241<<1)|0);
    $243 = HEAP16[$242>>1]|0;
    $244 = $243 << 16 >> 16;
    $245 = (904 + ($244)|0);
    $246 = HEAP8[$245>>0]|0;
    $247 = (+($246<<24>>24));
    $248 = $178 * $247;
    $249 = (($244) + 1)|0;
    $250 = (904 + ($249)|0);
    $251 = HEAP8[$250>>0]|0;
    $252 = (+($251<<24>>24));
    $253 = $134 * $252;
    $254 = $248 + $253;
    $255 = (($244) + 2)|0;
    $256 = (904 + ($255)|0);
    $257 = HEAP8[$256>>0]|0;
    $258 = (+($257<<24>>24));
    $259 = $223 * $258;
    $260 = $254 + $259;
    $261 = $229 * $260;
    $262 = $value$2 + $261;
    $dx_ext0$8 = $dx_ext0$2;$dx_ext1$7 = $dx_ext1$2;$dy_ext0$8 = $dy_ext0$2;$dy_ext1$7 = $dy_ext1$2;$dz_ext0$4 = $dz_ext0$0;$dz_ext1$3 = $dz_ext1$0;$value$11 = $262;$xsv_ext0$8 = $xsv_ext0$2;$xsv_ext1$7 = $xsv_ext1$2;$ysv_ext0$8 = $ysv_ext0$2;$ysv_ext1$7 = $ysv_ext1$2;$zsv_ext0$4 = $zsv_ext0$0;$zsv_ext1$3 = $zsv_ext1$0;
   } else {
    $dx_ext0$8 = $dx_ext0$2;$dx_ext1$7 = $dx_ext1$2;$dy_ext0$8 = $dy_ext0$2;$dy_ext1$7 = $dy_ext1$2;$dz_ext0$4 = $dz_ext0$0;$dz_ext1$3 = $dz_ext1$0;$value$11 = $value$2;$xsv_ext0$8 = $xsv_ext0$2;$xsv_ext1$7 = $xsv_ext1$2;$ysv_ext0$8 = $ysv_ext0$2;$ysv_ext1$7 = $ysv_ext1$2;$zsv_ext0$4 = $zsv_ext0$0;$zsv_ext1$3 = $zsv_ext1$0;
   }
  }
 } while(0);
 $885 = $dx_ext0$8 * $dx_ext0$8;
 $886 = 2.0 - $885;
 $887 = $dy_ext0$8 * $dy_ext0$8;
 $888 = $886 - $887;
 $889 = $dz_ext0$4 * $dz_ext0$4;
 $890 = $888 - $889;
 $891 = $890 > 0.0;
 if ($891) {
  $892 = $890 * $890;
  $893 = $892 * $892;
  $ctx$idx25$val = HEAP32[$ctx>>2]|0;
  $ctx$idx26 = ((($ctx)) + 4|0);
  $ctx$idx26$val = HEAP32[$ctx$idx26>>2]|0;
  $894 = $xsv_ext0$8 & 255;
  $895 = (($ctx$idx25$val) + ($894<<1)|0);
  $896 = HEAP16[$895>>1]|0;
  $897 = $896&65535;
  $898 = (($897) + ($ysv_ext0$8))|0;
  $899 = $898 & 255;
  $900 = (($ctx$idx25$val) + ($899<<1)|0);
  $901 = HEAP16[$900>>1]|0;
  $902 = $901&65535;
  $903 = (($902) + ($zsv_ext0$4))|0;
  $904 = $903 & 255;
  $905 = (($ctx$idx26$val) + ($904<<1)|0);
  $906 = HEAP16[$905>>1]|0;
  $907 = $906 << 16 >> 16;
  $908 = (904 + ($907)|0);
  $909 = HEAP8[$908>>0]|0;
  $910 = (+($909<<24>>24));
  $911 = $dx_ext0$8 * $910;
  $912 = (($907) + 1)|0;
  $913 = (904 + ($912)|0);
  $914 = HEAP8[$913>>0]|0;
  $915 = (+($914<<24>>24));
  $916 = $dy_ext0$8 * $915;
  $917 = $911 + $916;
  $918 = (($907) + 2)|0;
  $919 = (904 + ($918)|0);
  $920 = HEAP8[$919>>0]|0;
  $921 = (+($920<<24>>24));
  $922 = $dz_ext0$4 * $921;
  $923 = $917 + $922;
  $924 = $893 * $923;
  $925 = $value$11 + $924;
  $value$12 = $925;
 } else {
  $value$12 = $value$11;
 }
 $926 = $dx_ext1$7 * $dx_ext1$7;
 $927 = 2.0 - $926;
 $928 = $dy_ext1$7 * $dy_ext1$7;
 $929 = $927 - $928;
 $930 = $dz_ext1$3 * $dz_ext1$3;
 $931 = $929 - $930;
 $932 = $931 > 0.0;
 if (!($932)) {
  $value$13 = $value$12;
  $967 = $value$13 / 103.0;
  return (+$967);
 }
 $933 = $931 * $931;
 $934 = $933 * $933;
 $ctx$idx$val = HEAP32[$ctx>>2]|0;
 $ctx$idx24 = ((($ctx)) + 4|0);
 $ctx$idx24$val = HEAP32[$ctx$idx24>>2]|0;
 $935 = $xsv_ext1$7 & 255;
 $936 = (($ctx$idx$val) + ($935<<1)|0);
 $937 = HEAP16[$936>>1]|0;
 $938 = $937&65535;
 $939 = (($938) + ($ysv_ext1$7))|0;
 $940 = $939 & 255;
 $941 = (($ctx$idx$val) + ($940<<1)|0);
 $942 = HEAP16[$941>>1]|0;
 $943 = $942&65535;
 $944 = (($943) + ($zsv_ext1$3))|0;
 $945 = $944 & 255;
 $946 = (($ctx$idx24$val) + ($945<<1)|0);
 $947 = HEAP16[$946>>1]|0;
 $948 = $947 << 16 >> 16;
 $949 = (904 + ($948)|0);
 $950 = HEAP8[$949>>0]|0;
 $951 = (+($950<<24>>24));
 $952 = $dx_ext1$7 * $951;
 $953 = (($948) + 1)|0;
 $954 = (904 + ($953)|0);
 $955 = HEAP8[$954>>0]|0;
 $956 = (+($955<<24>>24));
 $957 = $dy_ext1$7 * $956;
 $958 = $952 + $957;
 $959 = (($948) + 2)|0;
 $960 = (904 + ($959)|0);
 $961 = HEAP8[$960>>0]|0;
 $962 = (+($961<<24>>24));
 $963 = $dz_ext1$3 * $962;
 $964 = $958 + $963;
 $965 = $934 * $964;
 $966 = $value$12 + $965;
 $value$13 = $966;
 $967 = $value$13 / 103.0;
 return (+$967);
}
function _heman_ops_step($hmap,$threshold) {
 $hmap = $hmap|0;
 $threshold = +$threshold;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $dst$02 = 0, $exitcond = 0, $i$03 = 0, $src$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($hmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((976|0),(1000|0),7,(1016|0));
  // unreachable;
 }
 $3 = HEAP32[$hmap>>2]|0;
 $4 = ((($hmap)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,1)|0);
 $7 = HEAP32[$4>>2]|0;
 $8 = HEAP32[$hmap>>2]|0;
 $9 = Math_imul($8, $7)|0;
 $10 = ($9|0)>(0);
 if (!($10)) {
  return ($6|0);
 }
 $11 = ((($6)) + 12|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($hmap)) + 12|0);
 $14 = HEAP32[$13>>2]|0;
 $dst$02 = $12;$i$03 = 0;$src$01 = $14;
 while(1) {
  $15 = ((($src$01)) + 4|0);
  $16 = +HEAPF32[$src$01>>2];
  $17 = $16 >= $threshold;
  $18 = $17&1;
  $19 = (+($18|0));
  $20 = ((($dst$02)) + 4|0);
  HEAPF32[$dst$02>>2] = $19;
  $21 = (($i$03) + 1)|0;
  $exitcond = ($21|0)==($9|0);
  if ($exitcond) {
   break;
  } else {
   $dst$02 = $20;$i$03 = $21;$src$01 = $15;
  }
 }
 return ($6|0);
}
function _heman_ops_sweep($hmap) {
 $hmap = $hmap|0;
 var $$lcssa = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $acc$02$us = 0.0, $dst$06 = 0, $dst$06$us = 0, $scevgep = 0, $smax = 0, $src$05$us = 0, $src$11$us = 0, $x$03$us = 0, $y$07 = 0;
 var $y$07$us = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($hmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((976|0),(1000|0),20,(1032|0));
  // unreachable;
 }
 $3 = ((($hmap)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = (_heman_image_create($4,1,1)|0);
 $6 = ((($5)) + 12|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ((($hmap)) + 12|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = HEAP32[$hmap>>2]|0;
 $11 = (+($10|0));
 $12 = 1.0 / $11;
 $13 = HEAP32[$3>>2]|0;
 $14 = ($13|0)>(0);
 if (!($14)) {
  return ($5|0);
 }
 $15 = ($10|0)>(0);
 if (!($15)) {
  $16 = $12 * 0.0;
  $dst$06 = $7;$y$07 = 0;
  while(1) {
   $27 = ((($dst$06)) + 4|0);
   HEAPF32[$dst$06>>2] = $16;
   $28 = (($y$07) + 1)|0;
   $29 = ($28|0)<($13|0);
   if ($29) {
    $dst$06 = $27;$y$07 = $28;
   } else {
    break;
   }
  }
  return ($5|0);
 }
 $17 = ($10|0)>(1);
 $smax = $17 ? $10 : 1;
 $dst$06$us = $7;$src$05$us = $9;$y$07$us = 0;
 while(1) {
  $acc$02$us = 0.0;$src$11$us = $src$05$us;$x$03$us = 0;
  while(1) {
   $22 = ((($src$11$us)) + 4|0);
   $23 = +HEAPF32[$src$11$us>>2];
   $24 = $acc$02$us + $23;
   $25 = (($x$03$us) + 1)|0;
   $26 = ($25|0)<($10|0);
   if ($26) {
    $acc$02$us = $24;$src$11$us = $22;$x$03$us = $25;
   } else {
    $$lcssa = $24;
    break;
   }
  }
  $scevgep = (($src$05$us) + ($smax<<2)|0);
  $18 = $12 * $$lcssa;
  $19 = ((($dst$06$us)) + 4|0);
  HEAPF32[$dst$06$us>>2] = $18;
  $20 = (($y$07$us) + 1)|0;
  $21 = ($20|0)<($13|0);
  if ($21) {
   $dst$06$us = $19;$src$05$us = $scevgep;$y$07$us = $20;
  } else {
   break;
  }
 }
 return ($5|0);
}
function _heman_ops_stitch_horizontal($images,$count) {
 $images = $images|0;
 $count = $count|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dstp3$05$i$us = 0, $exitcond = 0, $exitcond$i$us = 0, $exitcond10 = 0, $exitcond10$i$us = 0, $i$06 = 0, $nbands$06$i$us = 0, $srcp2$04$i$us = 0, $tile$02$us = 0, $x$03$i$us = 0, $x1$08$i$us = 0;
 var $y$03$us = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($count|0)>(0);
 if (!($0)) {
  ___assert_fail((1048|0),(1000|0),58,(1064|0));
  // unreachable;
 }
 $1 = HEAP32[$images>>2]|0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($1)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($1)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($count|0)>(1);
 L4: do {
  if ($7) {
   $i$06 = 1;
   while(1) {
    $10 = (($images) + ($i$06<<2)|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==($2|0);
    if (!($13)) {
     label = 6;
     break;
    }
    $14 = ((($11)) + 4|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)==($4|0);
    if (!($16)) {
     label = 8;
     break;
    }
    $17 = ((($11)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($18|0)==($6|0);
    $9 = (($i$06) + 1)|0;
    if (!($19)) {
     label = 10;
     break;
    }
    $8 = ($9|0)<($count|0);
    if ($8) {
     $i$06 = $9;
    } else {
     break L4;
    }
   }
   if ((label|0) == 6) {
    ___assert_fail((1096|0),(1000|0),63,(1064|0));
    // unreachable;
   }
   else if ((label|0) == 8) {
    ___assert_fail((1128|0),(1000|0),64,(1064|0));
    // unreachable;
   }
   else if ((label|0) == 10) {
    ___assert_fail((1160|0),(1000|0),65,(1064|0));
    // unreachable;
   }
  }
 } while(0);
 $20 = Math_imul($2, $count)|0;
 $21 = (_heman_image_create($20,$4,$6)|0);
 $22 = ($4|0)>(0);
 if ($22) {
  $y$03$us = 0;
 } else {
  return ($21|0);
 }
 while(1) {
  $tile$02$us = 0;
  while(1) {
   $24 = (($images) + ($tile$02$us<<2)|0);
   $25 = HEAP32[$24>>2]|0;
   $26 = Math_imul($tile$02$us, $2)|0;
   $27 = HEAP32[$25>>2]|0;
   $28 = ((($25)) + 8|0);
   $29 = HEAP32[$28>>2]|0;
   $30 = ($29|0)==(1);
   $31 = ($27|0)>(0);
   if ($30) {
    if ($31) {
     $x$03$i$us = 0;
     while(1) {
      $43 = (_heman_image_texel($25,$x$03$i$us,$y$03$us)|0);
      $44 = (($x$03$i$us) + ($26))|0;
      $45 = (_heman_image_texel($21,$44,$y$03$us)|0);
      $46 = HEAP32[$43>>2]|0;
      HEAP32[$45>>2] = $46;
      $47 = (($x$03$i$us) + 1)|0;
      $exitcond$i$us = ($47|0)==($27|0);
      if ($exitcond$i$us) {
       break;
      } else {
       $x$03$i$us = $47;
      }
     }
    }
   } else {
    if ($31) {
     $x1$08$i$us = 0;
     while(1) {
      $32 = (_heman_image_texel($25,$x1$08$i$us,$y$03$us)|0);
      $33 = (($x1$08$i$us) + ($26))|0;
      $34 = (_heman_image_texel($21,$33,$y$03$us)|0);
      $35 = HEAP32[$28>>2]|0;
      $36 = ($35|0)==(0);
      if (!($36)) {
       $dstp3$05$i$us = $34;$nbands$06$i$us = $35;$srcp2$04$i$us = $32;
       while(1) {
        $37 = (($nbands$06$i$us) + -1)|0;
        $38 = ((($srcp2$04$i$us)) + 4|0);
        $39 = HEAP32[$srcp2$04$i$us>>2]|0;
        $40 = ((($dstp3$05$i$us)) + 4|0);
        HEAP32[$dstp3$05$i$us>>2] = $39;
        $41 = ($37|0)==(0);
        if ($41) {
         break;
        } else {
         $dstp3$05$i$us = $40;$nbands$06$i$us = $37;$srcp2$04$i$us = $38;
        }
       }
      }
      $42 = (($x1$08$i$us) + 1)|0;
      $exitcond10$i$us = ($42|0)==($27|0);
      if ($exitcond10$i$us) {
       break;
      } else {
       $x1$08$i$us = $42;
      }
     }
    }
   }
   $48 = (($tile$02$us) + 1)|0;
   $exitcond = ($48|0)==($count|0);
   if ($exitcond) {
    break;
   } else {
    $tile$02$us = $48;
   }
  }
  $23 = (($y$03$us) + 1)|0;
  $exitcond10 = ($23|0)==($4|0);
  if ($exitcond10) {
   break;
  } else {
   $y$03$us = $23;
  }
 }
 return ($21|0);
}
function _heman_ops_stitch_vertical($images,$count) {
 $images = $images|0;
 $count = $count|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dst$01 = 0, $exitcond = 0, $i$03 = 0, $tile$02 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($count|0)>(0);
 if (!($0)) {
  ___assert_fail((1048|0),(1000|0),81,(1192|0));
  // unreachable;
 }
 $1 = HEAP32[$images>>2]|0;
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($1)) + 4|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ((($1)) + 8|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($count|0)>(1);
 L4: do {
  if ($7) {
   $i$03 = 1;
   while(1) {
    $10 = (($images) + ($i$03<<2)|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==($2|0);
    if (!($13)) {
     label = 6;
     break;
    }
    $14 = ((($11)) + 4|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)==($4|0);
    if (!($16)) {
     label = 8;
     break;
    }
    $17 = ((($11)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($18|0)==($6|0);
    $9 = (($i$03) + 1)|0;
    if (!($19)) {
     label = 10;
     break;
    }
    $8 = ($9|0)<($count|0);
    if ($8) {
     $i$03 = $9;
    } else {
     break L4;
    }
   }
   if ((label|0) == 6) {
    ___assert_fail((1096|0),(1000|0),86,(1192|0));
    // unreachable;
   }
   else if ((label|0) == 8) {
    ___assert_fail((1128|0),(1000|0),87,(1192|0));
    // unreachable;
   }
   else if ((label|0) == 10) {
    ___assert_fail((1160|0),(1000|0),88,(1192|0));
    // unreachable;
   }
  }
 } while(0);
 $20 = Math_imul($4, $count)|0;
 $21 = (_heman_image_create($2,$20,$6)|0);
 $22 = Math_imul($4, $2)|0;
 $23 = Math_imul($22, $6)|0;
 $24 = ((($21)) + 12|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = $23 << 2;
 $dst$01 = $25;$tile$02 = 0;
 while(1) {
  $27 = (($images) + ($tile$02<<2)|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = ((($28)) + 12|0);
  $30 = HEAP32[$29>>2]|0;
  _memcpy(($dst$01|0),($30|0),($26|0))|0;
  $31 = (($dst$01) + ($23<<2)|0);
  $32 = (($tile$02) + 1)|0;
  $exitcond = ($32|0)==($count|0);
  if ($exitcond) {
   break;
  } else {
   $dst$01 = $31;$tile$02 = $32;
  }
 }
 return ($21|0);
}
function _heman_ops_normalize_f32($source,$minv,$maxv) {
 $source = $source|0;
 $minv = +$minv;
 $maxv = +$maxv;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0, $25 = 0.0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $dst$01 = 0, $exitcond = 0, $i$02 = 0, $src$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$source>>2]|0;
 $1 = ((($source)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($source)) + 8|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = (_heman_image_create($0,$2,$4)|0);
 $6 = $maxv - $minv;
 $7 = 1.0 / $6;
 $8 = HEAP32[$1>>2]|0;
 $9 = HEAP32[$source>>2]|0;
 $10 = Math_imul($9, $8)|0;
 $11 = HEAP32[$3>>2]|0;
 $12 = Math_imul($10, $11)|0;
 $13 = ($12|0)>(0);
 if (!($13)) {
  return ($5|0);
 }
 $14 = ((($5)) + 12|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ((($source)) + 12|0);
 $17 = HEAP32[$16>>2]|0;
 $dst$01 = $15;$i$02 = 0;$src$03 = $17;
 while(1) {
  $18 = ((($src$03)) + 4|0);
  $19 = +HEAPF32[$src$03>>2];
  $20 = $19 - $minv;
  $21 = $7 * $20;
  $22 = $21 < 1.0;
  $23 = $22 ? $21 : 1.0;
  $24 = $23 < 0.0;
  $25 = $24 ? 0.0 : $23;
  $26 = ((($dst$01)) + 4|0);
  HEAPF32[$dst$01>>2] = $25;
  $27 = (($i$02) + 1)|0;
  $exitcond = ($27|0)==($12|0);
  if ($exitcond) {
   break;
  } else {
   $dst$01 = $26;$i$02 = $27;$src$03 = $18;
  }
 }
 return ($5|0);
}
function _heman_ops_laplacian($heightmap) {
 $heightmap = $heightmap|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dst$02$us = 0, $exitcond = 0, $exitcond5 = 0, $x$01$us = 0, $y$03$us = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($heightmap)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(1);
 if (!($2)) {
  ___assert_fail((1224|0),(1000|0),118,(1248|0));
  // unreachable;
 }
 $3 = HEAP32[$heightmap>>2]|0;
 $4 = ((($heightmap)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (_heman_image_create($3,$5,1)|0);
 $7 = (($3) + -1)|0;
 $8 = (($5) + -1)|0;
 $9 = ($5|0)>(0);
 if (!($9)) {
  return ($6|0);
 }
 $10 = ((($6)) + 12|0);
 $11 = ($3|0)>(0);
 if ($11) {
  $y$03$us = 0;
 } else {
  return ($6|0);
 }
 while(1) {
  $28 = (($y$03$us) + 1)|0;
  $29 = ($28|0)>($8|0);
  $19 = $29 ? $8 : $28;
  $30 = HEAP32[$10>>2]|0;
  $31 = Math_imul($y$03$us, $3)|0;
  $32 = (($30) + ($31<<2)|0);
  $dst$02$us = $32;$x$01$us = 0;
  while(1) {
   $12 = (($x$01$us) + 1)|0;
   $13 = ($12|0)>($7|0);
   $14 = $13 ? $7 : $12;
   $15 = (_heman_image_texel($heightmap,$x$01$us,$y$03$us)|0);
   $16 = +HEAPF32[$15>>2];
   $17 = (_heman_image_texel($heightmap,$14,$y$03$us)|0);
   $18 = +HEAPF32[$17>>2];
   $20 = (_heman_image_texel($heightmap,$x$01$us,$19)|0);
   $21 = +HEAPF32[$20>>2];
   $22 = $16 - $18;
   $23 = $22 * $22;
   $24 = $16 - $21;
   $25 = $24 * $24;
   $26 = $23 + $25;
   $27 = ((($dst$02$us)) + 4|0);
   HEAPF32[$dst$02$us>>2] = $26;
   $exitcond = ($12|0)==($3|0);
   if ($exitcond) {
    break;
   } else {
    $dst$02$us = $27;$x$01$us = $12;
   }
  }
  $exitcond5 = ($28|0)==($5|0);
  if ($exitcond5) {
   break;
  } else {
   $y$03$us = $28;
  }
 }
 return ($6|0);
}
function _heman_ops_accumulate($dst,$src) {
 $dst = $dst|0;
 $src = $src|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0, $3 = 0, $4 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ddata$02 = 0, $exitcond = 0, $i$03 = 0, $sdata$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($dst)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($src)) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1|0)==($3|0);
 if (!($4)) {
  ___assert_fail((1272|0),(1000|0),143,(1304|0));
  // unreachable;
 }
 $5 = HEAP32[$dst>>2]|0;
 $6 = HEAP32[$src>>2]|0;
 $7 = ($5|0)==($6|0);
 if (!($7)) {
  ___assert_fail((1328|0),(1000|0),144,(1304|0));
  // unreachable;
 }
 $8 = ((($dst)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ((($src)) + 4|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = ($9|0)==($11|0);
 if (!($12)) {
  ___assert_fail((1360|0),(1000|0),145,(1304|0));
  // unreachable;
 }
 $13 = Math_imul($9, $5)|0;
 $14 = ($13|0)>(0);
 if (!($14)) {
  return;
 }
 $15 = ((($dst)) + 12|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ((($src)) + 12|0);
 $18 = HEAP32[$17>>2]|0;
 $ddata$02 = $16;$i$03 = 0;$sdata$01 = $18;
 while(1) {
  $19 = ((($sdata$01)) + 4|0);
  $20 = +HEAPF32[$sdata$01>>2];
  $21 = ((($ddata$02)) + 4|0);
  $22 = +HEAPF32[$ddata$02>>2];
  $23 = $20 + $22;
  HEAPF32[$ddata$02>>2] = $23;
  $24 = (($i$03) + 1)|0;
  $exitcond = ($24|0)==($13|0);
  if ($exitcond) {
   break;
  } else {
   $ddata$02 = $21;$i$03 = $24;$sdata$01 = $19;
  }
 }
 return;
}
function _kmSQR($s) {
 $s = +$s;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $s * $s;
 return (+$0);
}
function _kmMax($lhs,$rhs) {
 $lhs = +$lhs;
 $rhs = +$rhs;
 var $0 = 0, $1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $lhs > $rhs;
 $1 = $0 ? $lhs : $rhs;
 return (+$1);
}
function _kmClamp($x,$min,$max) {
 $x = +$x;
 $min = +$min;
 $max = +$max;
 var $0 = 0, $1 = 0, $2 = 0.0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x < $min;
 $1 = $x > $max;
 $2 = $1 ? $max : $x;
 $3 = $0 ? $min : $2;
 return (+$3);
}
function _kmVec3Length($pIn) {
 $pIn = $pIn|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$pIn>>2];
 $1 = (+_kmSQR($0));
 $2 = ((($pIn)) + 4|0);
 $3 = +HEAPF32[$2>>2];
 $4 = (+_kmSQR($3));
 $5 = $1 + $4;
 $6 = ((($pIn)) + 8|0);
 $7 = +HEAPF32[$6>>2];
 $8 = (+_kmSQR($7));
 $9 = $5 + $8;
 $10 = (+Math_sqrt((+$9)));
 return (+$10);
}
function _kmVec3Lerp($pOut,$pV1,$pV2,$t) {
 $pOut = $pOut|0;
 $pV1 = $pV1|0;
 $pV2 = $pV2|0;
 $t = +$t;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0, $3 = 0.0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0;
 var $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$pV1>>2];
 $1 = +HEAPF32[$pV2>>2];
 $2 = $1 - $0;
 $3 = $2 * $t;
 $4 = $0 + $3;
 HEAPF32[$pOut>>2] = $4;
 $5 = ((($pV1)) + 4|0);
 $6 = +HEAPF32[$5>>2];
 $7 = ((($pV2)) + 4|0);
 $8 = +HEAPF32[$7>>2];
 $9 = $8 - $6;
 $10 = $9 * $t;
 $11 = $6 + $10;
 $12 = ((($pOut)) + 4|0);
 HEAPF32[$12>>2] = $11;
 $13 = ((($pV1)) + 8|0);
 $14 = +HEAPF32[$13>>2];
 $15 = ((($pV2)) + 8|0);
 $16 = +HEAPF32[$15>>2];
 $17 = $16 - $14;
 $18 = $17 * $t;
 $19 = $14 + $18;
 $20 = ((($pOut)) + 8|0);
 HEAPF32[$20>>2] = $19;
 return ($pOut|0);
}
function _kmVec3Normalize($pOut,$pIn) {
 $pOut = $pOut|0;
 $pIn = $pIn|0;
 var $$pre = 0, $0 = 0.0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0, $27 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$pIn>>2];
 $1 = $0 != 0.0;
 $$pre = ((($pIn)) + 4|0);
 if (!($1)) {
  $2 = +HEAPF32[$$pre>>2];
  $3 = $2 != 0.0;
  if (!($3)) {
   $4 = ((($pIn)) + 8|0);
   $5 = +HEAPF32[$4>>2];
   $6 = $5 != 0.0;
   if (!($6)) {
    $7 = ($pOut|0)==($pIn|0);
    if ($7) {
     return ($pOut|0);
    }
    HEAPF32[$pOut>>2] = $0;
    $8 = ((($pOut)) + 4|0);
    HEAPF32[$8>>2] = $2;
    $9 = ((($pOut)) + 8|0);
    HEAPF32[$9>>2] = $5;
    return ($pOut|0);
   }
  }
 }
 $10 = (+_kmSQR($0));
 $11 = +HEAPF32[$$pre>>2];
 $12 = (+_kmSQR($11));
 $13 = $10 + $12;
 $14 = ((($pIn)) + 8|0);
 $15 = +HEAPF32[$14>>2];
 $16 = (+_kmSQR($15));
 $17 = $13 + $16;
 $18 = (+Math_sqrt((+$17)));
 $19 = 1.0 / $18;
 $20 = +HEAPF32[$pIn>>2];
 $21 = $19 * $20;
 $22 = +HEAPF32[$$pre>>2];
 $23 = $19 * $22;
 $24 = +HEAPF32[$14>>2];
 $25 = $19 * $24;
 HEAPF32[$pOut>>2] = $21;
 $26 = ((($pOut)) + 4|0);
 HEAPF32[$26>>2] = $23;
 $27 = ((($pOut)) + 8|0);
 HEAPF32[$27>>2] = $25;
 return ($pOut|0);
}
function _kmVec3Cross($pOut,$pV1,$pV2) {
 $pOut = $pOut|0;
 $pV1 = $pV1|0;
 $pV2 = $pV2|0;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $3 = 0.0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0;
 var $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($pV1)) + 4|0);
 $1 = +HEAPF32[$0>>2];
 $2 = ((($pV2)) + 8|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $1 * $3;
 $5 = ((($pV1)) + 8|0);
 $6 = +HEAPF32[$5>>2];
 $7 = ((($pV2)) + 4|0);
 $8 = +HEAPF32[$7>>2];
 $9 = $6 * $8;
 $10 = $4 - $9;
 $11 = +HEAPF32[$pV2>>2];
 $12 = $6 * $11;
 $13 = +HEAPF32[$pV1>>2];
 $14 = $3 * $13;
 $15 = $12 - $14;
 $16 = $8 * $13;
 $17 = $1 * $11;
 $18 = $16 - $17;
 HEAPF32[$pOut>>2] = $10;
 $19 = ((($pOut)) + 4|0);
 HEAPF32[$19>>2] = $15;
 $20 = ((($pOut)) + 8|0);
 HEAPF32[$20>>2] = $18;
 return ($pOut|0);
}
function _kmVec3Dot($pV1,$pV2) {
 $pV1 = $pV1|0;
 $pV2 = $pV2|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$pV1>>2];
 $1 = +HEAPF32[$pV2>>2];
 $2 = $0 * $1;
 $3 = ((($pV1)) + 4|0);
 $4 = +HEAPF32[$3>>2];
 $5 = ((($pV2)) + 4|0);
 $6 = +HEAPF32[$5>>2];
 $7 = $4 * $6;
 $8 = $2 + $7;
 $9 = ((($pV1)) + 8|0);
 $10 = +HEAPF32[$9>>2];
 $11 = ((($pV2)) + 8|0);
 $12 = +HEAPF32[$11>>2];
 $13 = $10 * $12;
 $14 = $8 + $13;
 return (+$14);
}
function _kmVec3Subtract($pOut,$pV1,$pV2) {
 $pOut = $pOut|0;
 $pV1 = $pV1|0;
 $pV2 = $pV2|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$pV1>>2];
 $1 = +HEAPF32[$pV2>>2];
 $2 = $0 - $1;
 $3 = ((($pV1)) + 4|0);
 $4 = +HEAPF32[$3>>2];
 $5 = ((($pV2)) + 4|0);
 $6 = +HEAPF32[$5>>2];
 $7 = $4 - $6;
 $8 = ((($pV1)) + 8|0);
 $9 = +HEAPF32[$8>>2];
 $10 = ((($pV2)) + 8|0);
 $11 = +HEAPF32[$10>>2];
 $12 = $9 - $11;
 HEAPF32[$pOut>>2] = $2;
 $13 = ((($pOut)) + 4|0);
 HEAPF32[$13>>2] = $7;
 $14 = ((($pOut)) + 8|0);
 HEAPF32[$14>>2] = $12;
 return ($pOut|0);
}
function _kmVec3Scale($pOut,$pIn,$s) {
 $pOut = $pOut|0;
 $pIn = $pIn|0;
 $s = +$s;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$pIn>>2];
 $1 = $0 * $s;
 HEAPF32[$pOut>>2] = $1;
 $2 = ((($pIn)) + 4|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $3 * $s;
 $5 = ((($pOut)) + 4|0);
 HEAPF32[$5>>2] = $4;
 $6 = ((($pIn)) + 8|0);
 $7 = +HEAPF32[$6>>2];
 $8 = $7 * $s;
 $9 = ((($pOut)) + 8|0);
 HEAPF32[$9>>2] = $8;
 return ($pOut|0);
}
function __ZN34EmscriptenBindingInitializer_hemanC2Ev($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 __embind_register_class((1408|0),(1416|0),(1432|0),(0|0),(1448|0),(24|0),(1456|0),(0|0),(1456|0),(0|0),(1464|0),(1472|0),(25|0));
 $0 = (__Znwj(4)|0);
 HEAP32[$0>>2] = (26);
 __embind_register_class_function((1408|0),(1480|0),2,(1488|0),(1496|0),(27|0),($0|0),0);
 $1 = (__Znwj(4)|0);
 HEAP32[$1>>2] = (28);
 __embind_register_class_function((1408|0),(1504|0),2,(1488|0),(1496|0),(27|0),($1|0),0);
 $2 = (__Znwj(4)|0);
 HEAP32[$2>>2] = (29);
 __embind_register_class_function((1408|0),(1512|0),2,(1488|0),(1496|0),(27|0),($2|0),0);
 $3 = (__Znwj(4)|0);
 HEAP32[$3>>2] = (30);
 __embind_register_class_function((1408|0),(1520|0),2,(1488|0),(1496|0),(27|0),($3|0),0);
 $4 = (__Znwj(4)|0);
 HEAP32[$4>>2] = (31);
 __embind_register_class_function((1408|0),(1528|0),2,(1488|0),(1496|0),(27|0),($4|0),0);
 __embind_register_class((1536|0),(1544|0),(1560|0),(0|0),(1576|0),(32|0),(1456|0),(0|0),(1456|0),(0|0),(1584|0),(1592|0),(33|0));
 __embind_register_class_class_function((1536|0),(1600|0),4,(1608|0),(1624|0),(34|0),(35|0));
 __embind_register_class_class_function((1536|0),(1632|0),2,(1640|0),(1648|0),(36|0),(37|0));
 __embind_register_class((1656|0),(1664|0),(1680|0),(0|0),(1696|0),(38|0),(1456|0),(0|0),(1456|0),(0|0),(1704|0),(1720|0),(39|0));
 __embind_register_class_class_function((1656|0),(1728|0),4,(1608|0),(1624|0),(34|0),(40|0));
 __embind_register_class_class_function((1656|0),(1752|0),4,(1608|0),(1624|0),(34|0),(41|0));
 __embind_register_class_class_function((1656|0),(1776|0),9,(1792|0),(1832|0),(42|0),(43|0));
 __embind_register_class((1848|0),(1856|0),(1872|0),(0|0),(1888|0),(44|0),(1456|0),(0|0),(1456|0),(0|0),(1896|0),(1904|0),(45|0));
 __embind_register_class_class_function((1848|0),(1912|0),3,(1936|0),(1952|0),(46|0),(47|0));
 __embind_register_class_class_function((1848|0),(1960|0),3,(1936|0),(1952|0),(46|0),(48|0));
 __embind_register_class_class_function((1848|0),(1976|0),4,(1992|0),(2008|0),(49|0),(50|0));
 __embind_register_class_class_function((1848|0),(2016|0),3,(2024|0),(2040|0),(51|0),(52|0));
 __embind_register_class_class_function((1848|0),(2048|0),2,(2056|0),(2064|0),(53|0),(54|0));
 __embind_register_class_class_function((1848|0),(2072|0),2,(2056|0),(2064|0),(53|0),(55|0));
 __embind_register_class_class_function((1848|0),(2088|0),3,(2104|0),(2120|0),(56|0),(57|0));
 __embind_register_class((2128|0),(2136|0),(2152|0),(0|0),(2168|0),(58|0),(1456|0),(0|0),(1456|0),(0|0),(2176|0),(2192|0),(59|0));
 __embind_register_class_class_function((2128|0),(2200|0),5,(2208|0),(2232|0),(60|0),(61|0));
 __embind_register_class_class_function((2128|0),(2240|0),2,(2056|0),(2064|0),(53|0),(62|0));
 __embind_register_class_class_function((2128|0),(2256|0),2,(2056|0),(2064|0),(53|0),(63|0));
 __embind_register_class((2280|0),(2288|0),(2304|0),(0|0),(2320|0),(64|0),(1456|0),(0|0),(1456|0),(0|0),(2328|0),(2336|0),(65|0));
 __embind_register_class_class_function((2280|0),(2344|0),5,(2360|0),(2384|0),(66|0),(67|0));
 __embind_register_class_class_function((2280|0),(2392|0),2,(2408|0),(2416|0),(68|0),(69|0));
 __embind_register_class_class_function((2280|0),(2424|0),5,(2440|0),(2464|0),(70|0),(71|0));
 __embind_register_class_class_function((2280|0),(2472|0),2,(2056|0),(2064|0),(53|0),(72|0));
 return;
}
function __ZN10emscripten8internal13getActualTypeI13heman_image_sEEPKvPT_($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (1408|0);
}
function __ZN10emscripten8internal14raw_destructorI13heman_image_sEEvPT_($ptr) {
 $ptr = $ptr|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($ptr);
 return;
}
function __ZL12buffer_widthP13heman_image_s($img) {
 $img = $img|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$img>>2]|0;
 return ($0|0);
}
function __ZN10emscripten8internal15FunctionInvokerIPFiP13heman_image_sEiS3_JEE6invokeEPS5_S3_($function,$wireThis) {
 $function = $function|0;
 $wireThis = $wireThis|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$function>>2]|0;
 $1 = (FUNCTION_TABLE_ii[$0 & 127]($wireThis)|0);
 return ($1|0);
}
function __ZL13buffer_heightP13heman_image_s($img) {
 $img = $img|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($img)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function __ZL13buffer_nbandsP13heman_image_s($img) {
 $img = $img|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($img)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function __ZL12buffer_beginP13heman_image_s($img) {
 $img = $img|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($img)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1;
 $3 = $2 >>> 2;
 return ($3|0);
}
function __ZL10buffer_endP13heman_image_s($img) {
 $img = $img|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($img)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP32[$img>>2]|0;
 $3 = Math_imul($2, $1)|0;
 $4 = ((($img)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = Math_imul($3, $5)|0;
 $7 = ((($img)) + 12|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $8;
 $10 = $9 >>> 2;
 $11 = (($10) + ($6))|0;
 return ($11|0);
}
function __ZN10emscripten8internal13getActualTypeI5ImageEEPKvPT_($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (1536|0);
}
function __ZN10emscripten8internal14raw_destructorI5ImageEEvPT_($ptr) {
 $ptr = $ptr|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($ptr);
 return;
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJiiiEE6invokeEPFS3_iiiEiii($fn,$args,$args1,$args2) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = $args1|0;
 $args2 = $args2|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iiii[$fn & 63]($args,$args1,$args2)|0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIvJP13heman_image_sEE6invokeEPFvS3_ES3_($fn,$args) {
 $fn = $fn|0;
 $args = $args|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 FUNCTION_TABLE_vi[$fn & 127]($args);
 return;
}
function __ZN10emscripten8internal13getActualTypeI8GenerateEEPKvPT_($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (1656|0);
}
function __ZN10emscripten8internal14raw_destructorI8GenerateEEvPT_($ptr) {
 $ptr = $ptr|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($ptr);
 return;
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJiiffiffiEE6invokeEPFS3_iiffiffiEiiffiffi($fn,$args,$args1,$args2,$args3,$args4,$args5,$args6,$args7) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = $args1|0;
 $args2 = +$args2;
 $args3 = +$args3;
 $args4 = $args4|0;
 $args5 = +$args5;
 $args6 = +$args6;
 $args7 = $args7|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iiiddiddi[$fn & 63]($args,$args1,$args2,$args3,$args4,$args5,$args6,$args7)|0);
 return ($0|0);
}
function __ZN10emscripten8internal13getActualTypeI3OpsEEPKvPT_($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (1848|0);
}
function __ZN10emscripten8internal14raw_destructorI3OpsEEvPT_($ptr) {
 $ptr = $ptr|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($ptr);
 return;
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJPS3_iEE6invokeEPFS3_S4_iES4_i($fn,$args,$args1) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = $args1|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iii[$fn & 63]($args,$args1)|0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJS3_ffEE6invokeEPFS3_S3_ffES3_ff($fn,$args,$args1,$args2) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = +$args1;
 $args2 = +$args2;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iidd[$fn & 63]($args,$args1,$args2)|0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJS3_fEE6invokeEPFS3_S3_fES3_f($fn,$args,$args1) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = +$args1;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iid[$fn & 63]($args,$args1)|0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJS3_EE6invokeEPFS3_S3_ES3_($fn,$args) {
 $fn = $fn|0;
 $args = $args|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_ii[$fn & 127]($args)|0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIvJP13heman_image_sS3_EE6invokeEPFvS3_S3_ES3_S3_($fn,$args,$args1) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = $args1|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 FUNCTION_TABLE_vii[$fn & 63]($args,$args1);
 return;
}
function __ZN10emscripten8internal13getActualTypeI8LightingEEPKvPT_($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (2128|0);
}
function __ZN10emscripten8internal14raw_destructorI8LightingEEvPT_($ptr) {
 $ptr = $ptr|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($ptr);
 return;
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJS3_fffEE6invokeEPFS3_S3_fffES3_fff($fn,$args,$args1,$args2,$args3) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = +$args1;
 $args2 = +$args2;
 $args3 = +$args3;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iiddd[$fn & 63]($args,$args1,$args2,$args3)|0);
 return ($0|0);
}
function __ZL14lighting_applyP13heman_image_sfff($hmap,$occlusion,$diffuse,$softening) {
 $hmap = $hmap|0;
 $occlusion = +$occlusion;
 $diffuse = +$diffuse;
 $softening = +$softening;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_heman_lighting_apply($hmap,0,$occlusion,$diffuse,$softening,0)|0);
 return ($0|0);
}
function __ZN10emscripten8internal13getActualTypeI5ColorEEPKvPT_($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (2280|0);
}
function __ZN10emscripten8internal14raw_destructorI5ColorEEvPT_($ptr) {
 $ptr = $ptr|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($ptr);
 return;
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJiiPKiPKjEE6invokeEPFS3_iiS5_S7_EiiS5_S7_($fn,$args,$args1,$args2,$args3) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = $args1|0;
 $args2 = $args2|0;
 $args3 = $args3|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iiiii[$fn & 127]($args,$args1,$args2,$args3)|0);
 return ($0|0);
}
function __ZN10emscripten8internal7InvokerIvJfEE6invokeEPFvfEf($fn,$args) {
 $fn = $fn|0;
 $args = +$args;
 var label = 0, sp = 0;
 sp = STACKTOP;
 FUNCTION_TABLE_vd[$fn & 127]($args);
 return;
}
function __ZN10emscripten8internal7InvokerIP13heman_image_sJS3_ffS3_EE6invokeEPFS3_S3_ffS3_ES3_ffS3_($fn,$args,$args1,$args2,$args3) {
 $fn = $fn|0;
 $args = $args|0;
 $args1 = +$args1;
 $args2 = +$args2;
 $args3 = $args3|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (FUNCTION_TABLE_iiddi[$fn & 127]($args,$args1,$args2,$args3)|0);
 return ($0|0);
}
function __GLOBAL__sub_I_wrapjs_cpp() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN34EmscriptenBindingInitializer_hemanC2Ev(0);
 return;
}
function ___getTypeName($ti) {
 $ti = $ti|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ti;
 $2 = $1;
 $0 = $2;
 $3 = $0;
 $4 = ((($3)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = (___strdup($5)|0);
 STACKTOP = sp;return ($6|0);
}
function __ZN53EmscriptenBindingInitializer_native_and_builtin_typesC2Ev($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $this;
 $1 = (__ZN10emscripten8internal6TypeIDIvE3getEv()|0);
 __embind_register_void(($1|0),(2776|0));
 $2 = (__ZN10emscripten8internal6TypeIDIbE3getEv()|0);
 __embind_register_bool(($2|0),(2784|0),1,1,0);
 __ZN12_GLOBAL__N_1L16register_integerIcEEvPKc(2792);
 __ZN12_GLOBAL__N_1L16register_integerIaEEvPKc(2800);
 __ZN12_GLOBAL__N_1L16register_integerIhEEvPKc(2816);
 __ZN12_GLOBAL__N_1L16register_integerIsEEvPKc(2832);
 __ZN12_GLOBAL__N_1L16register_integerItEEvPKc(2840);
 __ZN12_GLOBAL__N_1L16register_integerIiEEvPKc(2856);
 __ZN12_GLOBAL__N_1L16register_integerIjEEvPKc(2864);
 __ZN12_GLOBAL__N_1L16register_integerIlEEvPKc(2880);
 __ZN12_GLOBAL__N_1L16register_integerImEEvPKc(2888);
 __ZN12_GLOBAL__N_1L14register_floatIfEEvPKc(2904);
 __ZN12_GLOBAL__N_1L14register_floatIdEEvPKc(2912);
 $3 = (__ZN10emscripten8internal6TypeIDINSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv()|0);
 __embind_register_std_string(($3|0),(2920|0));
 $4 = (__ZN10emscripten8internal6TypeIDINSt3__112basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv()|0);
 __embind_register_std_string(($4|0),(2936|0));
 $5 = (__ZN10emscripten8internal6TypeIDINSt3__112basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv()|0);
 __embind_register_std_wstring(($5|0),4,(2976|0));
 $6 = (__ZN10emscripten8internal6TypeIDINS_3valEE3getEv()|0);
 __embind_register_emval(($6|0),(2992|0));
 __ZN12_GLOBAL__N_1L20register_memory_viewIcEEvPKc(3008);
 __ZN12_GLOBAL__N_1L20register_memory_viewIaEEvPKc(3040);
 __ZN12_GLOBAL__N_1L20register_memory_viewIhEEvPKc(3080);
 __ZN12_GLOBAL__N_1L20register_memory_viewIsEEvPKc(3120);
 __ZN12_GLOBAL__N_1L20register_memory_viewItEEvPKc(3152);
 __ZN12_GLOBAL__N_1L20register_memory_viewIiEEvPKc(3192);
 __ZN12_GLOBAL__N_1L20register_memory_viewIjEEvPKc(3224);
 __ZN12_GLOBAL__N_1L20register_memory_viewIlEEvPKc(3264);
 __ZN12_GLOBAL__N_1L20register_memory_viewImEEvPKc(3296);
 __ZN12_GLOBAL__N_1L20register_memory_viewIaEEvPKc(3336);
 __ZN12_GLOBAL__N_1L20register_memory_viewIhEEvPKc(3368);
 __ZN12_GLOBAL__N_1L20register_memory_viewIsEEvPKc(3408);
 __ZN12_GLOBAL__N_1L20register_memory_viewItEEvPKc(3448);
 __ZN12_GLOBAL__N_1L20register_memory_viewIiEEvPKc(3488);
 __ZN12_GLOBAL__N_1L20register_memory_viewIjEEvPKc(3528);
 __ZN12_GLOBAL__N_1L20register_memory_viewIfEEvPKc(3568);
 __ZN12_GLOBAL__N_1L20register_memory_viewIdEEvPKc(3600);
 __ZN12_GLOBAL__N_1L20register_memory_viewIeEEvPKc(3632);
 STACKTOP = sp;return;
}
function __GLOBAL__sub_I_bind_cpp() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___cxx_global_var_init();
 return;
}
function __ZN10emscripten8internal6TypeIDIvE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIvE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDIbE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIbE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_1L16register_integerIcEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIcE3getEv()|0);
 $2 = $0;
 $3 = -128 << 24 >> 24;
 $4 = 127 << 24 >> 24;
 __embind_register_integer(($1|0),($2|0),1,($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIaEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIaE3getEv()|0);
 $2 = $0;
 $3 = -128 << 24 >> 24;
 $4 = 127 << 24 >> 24;
 __embind_register_integer(($1|0),($2|0),1,($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIhEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIhE3getEv()|0);
 $2 = $0;
 $3 = 0;
 $4 = 255;
 __embind_register_integer(($1|0),($2|0),1,($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIsEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIsE3getEv()|0);
 $2 = $0;
 $3 = -32768 << 16 >> 16;
 $4 = 32767 << 16 >> 16;
 __embind_register_integer(($1|0),($2|0),2,($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerItEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDItE3getEv()|0);
 $2 = $0;
 $3 = 0;
 $4 = 65535;
 __embind_register_integer(($1|0),($2|0),2,($3|0),($4|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIiEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIiE3getEv()|0);
 $2 = $0;
 __embind_register_integer(($1|0),($2|0),4,-2147483648,2147483647);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIjEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIjE3getEv()|0);
 $2 = $0;
 __embind_register_integer(($1|0),($2|0),4,0,-1);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerIlEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIlE3getEv()|0);
 $2 = $0;
 __embind_register_integer(($1|0),($2|0),4,-2147483648,2147483647);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L16register_integerImEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDImE3getEv()|0);
 $2 = $0;
 __embind_register_integer(($1|0),($2|0),4,0,-1);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L14register_floatIfEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIfE3getEv()|0);
 $2 = $0;
 __embind_register_float(($1|0),($2|0),4);
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L14register_floatIdEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDIdE3getEv()|0);
 $2 = $0;
 __embind_register_float(($1|0),($2|0),8);
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDINSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINSt3__112basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__112basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINSt3__112basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINSt3__112basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal6TypeIDINS_3valEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_3valEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIcEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIcEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIcEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIaEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIaEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIaEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIhEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIhEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIhEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIsEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIsEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIsEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewItEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewItEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexItEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIiEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIiEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIiEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIjEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIjEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIjEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIlEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIlEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIlEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewImEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewImEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexImEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIfEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIfEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIfEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIdEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIdEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIdEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN12_GLOBAL__N_1L20register_memory_viewIeEEvPKc($name) {
 $name = $name|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $name;
 $1 = (__ZN10emscripten8internal6TypeIDINS_11memory_viewIeEEE3getEv()|0);
 $2 = (__ZN12_GLOBAL__N_118getTypedArrayIndexIeEENS_15TypedArrayIndexEv()|0);
 $3 = $0;
 __embind_register_memory_view(($1|0),($2|0),($3|0));
 STACKTOP = sp;return;
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIeEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIeEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIeEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 7;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIeEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3672|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIdEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIdEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIdEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 7;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIdEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3712|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIfEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIfEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIfEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 6;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIfEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3752|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewImEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewImEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexImEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 5;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewImEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3792|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIlEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIlEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIlEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 4;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIlEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3832|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIjEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIjEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIjEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 5;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIjEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3872|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIiEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIiEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIiEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 4;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIiEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3912|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewItEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewItEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexItEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 3;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewItEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3952|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIsEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIsEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIsEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 2;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIsEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (3992|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIhEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIhEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIhEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 1;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIhEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4032|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIaEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIaEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIaEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIaEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4072|0);
}
function __ZN10emscripten8internal6TypeIDINS_11memory_viewIcEEE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDINS_11memory_viewIcEEE3getEv()|0);
 return ($0|0);
}
function __ZN12_GLOBAL__N_118getTypedArrayIndexIcEENS_15TypedArrayIndexEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function __ZN10emscripten8internal11LightTypeIDINS_11memory_viewIcEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4112|0);
}
function __ZN10emscripten8internal11LightTypeIDINS_3valEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4152|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__112basic_stringIwNS2_11char_traitsIwEENS2_9allocatorIwEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4184|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__112basic_stringIhNS2_11char_traitsIhEENS2_9allocatorIhEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4320|0);
}
function __ZN10emscripten8internal11LightTypeIDINSt3__112basic_stringIcNS2_11char_traitsIcEENS2_9allocatorIcEEEEE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4408|0);
}
function __ZN10emscripten8internal6TypeIDIdE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIdE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIdE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5192|0);
}
function __ZN10emscripten8internal6TypeIDIfE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIfE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIfE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5176|0);
}
function __ZN10emscripten8internal6TypeIDImE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDImE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDImE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5160|0);
}
function __ZN10emscripten8internal6TypeIDIlE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIlE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIlE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5144|0);
}
function __ZN10emscripten8internal6TypeIDIjE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIjE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIjE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5104|0);
}
function __ZN10emscripten8internal6TypeIDIiE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIiE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIiE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5064|0);
}
function __ZN10emscripten8internal6TypeIDItE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDItE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDItE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5048|0);
}
function __ZN10emscripten8internal6TypeIDIsE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIsE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIsE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5032|0);
}
function __ZN10emscripten8internal6TypeIDIhE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIhE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIhE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5000|0);
}
function __ZN10emscripten8internal6TypeIDIaE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIaE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIaE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5016|0);
}
function __ZN10emscripten8internal6TypeIDIcE3getEv() {
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZN10emscripten8internal11LightTypeIDIcE3getEv()|0);
 return ($0|0);
}
function __ZN10emscripten8internal11LightTypeIDIcE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4984|0);
}
function __ZN10emscripten8internal11LightTypeIDIbE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4968|0);
}
function __ZN10emscripten8internal11LightTypeIDIvE3getEv() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (4936|0);
}
function ___cxx_global_var_init() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN53EmscriptenBindingInitializer_native_and_builtin_typesC2Ev(4496);
 return;
}
function ___strdup($s) {
 $s = $s|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_strlen(($s|0))|0);
 $1 = (($0) + 1)|0;
 $2 = (_malloc($1)|0);
 $3 = ($2|0)==(0|0);
 if ($3) {
  $$0 = 0;
  return ($$0|0);
 }
 _memcpy(($2|0),($s|0),($1|0))|0;
 $$0 = $2;
 return ($$0|0);
}
function __Znwj($size) {
 $size = $size|0;
 var $$lcssa = 0, $$size = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($size|0)==(0);
 $$size = $0 ? 1 : $size;
 $1 = (_malloc($$size)|0);
 $2 = ($1|0)==(0|0);
 L1: do {
  if ($2) {
   while(1) {
    $3 = (__ZSt15get_new_handlerv()|0);
    $4 = ($3|0)==(0|0);
    if ($4) {
     break;
    }
    FUNCTION_TABLE_v[$3 & 0]();
    $5 = (_malloc($$size)|0);
    $6 = ($5|0)==(0|0);
    if (!($6)) {
     $$lcssa = $5;
     break L1;
    }
   }
   $7 = (___cxa_allocate_exception(4)|0);
   HEAP32[$7>>2] = (4512);
   ___cxa_throw(($7|0),(4544|0),(1|0));
   // unreachable;
  } else {
   $$lcssa = $1;
  }
 } while(0);
 return ($$lcssa|0);
}
function __ZdlPv($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _free($ptr);
 return;
}
function __ZNSt9bad_allocD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNSt9bad_allocD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZNKSt9bad_alloc4whatEv($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (5464|0);
}
function __ZSt15get_new_handlerv() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[4560>>2]|0;HEAP32[4560>>2] = (($0+0)|0);
 $1 = $0;
 return ($1|0);
}
function __ZNSt9exceptionD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNSt9type_infoD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv116__shim_type_infoD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv123__fundamental_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZN10__cxxabiv117__class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZN10__cxxabiv120__si_class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZN10__cxxabiv121__vmi_class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZN10__cxxabiv119__pointer_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZNK10__cxxabiv123__fundamental_type_info9can_catchEPKNS_16__shim_type_infoERPv($this,$thrown_type,$0) {
 $this = $this|0;
 $thrown_type = $thrown_type|0;
 $0 = $0|0;
 var $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $1 = ($this|0)==($thrown_type|0);
 return ($1|0);
}
function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($this,$thrown_type,$adjustedPtr) {
 $this = $this|0;
 $thrown_type = $thrown_type|0;
 $adjustedPtr = $adjustedPtr|0;
 var $$0 = 0, $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $info = 0, dest = 0;
 var label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $info = sp;
 $0 = ($this|0)==($thrown_type|0);
 if ($0) {
  $$1 = 1;
 } else {
  $1 = ($thrown_type|0)==(0|0);
  if ($1) {
   $$1 = 0;
  } else {
   $2 = (___dynamic_cast($thrown_type,4656,4712,0)|0);
   $3 = ($2|0)==(0|0);
   if ($3) {
    $$1 = 0;
   } else {
    dest=$info; stop=dest+56|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
    HEAP32[$info>>2] = $2;
    $4 = ((($info)) + 8|0);
    HEAP32[$4>>2] = $this;
    $5 = ((($info)) + 12|0);
    HEAP32[$5>>2] = -1;
    $6 = ((($info)) + 48|0);
    HEAP32[$6>>2] = 1;
    $7 = HEAP32[$2>>2]|0;
    $8 = ((($7)) + 28|0);
    $9 = HEAP32[$8>>2]|0;
    $10 = HEAP32[$adjustedPtr>>2]|0;
    FUNCTION_TABLE_viiii[$9 & 31]($2,$info,$10,1);
    $11 = ((($info)) + 24|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==(1);
    if ($13) {
     $14 = ((($info)) + 16|0);
     $15 = HEAP32[$14>>2]|0;
     HEAP32[$adjustedPtr>>2] = $15;
     $$0 = 1;
    } else {
     $$0 = 0;
    }
    $$1 = $$0;
   }
  }
 }
 STACKTOP = sp;return ($$1|0);
}
function __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   HEAP32[$0>>2] = $adjustedPtr;
   $3 = ((($info)) + 24|0);
   HEAP32[$3>>2] = $path_below;
   $4 = ((($info)) + 36|0);
   HEAP32[$4>>2] = 1;
  } else {
   $5 = ($1|0)==($adjustedPtr|0);
   if (!($5)) {
    $9 = ((($info)) + 36|0);
    $10 = HEAP32[$9>>2]|0;
    $11 = (($10) + 1)|0;
    HEAP32[$9>>2] = $11;
    $12 = ((($info)) + 24|0);
    HEAP32[$12>>2] = 2;
    $13 = ((($info)) + 54|0);
    HEAP8[$13>>0] = 1;
    break;
   }
   $6 = ((($info)) + 24|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = ($7|0)==(2);
   if ($8) {
    HEAP32[$6>>2] = $path_below;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
 }
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
 } else {
  $3 = ((($this)) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = HEAP32[$4>>2]|0;
  $6 = ((($5)) + 28|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viiii[$7 & 31]($4,$info,$adjustedPtr,$path_below);
 }
 return;
}
function __ZNK10__cxxabiv122__base_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $offset_to_base$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($this)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 >> 8;
 $3 = $1 & 1;
 $4 = ($3|0)==(0);
 if ($4) {
  $offset_to_base$0 = $2;
 } else {
  $5 = HEAP32[$adjustedPtr>>2]|0;
  $6 = (($5) + ($2)|0);
  $7 = HEAP32[$6>>2]|0;
  $offset_to_base$0 = $7;
 }
 $8 = HEAP32[$this>>2]|0;
 $9 = HEAP32[$8>>2]|0;
 $10 = ((($9)) + 28|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = (($adjustedPtr) + ($offset_to_base$0)|0);
 $13 = $1 & 2;
 $14 = ($13|0)!=(0);
 $15 = $14 ? $path_below : 2;
 FUNCTION_TABLE_viiii[$11 & 31]($8,$info,$12,$15);
 return;
}
function __ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $p$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 L1: do {
  if ($2) {
   __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
  } else {
   $3 = ((($this)) + 16|0);
   $4 = ((($this)) + 12|0);
   $5 = HEAP32[$4>>2]|0;
   $6 = (((($this)) + 16|0) + ($5<<3)|0);
   __ZNK10__cxxabiv122__base_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($3,$info,$adjustedPtr,$path_below);
   $7 = ($5|0)>(1);
   if ($7) {
    $8 = ((($this)) + 24|0);
    $9 = ((($info)) + 54|0);
    $p$0 = $8;
    while(1) {
     __ZNK10__cxxabiv122__base_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($p$0,$info,$adjustedPtr,$path_below);
     $10 = HEAP8[$9>>0]|0;
     $11 = ($10<<24>>24)==(0);
     if (!($11)) {
      break L1;
     }
     $12 = ((($p$0)) + 8|0);
     $13 = ($12>>>0)<($6>>>0);
     if ($13) {
      $p$0 = $12;
     } else {
      break;
     }
    }
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv119__pointer_type_info9can_catchEPKNS_16__shim_type_infoERPv($this,$thrown_type,$adjustedPtr) {
 $this = $this|0;
 $thrown_type = $thrown_type|0;
 $adjustedPtr = $adjustedPtr|0;
 var $$$i = 0, $$0 = 0, $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $info = 0, $or$cond = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $info = sp;
 $0 = HEAP32[$adjustedPtr>>2]|0;
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$adjustedPtr>>2] = $1;
 $2 = ($this|0)==($thrown_type|0);
 $3 = ($thrown_type|0)==(4952|0);
 $$$i = $2 | $3;
 if ($$$i) {
  $$1 = 1;
 } else {
  $4 = ($thrown_type|0)==(0|0);
  if ($4) {
   $$1 = 0;
  } else {
   $5 = (___dynamic_cast($thrown_type,4656,4824,0)|0);
   $6 = ($5|0)==(0|0);
   if ($6) {
    $$1 = 0;
   } else {
    $7 = ((($5)) + 8|0);
    $8 = HEAP32[$7>>2]|0;
    $9 = ((($this)) + 8|0);
    $10 = HEAP32[$9>>2]|0;
    $11 = $10 ^ -1;
    $12 = $8 & $11;
    $13 = ($12|0)==(0);
    if ($13) {
     $14 = ((($this)) + 12|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ((($5)) + 12|0);
     $17 = HEAP32[$16>>2]|0;
     $18 = ($15|0)==($17|0);
     $19 = ($15|0)==(4936|0);
     $or$cond = $19 | $18;
     if ($or$cond) {
      $$1 = 1;
     } else {
      $20 = ($15|0)==(0|0);
      if ($20) {
       $$1 = 0;
      } else {
       $21 = (___dynamic_cast($15,4656,4712,0)|0);
       $22 = ($21|0)==(0|0);
       if ($22) {
        $$1 = 0;
       } else {
        $23 = HEAP32[$16>>2]|0;
        $24 = ($23|0)==(0|0);
        if ($24) {
         $$1 = 0;
        } else {
         $25 = (___dynamic_cast($23,4656,4712,0)|0);
         $26 = ($25|0)==(0|0);
         if ($26) {
          $$1 = 0;
         } else {
          dest=$info; stop=dest+56|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
          HEAP32[$info>>2] = $25;
          $27 = ((($info)) + 8|0);
          HEAP32[$27>>2] = $21;
          $28 = ((($info)) + 12|0);
          HEAP32[$28>>2] = -1;
          $29 = ((($info)) + 48|0);
          HEAP32[$29>>2] = 1;
          $30 = HEAP32[$25>>2]|0;
          $31 = ((($30)) + 28|0);
          $32 = HEAP32[$31>>2]|0;
          $33 = HEAP32[$adjustedPtr>>2]|0;
          FUNCTION_TABLE_viiii[$32 & 31]($25,$info,$33,1);
          $34 = ((($info)) + 24|0);
          $35 = HEAP32[$34>>2]|0;
          $36 = ($35|0)==(1);
          if ($36) {
           $37 = ((($info)) + 16|0);
           $38 = HEAP32[$37>>2]|0;
           HEAP32[$adjustedPtr>>2] = $38;
           $$0 = 1;
          } else {
           $$0 = 0;
          }
          $$1 = $$0;
         }
        }
       }
      }
     }
    } else {
     $$1 = 0;
    }
   }
  }
 }
 STACKTOP = sp;return ($$1|0);
}
function ___dynamic_cast($static_ptr,$static_type,$dst_type,$src2dst_offset) {
 $static_ptr = $static_ptr|0;
 $static_type = $static_type|0;
 $dst_type = $dst_type|0;
 $src2dst_offset = $src2dst_offset|0;
 var $$ = 0, $$8 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dst_ptr$0 = 0, $info = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $info = sp;
 $0 = HEAP32[$static_ptr>>2]|0;
 $1 = ((($0)) + -8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2;
 $4 = (($static_ptr) + ($3)|0);
 $5 = ((($0)) + -4|0);
 $6 = HEAP32[$5>>2]|0;
 HEAP32[$info>>2] = $dst_type;
 $7 = ((($info)) + 4|0);
 HEAP32[$7>>2] = $static_ptr;
 $8 = ((($info)) + 8|0);
 HEAP32[$8>>2] = $static_type;
 $9 = ((($info)) + 12|0);
 HEAP32[$9>>2] = $src2dst_offset;
 $10 = ((($info)) + 16|0);
 $11 = ((($info)) + 20|0);
 $12 = ((($info)) + 24|0);
 $13 = ((($info)) + 28|0);
 $14 = ((($info)) + 32|0);
 $15 = ((($info)) + 40|0);
 $16 = ($6|0)==($dst_type|0);
 dest=$10; stop=dest+36|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));HEAP16[$10+36>>1]=0|0;HEAP8[$10+38>>0]=0|0;
 do {
  if ($16) {
   $17 = ((($info)) + 48|0);
   HEAP32[$17>>2] = 1;
   $18 = HEAP32[$dst_type>>2]|0;
   $19 = ((($18)) + 20|0);
   $20 = HEAP32[$19>>2]|0;
   FUNCTION_TABLE_viiiiii[$20 & 31]($dst_type,$info,$4,$4,1,0);
   $21 = HEAP32[$12>>2]|0;
   $22 = ($21|0)==(1);
   $$ = $22 ? $4 : 0;
   $dst_ptr$0 = $$;
  } else {
   $23 = ((($info)) + 36|0);
   $24 = HEAP32[$6>>2]|0;
   $25 = ((($24)) + 24|0);
   $26 = HEAP32[$25>>2]|0;
   FUNCTION_TABLE_viiiii[$26 & 31]($6,$info,$4,1,0);
   $27 = HEAP32[$23>>2]|0;
   if ((($27|0) == 0)) {
    $28 = HEAP32[$15>>2]|0;
    $29 = ($28|0)==(1);
    $30 = HEAP32[$13>>2]|0;
    $31 = ($30|0)==(1);
    $or$cond = $29 & $31;
    $32 = HEAP32[$14>>2]|0;
    $33 = ($32|0)==(1);
    $or$cond3 = $or$cond & $33;
    $34 = HEAP32[$11>>2]|0;
    $$8 = $or$cond3 ? $34 : 0;
    $dst_ptr$0 = $$8;
    break;
   } else if (!((($27|0) == 1))) {
    $dst_ptr$0 = 0;
    break;
   }
   $35 = HEAP32[$12>>2]|0;
   $36 = ($35|0)==(1);
   if (!($36)) {
    $37 = HEAP32[$15>>2]|0;
    $38 = ($37|0)==(0);
    $39 = HEAP32[$13>>2]|0;
    $40 = ($39|0)==(1);
    $or$cond5 = $38 & $40;
    $41 = HEAP32[$14>>2]|0;
    $42 = ($41|0)==(1);
    $or$cond7 = $or$cond5 & $42;
    if (!($or$cond7)) {
     $dst_ptr$0 = 0;
     break;
    }
   }
   $43 = HEAP32[$10>>2]|0;
   $dst_ptr$0 = $43;
  }
 } while(0);
 STACKTOP = sp;return ($dst_ptr$0|0);
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($this,$info,$dst_ptr,$current_ptr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 53|0);
 HEAP8[$0>>0] = 1;
 $1 = ((($info)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==($current_ptr|0);
 do {
  if ($3) {
   $4 = ((($info)) + 52|0);
   HEAP8[$4>>0] = 1;
   $5 = ((($info)) + 16|0);
   $6 = HEAP32[$5>>2]|0;
   $7 = ($6|0)==(0|0);
   if ($7) {
    HEAP32[$5>>2] = $dst_ptr;
    $8 = ((($info)) + 24|0);
    HEAP32[$8>>2] = $path_below;
    $9 = ((($info)) + 36|0);
    HEAP32[$9>>2] = 1;
    $10 = ((($info)) + 48|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ($11|0)==(1);
    $13 = ($path_below|0)==(1);
    $or$cond = $12 & $13;
    if (!($or$cond)) {
     break;
    }
    $14 = ((($info)) + 54|0);
    HEAP8[$14>>0] = 1;
    break;
   }
   $15 = ($6|0)==($dst_ptr|0);
   if (!($15)) {
    $25 = ((($info)) + 36|0);
    $26 = HEAP32[$25>>2]|0;
    $27 = (($26) + 1)|0;
    HEAP32[$25>>2] = $27;
    $28 = ((($info)) + 54|0);
    HEAP8[$28>>0] = 1;
    break;
   }
   $16 = ((($info)) + 24|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = ($17|0)==(2);
   if ($18) {
    HEAP32[$16>>2] = $path_below;
    $23 = $path_below;
   } else {
    $23 = $17;
   }
   $19 = ((($info)) + 48|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ($20|0)==(1);
   $22 = ($23|0)==(1);
   $or$cond1 = $21 & $22;
   if ($or$cond1) {
    $24 = ((($info)) + 54|0);
    HEAP8[$24>>0] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $does_dst_type_point_to_our_static_type$0$off0$lcssa = 0, $does_dst_type_point_to_our_static_type$0$off023 = 0, $does_dst_type_point_to_our_static_type$1$off0 = 0, $is_dst_type_derived_from_static_type$0$off025 = 0, $is_dst_type_derived_from_static_type$1$off0 = 0, $is_dst_type_derived_from_static_type$2$off0 = 0;
 var $p$024 = 0, $p2$0 = 0, $p2$1 = 0, $p2$2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 L1: do {
  if ($2) {
   $3 = ((($info)) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = ((($info)) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($this|0)==($9|0);
   if (!($10)) {
    $57 = ((($this)) + 16|0);
    $58 = ((($this)) + 12|0);
    $59 = HEAP32[$58>>2]|0;
    $60 = (((($this)) + 16|0) + ($59<<3)|0);
    __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($57,$info,$current_ptr,$path_below,$use_strcmp);
    $61 = ((($this)) + 24|0);
    $62 = ($59|0)>(1);
    if (!($62)) {
     break;
    }
    $63 = ((($this)) + 8|0);
    $64 = HEAP32[$63>>2]|0;
    $65 = $64 & 2;
    $66 = ($65|0)==(0);
    if ($66) {
     $67 = ((($info)) + 36|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ($68|0)==(1);
     if (!($69)) {
      $75 = $64 & 1;
      $76 = ($75|0)==(0);
      if ($76) {
       $79 = ((($info)) + 54|0);
       $p2$2 = $61;
       while(1) {
        $88 = HEAP8[$79>>0]|0;
        $89 = ($88<<24>>24)==(0);
        if (!($89)) {
         break L1;
        }
        $90 = HEAP32[$67>>2]|0;
        $91 = ($90|0)==(1);
        if ($91) {
         break L1;
        }
        __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($p2$2,$info,$current_ptr,$path_below,$use_strcmp);
        $92 = ((($p2$2)) + 8|0);
        $93 = ($92>>>0)<($60>>>0);
        if ($93) {
         $p2$2 = $92;
        } else {
         break L1;
        }
       }
      }
      $77 = ((($info)) + 24|0);
      $78 = ((($info)) + 54|0);
      $p2$1 = $61;
      while(1) {
       $80 = HEAP8[$78>>0]|0;
       $81 = ($80<<24>>24)==(0);
       if (!($81)) {
        break L1;
       }
       $82 = HEAP32[$67>>2]|0;
       $83 = ($82|0)==(1);
       if ($83) {
        $84 = HEAP32[$77>>2]|0;
        $85 = ($84|0)==(1);
        if ($85) {
         break L1;
        }
       }
       __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($p2$1,$info,$current_ptr,$path_below,$use_strcmp);
       $86 = ((($p2$1)) + 8|0);
       $87 = ($86>>>0)<($60>>>0);
       if ($87) {
        $p2$1 = $86;
       } else {
        break L1;
       }
      }
     }
    }
    $70 = ((($info)) + 54|0);
    $p2$0 = $61;
    while(1) {
     $71 = HEAP8[$70>>0]|0;
     $72 = ($71<<24>>24)==(0);
     if (!($72)) {
      break L1;
     }
     __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($p2$0,$info,$current_ptr,$path_below,$use_strcmp);
     $73 = ((($p2$0)) + 8|0);
     $74 = ($73>>>0)<($60>>>0);
     if ($74) {
      $p2$0 = $73;
     } else {
      break L1;
     }
    }
   }
   $11 = ((($info)) + 16|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = ($12|0)==($current_ptr|0);
   if (!($13)) {
    $14 = ((($info)) + 20|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)==($current_ptr|0);
    if (!($16)) {
     $19 = ((($info)) + 32|0);
     HEAP32[$19>>2] = $path_below;
     $20 = ((($info)) + 44|0);
     $21 = HEAP32[$20>>2]|0;
     $22 = ($21|0)==(4);
     if ($22) {
      break;
     }
     $23 = ((($this)) + 12|0);
     $24 = HEAP32[$23>>2]|0;
     $25 = (((($this)) + 16|0) + ($24<<3)|0);
     $26 = ((($info)) + 52|0);
     $27 = ((($info)) + 53|0);
     $28 = ((($info)) + 54|0);
     $29 = ((($this)) + 8|0);
     $30 = ((($info)) + 24|0);
     $31 = ($24|0)>(0);
     L34: do {
      if ($31) {
       $32 = ((($this)) + 16|0);
       $does_dst_type_point_to_our_static_type$0$off023 = 0;$is_dst_type_derived_from_static_type$0$off025 = 0;$p$024 = $32;
       while(1) {
        HEAP8[$26>>0] = 0;
        HEAP8[$27>>0] = 0;
        __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($p$024,$info,$current_ptr,$current_ptr,1,$use_strcmp);
        $33 = HEAP8[$28>>0]|0;
        $34 = ($33<<24>>24)==(0);
        if (!($34)) {
         $does_dst_type_point_to_our_static_type$0$off0$lcssa = $does_dst_type_point_to_our_static_type$0$off023;$is_dst_type_derived_from_static_type$2$off0 = $is_dst_type_derived_from_static_type$0$off025;
         label = 20;
         break L34;
        }
        $35 = HEAP8[$27>>0]|0;
        $36 = ($35<<24>>24)==(0);
        do {
         if ($36) {
          $does_dst_type_point_to_our_static_type$1$off0 = $does_dst_type_point_to_our_static_type$0$off023;$is_dst_type_derived_from_static_type$1$off0 = $is_dst_type_derived_from_static_type$0$off025;
         } else {
          $37 = HEAP8[$26>>0]|0;
          $38 = ($37<<24>>24)==(0);
          if ($38) {
           $44 = HEAP32[$29>>2]|0;
           $45 = $44 & 1;
           $46 = ($45|0)==(0);
           if ($46) {
            $does_dst_type_point_to_our_static_type$0$off0$lcssa = $does_dst_type_point_to_our_static_type$0$off023;$is_dst_type_derived_from_static_type$2$off0 = 1;
            label = 20;
            break L34;
           } else {
            $does_dst_type_point_to_our_static_type$1$off0 = $does_dst_type_point_to_our_static_type$0$off023;$is_dst_type_derived_from_static_type$1$off0 = 1;
            break;
           }
          }
          $39 = HEAP32[$30>>2]|0;
          $40 = ($39|0)==(1);
          if ($40) {
           break L34;
          }
          $41 = HEAP32[$29>>2]|0;
          $42 = $41 & 2;
          $43 = ($42|0)==(0);
          if ($43) {
           break L34;
          } else {
           $does_dst_type_point_to_our_static_type$1$off0 = 1;$is_dst_type_derived_from_static_type$1$off0 = 1;
          }
         }
        } while(0);
        $47 = ((($p$024)) + 8|0);
        $48 = ($47>>>0)<($25>>>0);
        if ($48) {
         $does_dst_type_point_to_our_static_type$0$off023 = $does_dst_type_point_to_our_static_type$1$off0;$is_dst_type_derived_from_static_type$0$off025 = $is_dst_type_derived_from_static_type$1$off0;$p$024 = $47;
        } else {
         $does_dst_type_point_to_our_static_type$0$off0$lcssa = $does_dst_type_point_to_our_static_type$1$off0;$is_dst_type_derived_from_static_type$2$off0 = $is_dst_type_derived_from_static_type$1$off0;
         label = 20;
         break;
        }
       }
      } else {
       $does_dst_type_point_to_our_static_type$0$off0$lcssa = 0;$is_dst_type_derived_from_static_type$2$off0 = 0;
       label = 20;
      }
     } while(0);
     do {
      if ((label|0) == 20) {
       if ($does_dst_type_point_to_our_static_type$0$off0$lcssa) {
        label = 24;
       } else {
        HEAP32[$14>>2] = $current_ptr;
        $49 = ((($info)) + 40|0);
        $50 = HEAP32[$49>>2]|0;
        $51 = (($50) + 1)|0;
        HEAP32[$49>>2] = $51;
        $52 = ((($info)) + 36|0);
        $53 = HEAP32[$52>>2]|0;
        $54 = ($53|0)==(1);
        if ($54) {
         $55 = HEAP32[$30>>2]|0;
         $56 = ($55|0)==(2);
         if ($56) {
          HEAP8[$28>>0] = 1;
          if ($is_dst_type_derived_from_static_type$2$off0) {
           break;
          }
         } else {
          label = 24;
         }
        } else {
         label = 24;
        }
       }
       if ((label|0) == 24) {
        if ($is_dst_type_derived_from_static_type$2$off0) {
         break;
        }
       }
       HEAP32[$20>>2] = 4;
       break L1;
      }
     } while(0);
     HEAP32[$20>>2] = 3;
     break;
    }
   }
   $17 = ($path_below|0)==(1);
   if ($17) {
    $18 = ((($info)) + 32|0);
    HEAP32[$18>>2] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $offset_to_base$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($this)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 >> 8;
 $3 = $1 & 1;
 $4 = ($3|0)==(0);
 if ($4) {
  $offset_to_base$0 = $2;
 } else {
  $5 = HEAP32[$current_ptr>>2]|0;
  $6 = (($5) + ($2)|0);
  $7 = HEAP32[$6>>2]|0;
  $offset_to_base$0 = $7;
 }
 $8 = HEAP32[$this>>2]|0;
 $9 = HEAP32[$8>>2]|0;
 $10 = ((($9)) + 20|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = (($current_ptr) + ($offset_to_base$0)|0);
 $13 = $1 & 2;
 $14 = ($13|0)!=(0);
 $15 = $14 ? $path_below : 2;
 FUNCTION_TABLE_viiiiii[$11 & 31]($8,$info,$dst_ptr,$12,$15,$use_strcmp);
 return;
}
function __ZNK10__cxxabiv122__base_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $offset_to_base$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($this)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 >> 8;
 $3 = $1 & 1;
 $4 = ($3|0)==(0);
 if ($4) {
  $offset_to_base$0 = $2;
 } else {
  $5 = HEAP32[$current_ptr>>2]|0;
  $6 = (($5) + ($2)|0);
  $7 = HEAP32[$6>>2]|0;
  $offset_to_base$0 = $7;
 }
 $8 = HEAP32[$this>>2]|0;
 $9 = HEAP32[$8>>2]|0;
 $10 = ((($9)) + 24|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = (($current_ptr) + ($offset_to_base$0)|0);
 $13 = $1 & 2;
 $14 = ($13|0)!=(0);
 $15 = $14 ? $path_below : 2;
 FUNCTION_TABLE_viiiii[$11 & 31]($8,$info,$12,$15,$use_strcmp);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $is_dst_type_derived_from_static_type$0$off01 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 L1: do {
  if ($2) {
   $3 = ((($info)) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = ((($info)) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($this|0)==($9|0);
   if (!($10)) {
    $43 = ((($this)) + 8|0);
    $44 = HEAP32[$43>>2]|0;
    $45 = HEAP32[$44>>2]|0;
    $46 = ((($45)) + 24|0);
    $47 = HEAP32[$46>>2]|0;
    FUNCTION_TABLE_viiiii[$47 & 31]($44,$info,$current_ptr,$path_below,$use_strcmp);
    break;
   }
   $11 = ((($info)) + 16|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = ($12|0)==($current_ptr|0);
   if (!($13)) {
    $14 = ((($info)) + 20|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)==($current_ptr|0);
    if (!($16)) {
     $19 = ((($info)) + 32|0);
     HEAP32[$19>>2] = $path_below;
     $20 = ((($info)) + 44|0);
     $21 = HEAP32[$20>>2]|0;
     $22 = ($21|0)==(4);
     if ($22) {
      break;
     }
     $23 = ((($info)) + 52|0);
     HEAP8[$23>>0] = 0;
     $24 = ((($info)) + 53|0);
     HEAP8[$24>>0] = 0;
     $25 = ((($this)) + 8|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = HEAP32[$26>>2]|0;
     $28 = ((($27)) + 20|0);
     $29 = HEAP32[$28>>2]|0;
     FUNCTION_TABLE_viiiiii[$29 & 31]($26,$info,$current_ptr,$current_ptr,1,$use_strcmp);
     $30 = HEAP8[$24>>0]|0;
     $31 = ($30<<24>>24)==(0);
     if ($31) {
      $is_dst_type_derived_from_static_type$0$off01 = 0;
      label = 13;
     } else {
      $32 = HEAP8[$23>>0]|0;
      $not$ = ($32<<24>>24)==(0);
      if ($not$) {
       $is_dst_type_derived_from_static_type$0$off01 = 1;
       label = 13;
      }
     }
     do {
      if ((label|0) == 13) {
       HEAP32[$14>>2] = $current_ptr;
       $33 = ((($info)) + 40|0);
       $34 = HEAP32[$33>>2]|0;
       $35 = (($34) + 1)|0;
       HEAP32[$33>>2] = $35;
       $36 = ((($info)) + 36|0);
       $37 = HEAP32[$36>>2]|0;
       $38 = ($37|0)==(1);
       if ($38) {
        $39 = ((($info)) + 24|0);
        $40 = HEAP32[$39>>2]|0;
        $41 = ($40|0)==(2);
        if ($41) {
         $42 = ((($info)) + 54|0);
         HEAP8[$42>>0] = 1;
         if ($is_dst_type_derived_from_static_type$0$off01) {
          break;
         }
        } else {
         label = 16;
        }
       } else {
        label = 16;
       }
       if ((label|0) == 16) {
        if ($is_dst_type_derived_from_static_type$0$off01) {
         break;
        }
       }
       HEAP32[$20>>2] = 4;
       break L1;
      }
     } while(0);
     HEAP32[$20>>2] = 3;
     break;
    }
   }
   $17 = ($path_below|0)==(1);
   if ($17) {
    $18 = ((($info)) + 32|0);
    HEAP32[$18>>2] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 do {
  if ($2) {
   $3 = ((($info)) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = ((($info)) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($this|0)==($9|0);
   if ($10) {
    $11 = ((($info)) + 16|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==($current_ptr|0);
    if (!($13)) {
     $14 = ((($info)) + 20|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ($15|0)==($current_ptr|0);
     if (!($16)) {
      $19 = ((($info)) + 32|0);
      HEAP32[$19>>2] = $path_below;
      HEAP32[$14>>2] = $current_ptr;
      $20 = ((($info)) + 40|0);
      $21 = HEAP32[$20>>2]|0;
      $22 = (($21) + 1)|0;
      HEAP32[$20>>2] = $22;
      $23 = ((($info)) + 36|0);
      $24 = HEAP32[$23>>2]|0;
      $25 = ($24|0)==(1);
      if ($25) {
       $26 = ((($info)) + 24|0);
       $27 = HEAP32[$26>>2]|0;
       $28 = ($27|0)==(2);
       if ($28) {
        $29 = ((($info)) + 54|0);
        HEAP8[$29>>0] = 1;
       }
      }
      $30 = ((($info)) + 44|0);
      HEAP32[$30>>2] = 4;
      break;
     }
    }
    $17 = ($path_below|0)==(1);
    if ($17) {
     $18 = ((($info)) + 32|0);
     HEAP32[$18>>2] = 1;
    }
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $p$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 } else {
  $3 = ((($info)) + 52|0);
  $4 = HEAP8[$3>>0]|0;
  $5 = ((($info)) + 53|0);
  $6 = HEAP8[$5>>0]|0;
  $7 = ((($this)) + 16|0);
  $8 = ((($this)) + 12|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = (((($this)) + 16|0) + ($9<<3)|0);
  HEAP8[$3>>0] = 0;
  HEAP8[$5>>0] = 0;
  __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($7,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp);
  $11 = ($9|0)>(1);
  L3: do {
   if ($11) {
    $12 = ((($this)) + 24|0);
    $13 = ((($info)) + 24|0);
    $14 = ((($this)) + 8|0);
    $15 = ((($info)) + 54|0);
    $p$0 = $12;
    while(1) {
     $16 = HEAP8[$15>>0]|0;
     $17 = ($16<<24>>24)==(0);
     if (!($17)) {
      break L3;
     }
     $18 = HEAP8[$3>>0]|0;
     $19 = ($18<<24>>24)==(0);
     if ($19) {
      $25 = HEAP8[$5>>0]|0;
      $26 = ($25<<24>>24)==(0);
      if (!($26)) {
       $27 = HEAP32[$14>>2]|0;
       $28 = $27 & 1;
       $29 = ($28|0)==(0);
       if ($29) {
        break L3;
       }
      }
     } else {
      $20 = HEAP32[$13>>2]|0;
      $21 = ($20|0)==(1);
      if ($21) {
       break L3;
      }
      $22 = HEAP32[$14>>2]|0;
      $23 = $22 & 2;
      $24 = ($23|0)==(0);
      if ($24) {
       break L3;
      }
     }
     HEAP8[$3>>0] = 0;
     HEAP8[$5>>0] = 0;
     __ZNK10__cxxabiv122__base_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($p$0,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp);
     $30 = ((($p$0)) + 8|0);
     $31 = ($30>>>0)<($10>>>0);
     if ($31) {
      $p$0 = $30;
     } else {
      break;
     }
    }
   }
  } while(0);
  HEAP8[$3>>0] = $4;
  HEAP8[$5>>0] = $6;
 }
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 } else {
  $3 = ((($this)) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = HEAP32[$4>>2]|0;
  $6 = ((($5)) + 20|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viiiiii[$7 & 31]($4,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp);
 }
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 }
 return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$3$i = 0, $$lcssa = 0, $$lcssa211 = 0, $$lcssa215 = 0, $$lcssa216 = 0, $$lcssa217 = 0, $$lcssa219 = 0, $$lcssa222 = 0, $$lcssa224 = 0, $$lcssa226 = 0, $$lcssa228 = 0, $$lcssa230 = 0, $$lcssa232 = 0, $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i22$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i23$iZ2D = 0;
 var $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi58$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre106 = 0, $$pre14$i$i = 0, $$pre43$i = 0, $$pre56$i$i = 0, $$pre57$i$i = 0, $$pre8$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i13$i = 0, $$sum$i14$i = 0, $$sum$i17$i = 0, $$sum$i19$i = 0;
 var $$sum$i2334 = 0, $$sum$i32 = 0, $$sum$i35 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i15$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum116$i = 0;
 var $$sum117$i = 0, $$sum118$i = 0, $$sum119$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum120$i = 0, $$sum121$i = 0, $$sum122$i = 0, $$sum123$i = 0, $$sum124$i = 0, $$sum125$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum15$i = 0, $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0;
 var $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i16$i = 0, $$sum2$i18$i = 0, $$sum2$i21$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0, $$sum25$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i27 = 0;
 var $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0, $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0;
 var $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0;
 var $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0;
 var $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0;
 var $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0;
 var $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0;
 var $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0;
 var $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0;
 var $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0;
 var $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0;
 var $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0;
 var $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0;
 var $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0;
 var $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0;
 var $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0;
 var $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0;
 var $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0;
 var $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0;
 var $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0;
 var $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0;
 var $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0;
 var $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0;
 var $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0;
 var $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0;
 var $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0;
 var $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0;
 var $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0;
 var $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0;
 var $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0;
 var $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0;
 var $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0;
 var $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0;
 var $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0;
 var $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0;
 var $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0;
 var $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0;
 var $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0;
 var $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0;
 var $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0;
 var $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0;
 var $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0;
 var $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0;
 var $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0;
 var $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0;
 var $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0;
 var $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0;
 var $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0;
 var $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0;
 var $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0;
 var $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0;
 var $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0;
 var $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0;
 var $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0;
 var $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0;
 var $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0;
 var $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$029$i = 0, $K2$07$i$i = 0, $K8$051$i$i = 0, $R$0$i = 0, $R$0$i$i = 0, $R$0$i$i$lcssa = 0, $R$0$i$lcssa = 0, $R$0$i18 = 0, $R$0$i18$lcssa = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i$i$lcssa = 0, $RP$0$i$lcssa = 0;
 var $RP$0$i17 = 0, $RP$0$i17$lcssa = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i25$i = 0, $T$028$i = 0, $T$028$i$lcssa = 0, $T$050$i$i = 0, $T$050$i$i$lcssa = 0, $T$06$i$i = 0, $T$06$i$i$lcssa = 0, $br$0$ph$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0, $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0;
 var $not$$i = 0, $not$$i$i = 0, $not$$i26$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i30 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond5$i = 0, $or$cond57$i = 0, $or$cond6$i = 0, $or$cond8$i = 0, $or$cond9$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$lcssa = 0, $rsize$0$i15 = 0, $rsize$1$i = 0;
 var $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$084$i = 0, $sp$084$i$lcssa = 0, $sp$183$i = 0, $sp$183$i$lcssa = 0, $ssize$0$$i = 0, $ssize$0$i = 0, $ssize$1$ph$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0, $t$1$i = 0, $t$2$ph$i = 0;
 var $t$2$v$3$i = 0, $t$230$i = 0, $tbase$255$i = 0, $tsize$0$ph$i = 0, $tsize$0323944$i = 0, $tsize$1$i = 0, $tsize$254$i = 0, $v$0$i = 0, $v$0$i$lcssa = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$3$ph$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[5480>>2]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (5520 + ($13<<2)|0);
    $$sum10 = (($13) + 2)|0;
    $15 = (5520 + ($$sum10<<2)|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[5480>>2] = $22;
     } else {
      $23 = HEAP32[(5496)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    return ($mem$0|0);
   }
   $34 = HEAP32[(5488)>>2]|0;
   $35 = ($4>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $5;
     $38 = 2 << $5;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = (5520 + ($65<<2)|0);
     $$sum4 = (($65) + 2)|0;
     $67 = (5520 + ($$sum4<<2)|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = ((($68)) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[5480>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[(5496)>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = ((($70)) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[(5488)>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($4))|0;
     $82 = $4 | 3;
     $83 = ((($68)) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($4)|0);
     $85 = $81 | 1;
     $$sum56 = $4 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[(5500)>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = (5520 + ($92<<2)|0);
      $94 = HEAP32[5480>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[5480>>2] = $98;
       $$pre105 = (($92) + 2)|0;
       $$pre106 = (5520 + ($$pre105<<2)|0);
       $$pre$phiZ2D = $$pre106;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = (5520 + ($$sum9<<2)|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[(5496)>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = ((($F4$0)) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = ((($90)) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = ((($90)) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[(5488)>>2] = $81;
     HEAP32[(5500)>>2] = $84;
     $mem$0 = $69;
     return ($mem$0|0);
    }
    $106 = HEAP32[(5484)>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $4;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = (5784 + ($130<<2)|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = ((($132)) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($4))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = ((($t$0$i)) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = ((($t$0$i)) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = ((($144)) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($4))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[(5496)>>2]|0;
     $150 = ($v$0$i$lcssa>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i$lcssa) + ($4)|0);
     $152 = ($v$0$i$lcssa>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = ((($v$0$i$lcssa)) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = ((($v$0$i$lcssa)) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i$lcssa|0);
     do {
      if ($157) {
       $167 = ((($v$0$i$lcssa)) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = ((($v$0$i$lcssa)) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = ((($R$0$i)) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = ((($R$0$i)) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         $R$0$i$lcssa = $R$0$i;$RP$0$i$lcssa = $RP$0$i;
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i$lcssa>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i$lcssa>>2] = 0;
        $R$1$i = $R$0$i$lcssa;
        break;
       }
      } else {
       $158 = ((($v$0$i$lcssa)) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = ((($159)) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i$lcssa|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = ((($156)) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i$lcssa|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = ((($v$0$i$lcssa)) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = (5784 + ($182<<2)|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i$lcssa|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[(5484)>>2]|0;
         $189 = $188 & $187;
         HEAP32[(5484)>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[(5496)>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = ((($154)) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i$lcssa|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = ((($154)) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[(5496)>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = ((($R$1$i)) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = ((($v$0$i$lcssa)) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = ((($R$1$i)) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = ((($201)) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = ((($v$0$i$lcssa)) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[(5496)>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = ((($R$1$i)) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = ((($207)) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i$lcssa) + ($4))|0;
      $215 = $214 | 3;
      $216 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i$lcssa) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $4 | 3;
      $221 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i$lcssa | 1;
      $$sum$i35 = $4 | 4;
      $223 = (($v$0$i$lcssa) + ($$sum$i35)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i$lcssa) + ($4))|0;
      $224 = (($v$0$i$lcssa) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i$lcssa;
      $225 = HEAP32[(5488)>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[(5500)>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = (5520 + ($229<<2)|0);
       $231 = HEAP32[5480>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[5480>>2] = $235;
        $$pre$i = (($229) + 2)|0;
        $$pre8$i = (5520 + ($$pre$i<<2)|0);
        $$pre$phi$iZ2D = $$pre8$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = (5520 + ($$sum3$i<<2)|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[(5496)>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = ((($F1$0$i)) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = ((($227)) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = ((($227)) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[(5488)>>2] = $rsize$0$i$lcssa;
      HEAP32[(5500)>>2] = $151;
     }
     $243 = ((($v$0$i$lcssa)) + 8|0);
     $mem$0 = $243;
     return ($mem$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[(5484)>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = (5784 + ($idx$0$i<<2)|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L123: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
       label = 86;
      } else {
       $278 = ($idx$0$i|0)==(31);
       $279 = $idx$0$i >>> 1;
       $280 = (25 - ($279))|0;
       $281 = $278 ? 0 : $280;
       $282 = $246 << $281;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $282;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = ((($t$0$i14)) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$331$i = $286;$t$230$i = $t$0$i14;$v$332$i = $t$0$i14;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = ((($t$0$i14)) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = (((($t$0$i14)) + 16|0) + ($291<<2)|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $298 = ($t$1$i|0)==(0|0);
      $299 = ($v$2$i|0)==(0|0);
      $or$cond$i = $298 & $299;
      if ($or$cond$i) {
       $300 = 2 << $idx$0$i;
       $301 = (0 - ($300))|0;
       $302 = $300 | $301;
       $303 = $247 & $302;
       $304 = ($303|0)==(0);
       if ($304) {
        $nb$0 = $246;
        break;
       }
       $305 = (0 - ($303))|0;
       $306 = $303 & $305;
       $307 = (($306) + -1)|0;
       $308 = $307 >>> 12;
       $309 = $308 & 16;
       $310 = $307 >>> $309;
       $311 = $310 >>> 5;
       $312 = $311 & 8;
       $313 = $312 | $309;
       $314 = $310 >>> $312;
       $315 = $314 >>> 2;
       $316 = $315 & 4;
       $317 = $313 | $316;
       $318 = $314 >>> $316;
       $319 = $318 >>> 1;
       $320 = $319 & 2;
       $321 = $317 | $320;
       $322 = $318 >>> $320;
       $323 = $322 >>> 1;
       $324 = $323 & 1;
       $325 = $321 | $324;
       $326 = $322 >>> $324;
       $327 = (($325) + ($326))|0;
       $328 = (5784 + ($327<<2)|0);
       $329 = HEAP32[$328>>2]|0;
       $t$2$ph$i = $329;$v$3$ph$i = 0;
      } else {
       $t$2$ph$i = $t$1$i;$v$3$ph$i = $v$2$i;
      }
      $330 = ($t$2$ph$i|0)==(0|0);
      if ($330) {
       $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$3$ph$i;
      } else {
       $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$3$ph$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $331 = ((($t$230$i)) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = ((($t$230$i)) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        label = 90;
        continue;
       }
       $339 = ((($t$230$i)) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
        label = 90;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[(5488)>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[(5496)>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = ((($v$3$lcssa$i)) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = ((($v$3$lcssa$i)) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = ((($v$3$lcssa$i)) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = ((($v$3$lcssa$i)) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = ((($R$0$i18)) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = ((($R$0$i18)) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           $R$0$i18$lcssa = $R$0$i18;$RP$0$i17$lcssa = $RP$0$i17;
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17$lcssa>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17$lcssa>>2] = 0;
          $R$1$i20 = $R$0$i18$lcssa;
          break;
         }
        } else {
         $355 = ((($v$3$lcssa$i)) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = ((($356)) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = ((($353)) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = ((($v$3$lcssa$i)) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = (5784 + ($379<<2)|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[(5484)>>2]|0;
           $386 = $385 & $384;
           HEAP32[(5484)>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[(5496)>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = ((($351)) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = ((($351)) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[(5496)>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = ((($R$1$i20)) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = ((($v$3$lcssa$i)) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = ((($R$1$i20)) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = ((($398)) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = ((($v$3$lcssa$i)) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[(5496)>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = ((($R$1$i20)) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = ((($404)) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L199: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = ((($v$3$lcssa$i)) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2334 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2334)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = (5520 + ($424<<2)|0);
          $426 = HEAP32[5480>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          if ($429) {
           $430 = $426 | $427;
           HEAP32[5480>>2] = $430;
           $$pre$i25 = (($424) + 2)|0;
           $$pre43$i = (5520 + ($$pre$i25<<2)|0);
           $$pre$phi$i26Z2D = $$pre43$i;$F5$0$i = $425;
          } else {
           $$sum17$i = (($424) + 2)|0;
           $431 = (5520 + ($$sum17$i<<2)|0);
           $432 = HEAP32[$431>>2]|0;
           $433 = HEAP32[(5496)>>2]|0;
           $434 = ($432>>>0)<($433>>>0);
           if ($434) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
           }
          }
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = ((($F5$0$i)) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = (5784 + ($I7$0$i<<2)|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[(5484)>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[(5484)>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ((($475)) + 4|0);
         $477 = HEAP32[$476>>2]|0;
         $478 = $477 & -8;
         $479 = ($478|0)==($rsize$3$lcssa$i|0);
         L217: do {
          if ($479) {
           $T$0$lcssa$i = $475;
          } else {
           $480 = ($I7$0$i|0)==(31);
           $481 = $I7$0$i >>> 1;
           $482 = (25 - ($481))|0;
           $483 = $480 ? 0 : $482;
           $484 = $rsize$3$lcssa$i << $483;
           $K12$029$i = $484;$T$028$i = $475;
           while(1) {
            $491 = $K12$029$i >>> 31;
            $492 = (((($T$028$i)) + 16|0) + ($491<<2)|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             $$lcssa232 = $492;$T$028$i$lcssa = $T$028$i;
             break;
            }
            $485 = $K12$029$i << 1;
            $486 = ((($487)) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L217;
            } else {
             $K12$029$i = $485;$T$028$i = $487;
            }
           }
           $494 = HEAP32[(5496)>>2]|0;
           $495 = ($$lcssa232>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$$lcssa232>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$028$i$lcssa;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L199;
           }
          }
         } while(0);
         $499 = ((($T$0$lcssa$i)) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[(5496)>>2]|0;
         $502 = ($500>>>0)>=($501>>>0);
         $not$$i = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = $502 & $not$$i;
         if ($503) {
          $504 = ((($500)) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = ((($v$3$lcssa$i)) + 8|0);
       $mem$0 = $508;
       return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(5488)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(5500)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(5500)>>2] = $514;
   HEAP32[(5488)>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(5488)>>2] = 0;
   HEAP32[(5500)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = ((($512)) + 8|0);
  $mem$0 = $525;
  return ($mem$0|0);
 }
 $526 = HEAP32[(5492)>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[(5492)>>2] = $528;
  $529 = HEAP32[(5504)>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[(5504)>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = ((($529)) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = ((($529)) + 8|0);
  $mem$0 = $535;
  return ($mem$0|0);
 }
 $536 = HEAP32[5952>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[(5960)>>2] = $538;
    HEAP32[(5956)>>2] = $538;
    HEAP32[(5964)>>2] = -1;
    HEAP32[(5968)>>2] = -1;
    HEAP32[(5972)>>2] = 0;
    HEAP32[(5924)>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[5952>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[(5960)>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  return ($mem$0|0);
 }
 $552 = HEAP32[(5920)>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[(5912)>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   return ($mem$0|0);
  }
 }
 $558 = HEAP32[(5924)>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L258: do {
  if ($560) {
   $561 = HEAP32[(5504)>>2]|0;
   $562 = ($561|0)==(0|0);
   L260: do {
    if ($562) {
     label = 174;
    } else {
     $sp$0$i$i = (5928);
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = ((($sp$0$i$i)) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        $$lcssa228 = $sp$0$i$i;$$lcssa230 = $565;
        break;
       }
      }
      $569 = ((($sp$0$i$i)) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 174;
       break L260;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $594 = HEAP32[(5492)>>2]|0;
     $595 = (($548) - ($594))|0;
     $596 = $595 & $549;
     $597 = ($596>>>0)<(2147483647);
     if ($597) {
      $598 = (_sbrk(($596|0))|0);
      $599 = HEAP32[$$lcssa228>>2]|0;
      $600 = HEAP32[$$lcssa230>>2]|0;
      $601 = (($599) + ($600)|0);
      $602 = ($598|0)==($601|0);
      $$3$i = $602 ? $596 : 0;
      if ($602) {
       $603 = ($598|0)==((-1)|0);
       if ($603) {
        $tsize$0323944$i = $$3$i;
       } else {
        $tbase$255$i = $598;$tsize$254$i = $$3$i;
        label = 194;
        break L258;
       }
      } else {
       $br$0$ph$i = $598;$ssize$1$ph$i = $596;$tsize$0$ph$i = $$3$i;
       label = 184;
      }
     } else {
      $tsize$0323944$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 174) {
     $572 = (_sbrk(0)|0);
     $573 = ($572|0)==((-1)|0);
     if ($573) {
      $tsize$0323944$i = 0;
     } else {
      $574 = $572;
      $575 = HEAP32[(5956)>>2]|0;
      $576 = (($575) + -1)|0;
      $577 = $576 & $574;
      $578 = ($577|0)==(0);
      if ($578) {
       $ssize$0$i = $550;
      } else {
       $579 = (($576) + ($574))|0;
       $580 = (0 - ($575))|0;
       $581 = $579 & $580;
       $582 = (($550) - ($574))|0;
       $583 = (($582) + ($581))|0;
       $ssize$0$i = $583;
      }
      $584 = HEAP32[(5912)>>2]|0;
      $585 = (($584) + ($ssize$0$i))|0;
      $586 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $587 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i30 = $586 & $587;
      if ($or$cond$i30) {
       $588 = HEAP32[(5920)>>2]|0;
       $589 = ($588|0)==(0);
       if (!($589)) {
        $590 = ($585>>>0)<=($584>>>0);
        $591 = ($585>>>0)>($588>>>0);
        $or$cond2$i = $590 | $591;
        if ($or$cond2$i) {
         $tsize$0323944$i = 0;
         break;
        }
       }
       $592 = (_sbrk(($ssize$0$i|0))|0);
       $593 = ($592|0)==($572|0);
       $ssize$0$$i = $593 ? $ssize$0$i : 0;
       if ($593) {
        $tbase$255$i = $572;$tsize$254$i = $ssize$0$$i;
        label = 194;
        break L258;
       } else {
        $br$0$ph$i = $592;$ssize$1$ph$i = $ssize$0$i;$tsize$0$ph$i = $ssize$0$$i;
        label = 184;
       }
      } else {
       $tsize$0323944$i = 0;
      }
     }
    }
   } while(0);
   L280: do {
    if ((label|0) == 184) {
     $604 = (0 - ($ssize$1$ph$i))|0;
     $605 = ($br$0$ph$i|0)!=((-1)|0);
     $606 = ($ssize$1$ph$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $605;
     $607 = ($545>>>0)>($ssize$1$ph$i>>>0);
     $or$cond6$i = $607 & $or$cond5$i;
     do {
      if ($or$cond6$i) {
       $608 = HEAP32[(5960)>>2]|0;
       $609 = (($547) - ($ssize$1$ph$i))|0;
       $610 = (($609) + ($608))|0;
       $611 = (0 - ($608))|0;
       $612 = $610 & $611;
       $613 = ($612>>>0)<(2147483647);
       if ($613) {
        $614 = (_sbrk(($612|0))|0);
        $615 = ($614|0)==((-1)|0);
        if ($615) {
         (_sbrk(($604|0))|0);
         $tsize$0323944$i = $tsize$0$ph$i;
         break L280;
        } else {
         $616 = (($612) + ($ssize$1$ph$i))|0;
         $ssize$2$i = $616;
         break;
        }
       } else {
        $ssize$2$i = $ssize$1$ph$i;
       }
      } else {
       $ssize$2$i = $ssize$1$ph$i;
      }
     } while(0);
     $617 = ($br$0$ph$i|0)==((-1)|0);
     if ($617) {
      $tsize$0323944$i = $tsize$0$ph$i;
     } else {
      $tbase$255$i = $br$0$ph$i;$tsize$254$i = $ssize$2$i;
      label = 194;
      break L258;
     }
    }
   } while(0);
   $618 = HEAP32[(5924)>>2]|0;
   $619 = $618 | 4;
   HEAP32[(5924)>>2] = $619;
   $tsize$1$i = $tsize$0323944$i;
   label = 191;
  } else {
   $tsize$1$i = 0;
   label = 191;
  }
 } while(0);
 if ((label|0) == 191) {
  $620 = ($550>>>0)<(2147483647);
  if ($620) {
   $621 = (_sbrk(($550|0))|0);
   $622 = (_sbrk(0)|0);
   $623 = ($621|0)!=((-1)|0);
   $624 = ($622|0)!=((-1)|0);
   $or$cond3$i = $623 & $624;
   $625 = ($621>>>0)<($622>>>0);
   $or$cond8$i = $625 & $or$cond3$i;
   if ($or$cond8$i) {
    $626 = $622;
    $627 = $621;
    $628 = (($626) - ($627))|0;
    $629 = (($nb$0) + 40)|0;
    $630 = ($628>>>0)>($629>>>0);
    $$tsize$1$i = $630 ? $628 : $tsize$1$i;
    if ($630) {
     $tbase$255$i = $621;$tsize$254$i = $$tsize$1$i;
     label = 194;
    }
   }
  }
 }
 if ((label|0) == 194) {
  $631 = HEAP32[(5912)>>2]|0;
  $632 = (($631) + ($tsize$254$i))|0;
  HEAP32[(5912)>>2] = $632;
  $633 = HEAP32[(5916)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(5916)>>2] = $632;
  }
  $635 = HEAP32[(5504)>>2]|0;
  $636 = ($635|0)==(0|0);
  L299: do {
   if ($636) {
    $637 = HEAP32[(5496)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$255$i>>>0)<($637>>>0);
    $or$cond9$i = $638 | $639;
    if ($or$cond9$i) {
     HEAP32[(5496)>>2] = $tbase$255$i;
    }
    HEAP32[(5928)>>2] = $tbase$255$i;
    HEAP32[(5932)>>2] = $tsize$254$i;
    HEAP32[(5940)>>2] = 0;
    $640 = HEAP32[5952>>2]|0;
    HEAP32[(5516)>>2] = $640;
    HEAP32[(5512)>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $641 = $i$02$i$i << 1;
     $642 = (5520 + ($641<<2)|0);
     $$sum$i$i = (($641) + 3)|0;
     $643 = (5520 + ($$sum$i$i<<2)|0);
     HEAP32[$643>>2] = $642;
     $$sum1$i$i = (($641) + 2)|0;
     $644 = (5520 + ($$sum1$i$i<<2)|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $645;
     }
    }
    $646 = (($tsize$254$i) + -40)|0;
    $647 = ((($tbase$255$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$255$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(5504)>>2] = $654;
    HEAP32[(5492)>>2] = $655;
    $656 = $655 | 1;
    $$sum$i13$i = (($653) + 4)|0;
    $657 = (($tbase$255$i) + ($$sum$i13$i)|0);
    HEAP32[$657>>2] = $656;
    $$sum2$i$i = (($tsize$254$i) + -36)|0;
    $658 = (($tbase$255$i) + ($$sum2$i$i)|0);
    HEAP32[$658>>2] = 40;
    $659 = HEAP32[(5968)>>2]|0;
    HEAP32[(5508)>>2] = $659;
   } else {
    $sp$084$i = (5928);
    while(1) {
     $660 = HEAP32[$sp$084$i>>2]|0;
     $661 = ((($sp$084$i)) + 4|0);
     $662 = HEAP32[$661>>2]|0;
     $663 = (($660) + ($662)|0);
     $664 = ($tbase$255$i|0)==($663|0);
     if ($664) {
      $$lcssa222 = $660;$$lcssa224 = $661;$$lcssa226 = $662;$sp$084$i$lcssa = $sp$084$i;
      label = 204;
      break;
     }
     $665 = ((($sp$084$i)) + 8|0);
     $666 = HEAP32[$665>>2]|0;
     $667 = ($666|0)==(0|0);
     if ($667) {
      break;
     } else {
      $sp$084$i = $666;
     }
    }
    if ((label|0) == 204) {
     $668 = ((($sp$084$i$lcssa)) + 12|0);
     $669 = HEAP32[$668>>2]|0;
     $670 = $669 & 8;
     $671 = ($670|0)==(0);
     if ($671) {
      $672 = ($635>>>0)>=($$lcssa222>>>0);
      $673 = ($635>>>0)<($tbase$255$i>>>0);
      $or$cond57$i = $673 & $672;
      if ($or$cond57$i) {
       $674 = (($$lcssa226) + ($tsize$254$i))|0;
       HEAP32[$$lcssa224>>2] = $674;
       $675 = HEAP32[(5492)>>2]|0;
       $676 = (($675) + ($tsize$254$i))|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($676) - ($683))|0;
       HEAP32[(5504)>>2] = $684;
       HEAP32[(5492)>>2] = $685;
       $686 = $685 | 1;
       $$sum$i17$i = (($683) + 4)|0;
       $687 = (($635) + ($$sum$i17$i)|0);
       HEAP32[$687>>2] = $686;
       $$sum2$i18$i = (($676) + 4)|0;
       $688 = (($635) + ($$sum2$i18$i)|0);
       HEAP32[$688>>2] = 40;
       $689 = HEAP32[(5968)>>2]|0;
       HEAP32[(5508)>>2] = $689;
       break;
      }
     }
    }
    $690 = HEAP32[(5496)>>2]|0;
    $691 = ($tbase$255$i>>>0)<($690>>>0);
    if ($691) {
     HEAP32[(5496)>>2] = $tbase$255$i;
     $755 = $tbase$255$i;
    } else {
     $755 = $690;
    }
    $692 = (($tbase$255$i) + ($tsize$254$i)|0);
    $sp$183$i = (5928);
    while(1) {
     $693 = HEAP32[$sp$183$i>>2]|0;
     $694 = ($693|0)==($692|0);
     if ($694) {
      $$lcssa219 = $sp$183$i;$sp$183$i$lcssa = $sp$183$i;
      label = 212;
      break;
     }
     $695 = ((($sp$183$i)) + 8|0);
     $696 = HEAP32[$695>>2]|0;
     $697 = ($696|0)==(0|0);
     if ($697) {
      $sp$0$i$i$i = (5928);
      break;
     } else {
      $sp$183$i = $696;
     }
    }
    if ((label|0) == 212) {
     $698 = ((($sp$183$i$lcssa)) + 12|0);
     $699 = HEAP32[$698>>2]|0;
     $700 = $699 & 8;
     $701 = ($700|0)==(0);
     if ($701) {
      HEAP32[$$lcssa219>>2] = $tbase$255$i;
      $702 = ((($sp$183$i$lcssa)) + 4|0);
      $703 = HEAP32[$702>>2]|0;
      $704 = (($703) + ($tsize$254$i))|0;
      HEAP32[$702>>2] = $704;
      $705 = ((($tbase$255$i)) + 8|0);
      $706 = $705;
      $707 = $706 & 7;
      $708 = ($707|0)==(0);
      $709 = (0 - ($706))|0;
      $710 = $709 & 7;
      $711 = $708 ? 0 : $710;
      $712 = (($tbase$255$i) + ($711)|0);
      $$sum112$i = (($tsize$254$i) + 8)|0;
      $713 = (($tbase$255$i) + ($$sum112$i)|0);
      $714 = $713;
      $715 = $714 & 7;
      $716 = ($715|0)==(0);
      $717 = (0 - ($714))|0;
      $718 = $717 & 7;
      $719 = $716 ? 0 : $718;
      $$sum113$i = (($719) + ($tsize$254$i))|0;
      $720 = (($tbase$255$i) + ($$sum113$i)|0);
      $721 = $720;
      $722 = $712;
      $723 = (($721) - ($722))|0;
      $$sum$i19$i = (($711) + ($nb$0))|0;
      $724 = (($tbase$255$i) + ($$sum$i19$i)|0);
      $725 = (($723) - ($nb$0))|0;
      $726 = $nb$0 | 3;
      $$sum1$i20$i = (($711) + 4)|0;
      $727 = (($tbase$255$i) + ($$sum1$i20$i)|0);
      HEAP32[$727>>2] = $726;
      $728 = ($720|0)==($635|0);
      L324: do {
       if ($728) {
        $729 = HEAP32[(5492)>>2]|0;
        $730 = (($729) + ($725))|0;
        HEAP32[(5492)>>2] = $730;
        HEAP32[(5504)>>2] = $724;
        $731 = $730 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $732 = (($tbase$255$i) + ($$sum42$i$i)|0);
        HEAP32[$732>>2] = $731;
       } else {
        $733 = HEAP32[(5500)>>2]|0;
        $734 = ($720|0)==($733|0);
        if ($734) {
         $735 = HEAP32[(5488)>>2]|0;
         $736 = (($735) + ($725))|0;
         HEAP32[(5488)>>2] = $736;
         HEAP32[(5500)>>2] = $724;
         $737 = $736 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $738 = (($tbase$255$i) + ($$sum40$i$i)|0);
         HEAP32[$738>>2] = $737;
         $$sum41$i$i = (($736) + ($$sum$i19$i))|0;
         $739 = (($tbase$255$i) + ($$sum41$i$i)|0);
         HEAP32[$739>>2] = $736;
         break;
        }
        $$sum2$i21$i = (($tsize$254$i) + 4)|0;
        $$sum114$i = (($$sum2$i21$i) + ($719))|0;
        $740 = (($tbase$255$i) + ($$sum114$i)|0);
        $741 = HEAP32[$740>>2]|0;
        $742 = $741 & 3;
        $743 = ($742|0)==(1);
        if ($743) {
         $744 = $741 & -8;
         $745 = $741 >>> 3;
         $746 = ($741>>>0)<(256);
         L332: do {
          if ($746) {
           $$sum3738$i$i = $719 | 8;
           $$sum124$i = (($$sum3738$i$i) + ($tsize$254$i))|0;
           $747 = (($tbase$255$i) + ($$sum124$i)|0);
           $748 = HEAP32[$747>>2]|0;
           $$sum39$i$i = (($tsize$254$i) + 12)|0;
           $$sum125$i = (($$sum39$i$i) + ($719))|0;
           $749 = (($tbase$255$i) + ($$sum125$i)|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = $745 << 1;
           $752 = (5520 + ($751<<2)|0);
           $753 = ($748|0)==($752|0);
           do {
            if (!($753)) {
             $754 = ($748>>>0)<($755>>>0);
             if ($754) {
              _abort();
              // unreachable;
             }
             $756 = ((($748)) + 12|0);
             $757 = HEAP32[$756>>2]|0;
             $758 = ($757|0)==($720|0);
             if ($758) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $759 = ($750|0)==($748|0);
           if ($759) {
            $760 = 1 << $745;
            $761 = $760 ^ -1;
            $762 = HEAP32[5480>>2]|0;
            $763 = $762 & $761;
            HEAP32[5480>>2] = $763;
            break;
           }
           $764 = ($750|0)==($752|0);
           do {
            if ($764) {
             $$pre57$i$i = ((($750)) + 8|0);
             $$pre$phi58$i$iZ2D = $$pre57$i$i;
            } else {
             $765 = ($750>>>0)<($755>>>0);
             if ($765) {
              _abort();
              // unreachable;
             }
             $766 = ((($750)) + 8|0);
             $767 = HEAP32[$766>>2]|0;
             $768 = ($767|0)==($720|0);
             if ($768) {
              $$pre$phi58$i$iZ2D = $766;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $769 = ((($748)) + 12|0);
           HEAP32[$769>>2] = $750;
           HEAP32[$$pre$phi58$i$iZ2D>>2] = $748;
          } else {
           $$sum34$i$i = $719 | 24;
           $$sum115$i = (($$sum34$i$i) + ($tsize$254$i))|0;
           $770 = (($tbase$255$i) + ($$sum115$i)|0);
           $771 = HEAP32[$770>>2]|0;
           $$sum5$i$i = (($tsize$254$i) + 12)|0;
           $$sum116$i = (($$sum5$i$i) + ($719))|0;
           $772 = (($tbase$255$i) + ($$sum116$i)|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ($773|0)==($720|0);
           do {
            if ($774) {
             $$sum67$i$i = $719 | 16;
             $$sum122$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $784 = (($tbase$255$i) + ($$sum122$i)|0);
             $785 = HEAP32[$784>>2]|0;
             $786 = ($785|0)==(0|0);
             if ($786) {
              $$sum123$i = (($$sum67$i$i) + ($tsize$254$i))|0;
              $787 = (($tbase$255$i) + ($$sum123$i)|0);
              $788 = HEAP32[$787>>2]|0;
              $789 = ($788|0)==(0|0);
              if ($789) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $788;$RP$0$i$i = $787;
              }
             } else {
              $R$0$i$i = $785;$RP$0$i$i = $784;
             }
             while(1) {
              $790 = ((($R$0$i$i)) + 20|0);
              $791 = HEAP32[$790>>2]|0;
              $792 = ($791|0)==(0|0);
              if (!($792)) {
               $R$0$i$i = $791;$RP$0$i$i = $790;
               continue;
              }
              $793 = ((($R$0$i$i)) + 16|0);
              $794 = HEAP32[$793>>2]|0;
              $795 = ($794|0)==(0|0);
              if ($795) {
               $R$0$i$i$lcssa = $R$0$i$i;$RP$0$i$i$lcssa = $RP$0$i$i;
               break;
              } else {
               $R$0$i$i = $794;$RP$0$i$i = $793;
              }
             }
             $796 = ($RP$0$i$i$lcssa>>>0)<($755>>>0);
             if ($796) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i$lcssa>>2] = 0;
              $R$1$i$i = $R$0$i$i$lcssa;
              break;
             }
            } else {
             $$sum3536$i$i = $719 | 8;
             $$sum117$i = (($$sum3536$i$i) + ($tsize$254$i))|0;
             $775 = (($tbase$255$i) + ($$sum117$i)|0);
             $776 = HEAP32[$775>>2]|0;
             $777 = ($776>>>0)<($755>>>0);
             if ($777) {
              _abort();
              // unreachable;
             }
             $778 = ((($776)) + 12|0);
             $779 = HEAP32[$778>>2]|0;
             $780 = ($779|0)==($720|0);
             if (!($780)) {
              _abort();
              // unreachable;
             }
             $781 = ((($773)) + 8|0);
             $782 = HEAP32[$781>>2]|0;
             $783 = ($782|0)==($720|0);
             if ($783) {
              HEAP32[$778>>2] = $773;
              HEAP32[$781>>2] = $776;
              $R$1$i$i = $773;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $797 = ($771|0)==(0|0);
           if ($797) {
            break;
           }
           $$sum30$i$i = (($tsize$254$i) + 28)|0;
           $$sum118$i = (($$sum30$i$i) + ($719))|0;
           $798 = (($tbase$255$i) + ($$sum118$i)|0);
           $799 = HEAP32[$798>>2]|0;
           $800 = (5784 + ($799<<2)|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = ($720|0)==($801|0);
           do {
            if ($802) {
             HEAP32[$800>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $803 = 1 << $799;
             $804 = $803 ^ -1;
             $805 = HEAP32[(5484)>>2]|0;
             $806 = $805 & $804;
             HEAP32[(5484)>>2] = $806;
             break L332;
            } else {
             $807 = HEAP32[(5496)>>2]|0;
             $808 = ($771>>>0)<($807>>>0);
             if ($808) {
              _abort();
              // unreachable;
             }
             $809 = ((($771)) + 16|0);
             $810 = HEAP32[$809>>2]|0;
             $811 = ($810|0)==($720|0);
             if ($811) {
              HEAP32[$809>>2] = $R$1$i$i;
             } else {
              $812 = ((($771)) + 20|0);
              HEAP32[$812>>2] = $R$1$i$i;
             }
             $813 = ($R$1$i$i|0)==(0|0);
             if ($813) {
              break L332;
             }
            }
           } while(0);
           $814 = HEAP32[(5496)>>2]|0;
           $815 = ($R$1$i$i>>>0)<($814>>>0);
           if ($815) {
            _abort();
            // unreachable;
           }
           $816 = ((($R$1$i$i)) + 24|0);
           HEAP32[$816>>2] = $771;
           $$sum3132$i$i = $719 | 16;
           $$sum119$i = (($$sum3132$i$i) + ($tsize$254$i))|0;
           $817 = (($tbase$255$i) + ($$sum119$i)|0);
           $818 = HEAP32[$817>>2]|0;
           $819 = ($818|0)==(0|0);
           do {
            if (!($819)) {
             $820 = ($818>>>0)<($814>>>0);
             if ($820) {
              _abort();
              // unreachable;
             } else {
              $821 = ((($R$1$i$i)) + 16|0);
              HEAP32[$821>>2] = $818;
              $822 = ((($818)) + 24|0);
              HEAP32[$822>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum120$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $823 = (($tbase$255$i) + ($$sum120$i)|0);
           $824 = HEAP32[$823>>2]|0;
           $825 = ($824|0)==(0|0);
           if ($825) {
            break;
           }
           $826 = HEAP32[(5496)>>2]|0;
           $827 = ($824>>>0)<($826>>>0);
           if ($827) {
            _abort();
            // unreachable;
           } else {
            $828 = ((($R$1$i$i)) + 20|0);
            HEAP32[$828>>2] = $824;
            $829 = ((($824)) + 24|0);
            HEAP32[$829>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $744 | $719;
         $$sum121$i = (($$sum9$i$i) + ($tsize$254$i))|0;
         $830 = (($tbase$255$i) + ($$sum121$i)|0);
         $831 = (($744) + ($725))|0;
         $oldfirst$0$i$i = $830;$qsize$0$i$i = $831;
        } else {
         $oldfirst$0$i$i = $720;$qsize$0$i$i = $725;
        }
        $832 = ((($oldfirst$0$i$i)) + 4|0);
        $833 = HEAP32[$832>>2]|0;
        $834 = $833 & -2;
        HEAP32[$832>>2] = $834;
        $835 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $836 = (($tbase$255$i) + ($$sum10$i$i)|0);
        HEAP32[$836>>2] = $835;
        $$sum11$i$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $837 = (($tbase$255$i) + ($$sum11$i$i)|0);
        HEAP32[$837>>2] = $qsize$0$i$i;
        $838 = $qsize$0$i$i >>> 3;
        $839 = ($qsize$0$i$i>>>0)<(256);
        if ($839) {
         $840 = $838 << 1;
         $841 = (5520 + ($840<<2)|0);
         $842 = HEAP32[5480>>2]|0;
         $843 = 1 << $838;
         $844 = $842 & $843;
         $845 = ($844|0)==(0);
         do {
          if ($845) {
           $846 = $842 | $843;
           HEAP32[5480>>2] = $846;
           $$pre$i22$i = (($840) + 2)|0;
           $$pre56$i$i = (5520 + ($$pre$i22$i<<2)|0);
           $$pre$phi$i23$iZ2D = $$pre56$i$i;$F4$0$i$i = $841;
          } else {
           $$sum29$i$i = (($840) + 2)|0;
           $847 = (5520 + ($$sum29$i$i<<2)|0);
           $848 = HEAP32[$847>>2]|0;
           $849 = HEAP32[(5496)>>2]|0;
           $850 = ($848>>>0)<($849>>>0);
           if (!($850)) {
            $$pre$phi$i23$iZ2D = $847;$F4$0$i$i = $848;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i23$iZ2D>>2] = $724;
         $851 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$851>>2] = $724;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $852 = (($tbase$255$i) + ($$sum27$i$i)|0);
         HEAP32[$852>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $853 = (($tbase$255$i) + ($$sum28$i$i)|0);
         HEAP32[$853>>2] = $841;
         break;
        }
        $854 = $qsize$0$i$i >>> 8;
        $855 = ($854|0)==(0);
        do {
         if ($855) {
          $I7$0$i$i = 0;
         } else {
          $856 = ($qsize$0$i$i>>>0)>(16777215);
          if ($856) {
           $I7$0$i$i = 31;
           break;
          }
          $857 = (($854) + 1048320)|0;
          $858 = $857 >>> 16;
          $859 = $858 & 8;
          $860 = $854 << $859;
          $861 = (($860) + 520192)|0;
          $862 = $861 >>> 16;
          $863 = $862 & 4;
          $864 = $863 | $859;
          $865 = $860 << $863;
          $866 = (($865) + 245760)|0;
          $867 = $866 >>> 16;
          $868 = $867 & 2;
          $869 = $864 | $868;
          $870 = (14 - ($869))|0;
          $871 = $865 << $868;
          $872 = $871 >>> 15;
          $873 = (($870) + ($872))|0;
          $874 = $873 << 1;
          $875 = (($873) + 7)|0;
          $876 = $qsize$0$i$i >>> $875;
          $877 = $876 & 1;
          $878 = $877 | $874;
          $I7$0$i$i = $878;
         }
        } while(0);
        $879 = (5784 + ($I7$0$i$i<<2)|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $880 = (($tbase$255$i) + ($$sum12$i$i)|0);
        HEAP32[$880>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $881 = (($tbase$255$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $882 = (($tbase$255$i) + ($$sum14$i$i)|0);
        HEAP32[$882>>2] = 0;
        HEAP32[$881>>2] = 0;
        $883 = HEAP32[(5484)>>2]|0;
        $884 = 1 << $I7$0$i$i;
        $885 = $883 & $884;
        $886 = ($885|0)==(0);
        if ($886) {
         $887 = $883 | $884;
         HEAP32[(5484)>>2] = $887;
         HEAP32[$879>>2] = $724;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $888 = (($tbase$255$i) + ($$sum15$i$i)|0);
         HEAP32[$888>>2] = $879;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $889 = (($tbase$255$i) + ($$sum16$i$i)|0);
         HEAP32[$889>>2] = $724;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $890 = (($tbase$255$i) + ($$sum17$i$i)|0);
         HEAP32[$890>>2] = $724;
         break;
        }
        $891 = HEAP32[$879>>2]|0;
        $892 = ((($891)) + 4|0);
        $893 = HEAP32[$892>>2]|0;
        $894 = $893 & -8;
        $895 = ($894|0)==($qsize$0$i$i|0);
        L418: do {
         if ($895) {
          $T$0$lcssa$i25$i = $891;
         } else {
          $896 = ($I7$0$i$i|0)==(31);
          $897 = $I7$0$i$i >>> 1;
          $898 = (25 - ($897))|0;
          $899 = $896 ? 0 : $898;
          $900 = $qsize$0$i$i << $899;
          $K8$051$i$i = $900;$T$050$i$i = $891;
          while(1) {
           $907 = $K8$051$i$i >>> 31;
           $908 = (((($T$050$i$i)) + 16|0) + ($907<<2)|0);
           $903 = HEAP32[$908>>2]|0;
           $909 = ($903|0)==(0|0);
           if ($909) {
            $$lcssa = $908;$T$050$i$i$lcssa = $T$050$i$i;
            break;
           }
           $901 = $K8$051$i$i << 1;
           $902 = ((($903)) + 4|0);
           $904 = HEAP32[$902>>2]|0;
           $905 = $904 & -8;
           $906 = ($905|0)==($qsize$0$i$i|0);
           if ($906) {
            $T$0$lcssa$i25$i = $903;
            break L418;
           } else {
            $K8$051$i$i = $901;$T$050$i$i = $903;
           }
          }
          $910 = HEAP32[(5496)>>2]|0;
          $911 = ($$lcssa>>>0)<($910>>>0);
          if ($911) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa>>2] = $724;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $912 = (($tbase$255$i) + ($$sum23$i$i)|0);
           HEAP32[$912>>2] = $T$050$i$i$lcssa;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $913 = (($tbase$255$i) + ($$sum24$i$i)|0);
           HEAP32[$913>>2] = $724;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $914 = (($tbase$255$i) + ($$sum25$i$i)|0);
           HEAP32[$914>>2] = $724;
           break L324;
          }
         }
        } while(0);
        $915 = ((($T$0$lcssa$i25$i)) + 8|0);
        $916 = HEAP32[$915>>2]|0;
        $917 = HEAP32[(5496)>>2]|0;
        $918 = ($916>>>0)>=($917>>>0);
        $not$$i26$i = ($T$0$lcssa$i25$i>>>0)>=($917>>>0);
        $919 = $918 & $not$$i26$i;
        if ($919) {
         $920 = ((($916)) + 12|0);
         HEAP32[$920>>2] = $724;
         HEAP32[$915>>2] = $724;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $921 = (($tbase$255$i) + ($$sum20$i$i)|0);
         HEAP32[$921>>2] = $916;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $922 = (($tbase$255$i) + ($$sum21$i$i)|0);
         HEAP32[$922>>2] = $T$0$lcssa$i25$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $923 = (($tbase$255$i) + ($$sum22$i$i)|0);
         HEAP32[$923>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $711 | 8;
      $924 = (($tbase$255$i) + ($$sum1819$i$i)|0);
      $mem$0 = $924;
      return ($mem$0|0);
     } else {
      $sp$0$i$i$i = (5928);
     }
    }
    while(1) {
     $925 = HEAP32[$sp$0$i$i$i>>2]|0;
     $926 = ($925>>>0)>($635>>>0);
     if (!($926)) {
      $927 = ((($sp$0$i$i$i)) + 4|0);
      $928 = HEAP32[$927>>2]|0;
      $929 = (($925) + ($928)|0);
      $930 = ($929>>>0)>($635>>>0);
      if ($930) {
       $$lcssa215 = $925;$$lcssa216 = $928;$$lcssa217 = $929;
       break;
      }
     }
     $931 = ((($sp$0$i$i$i)) + 8|0);
     $932 = HEAP32[$931>>2]|0;
     $sp$0$i$i$i = $932;
    }
    $$sum$i14$i = (($$lcssa216) + -47)|0;
    $$sum1$i15$i = (($$lcssa216) + -39)|0;
    $933 = (($$lcssa215) + ($$sum1$i15$i)|0);
    $934 = $933;
    $935 = $934 & 7;
    $936 = ($935|0)==(0);
    $937 = (0 - ($934))|0;
    $938 = $937 & 7;
    $939 = $936 ? 0 : $938;
    $$sum2$i16$i = (($$sum$i14$i) + ($939))|0;
    $940 = (($$lcssa215) + ($$sum2$i16$i)|0);
    $941 = ((($635)) + 16|0);
    $942 = ($940>>>0)<($941>>>0);
    $943 = $942 ? $635 : $940;
    $944 = ((($943)) + 8|0);
    $945 = (($tsize$254$i) + -40)|0;
    $946 = ((($tbase$255$i)) + 8|0);
    $947 = $946;
    $948 = $947 & 7;
    $949 = ($948|0)==(0);
    $950 = (0 - ($947))|0;
    $951 = $950 & 7;
    $952 = $949 ? 0 : $951;
    $953 = (($tbase$255$i) + ($952)|0);
    $954 = (($945) - ($952))|0;
    HEAP32[(5504)>>2] = $953;
    HEAP32[(5492)>>2] = $954;
    $955 = $954 | 1;
    $$sum$i$i$i = (($952) + 4)|0;
    $956 = (($tbase$255$i) + ($$sum$i$i$i)|0);
    HEAP32[$956>>2] = $955;
    $$sum2$i$i$i = (($tsize$254$i) + -36)|0;
    $957 = (($tbase$255$i) + ($$sum2$i$i$i)|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(5968)>>2]|0;
    HEAP32[(5508)>>2] = $958;
    $959 = ((($943)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$944>>2]=HEAP32[(5928)>>2]|0;HEAP32[$944+4>>2]=HEAP32[(5928)+4>>2]|0;HEAP32[$944+8>>2]=HEAP32[(5928)+8>>2]|0;HEAP32[$944+12>>2]=HEAP32[(5928)+12>>2]|0;
    HEAP32[(5928)>>2] = $tbase$255$i;
    HEAP32[(5932)>>2] = $tsize$254$i;
    HEAP32[(5940)>>2] = 0;
    HEAP32[(5936)>>2] = $944;
    $960 = ((($943)) + 28|0);
    HEAP32[$960>>2] = 7;
    $961 = ((($943)) + 32|0);
    $962 = ($961>>>0)<($$lcssa217>>>0);
    if ($962) {
     $964 = $960;
     while(1) {
      $963 = ((($964)) + 4|0);
      HEAP32[$963>>2] = 7;
      $965 = ((($964)) + 8|0);
      $966 = ($965>>>0)<($$lcssa217>>>0);
      if ($966) {
       $964 = $963;
      } else {
       break;
      }
     }
    }
    $967 = ($943|0)==($635|0);
    if (!($967)) {
     $968 = $943;
     $969 = $635;
     $970 = (($968) - ($969))|0;
     $971 = HEAP32[$959>>2]|0;
     $972 = $971 & -2;
     HEAP32[$959>>2] = $972;
     $973 = $970 | 1;
     $974 = ((($635)) + 4|0);
     HEAP32[$974>>2] = $973;
     HEAP32[$943>>2] = $970;
     $975 = $970 >>> 3;
     $976 = ($970>>>0)<(256);
     if ($976) {
      $977 = $975 << 1;
      $978 = (5520 + ($977<<2)|0);
      $979 = HEAP32[5480>>2]|0;
      $980 = 1 << $975;
      $981 = $979 & $980;
      $982 = ($981|0)==(0);
      if ($982) {
       $983 = $979 | $980;
       HEAP32[5480>>2] = $983;
       $$pre$i$i = (($977) + 2)|0;
       $$pre14$i$i = (5520 + ($$pre$i$i<<2)|0);
       $$pre$phi$i$iZ2D = $$pre14$i$i;$F$0$i$i = $978;
      } else {
       $$sum4$i$i = (($977) + 2)|0;
       $984 = (5520 + ($$sum4$i$i<<2)|0);
       $985 = HEAP32[$984>>2]|0;
       $986 = HEAP32[(5496)>>2]|0;
       $987 = ($985>>>0)<($986>>>0);
       if ($987) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $984;$F$0$i$i = $985;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $988 = ((($F$0$i$i)) + 12|0);
      HEAP32[$988>>2] = $635;
      $989 = ((($635)) + 8|0);
      HEAP32[$989>>2] = $F$0$i$i;
      $990 = ((($635)) + 12|0);
      HEAP32[$990>>2] = $978;
      break;
     }
     $991 = $970 >>> 8;
     $992 = ($991|0)==(0);
     if ($992) {
      $I1$0$i$i = 0;
     } else {
      $993 = ($970>>>0)>(16777215);
      if ($993) {
       $I1$0$i$i = 31;
      } else {
       $994 = (($991) + 1048320)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 8;
       $997 = $991 << $996;
       $998 = (($997) + 520192)|0;
       $999 = $998 >>> 16;
       $1000 = $999 & 4;
       $1001 = $1000 | $996;
       $1002 = $997 << $1000;
       $1003 = (($1002) + 245760)|0;
       $1004 = $1003 >>> 16;
       $1005 = $1004 & 2;
       $1006 = $1001 | $1005;
       $1007 = (14 - ($1006))|0;
       $1008 = $1002 << $1005;
       $1009 = $1008 >>> 15;
       $1010 = (($1007) + ($1009))|0;
       $1011 = $1010 << 1;
       $1012 = (($1010) + 7)|0;
       $1013 = $970 >>> $1012;
       $1014 = $1013 & 1;
       $1015 = $1014 | $1011;
       $I1$0$i$i = $1015;
      }
     }
     $1016 = (5784 + ($I1$0$i$i<<2)|0);
     $1017 = ((($635)) + 28|0);
     HEAP32[$1017>>2] = $I1$0$i$i;
     $1018 = ((($635)) + 20|0);
     HEAP32[$1018>>2] = 0;
     HEAP32[$941>>2] = 0;
     $1019 = HEAP32[(5484)>>2]|0;
     $1020 = 1 << $I1$0$i$i;
     $1021 = $1019 & $1020;
     $1022 = ($1021|0)==(0);
     if ($1022) {
      $1023 = $1019 | $1020;
      HEAP32[(5484)>>2] = $1023;
      HEAP32[$1016>>2] = $635;
      $1024 = ((($635)) + 24|0);
      HEAP32[$1024>>2] = $1016;
      $1025 = ((($635)) + 12|0);
      HEAP32[$1025>>2] = $635;
      $1026 = ((($635)) + 8|0);
      HEAP32[$1026>>2] = $635;
      break;
     }
     $1027 = HEAP32[$1016>>2]|0;
     $1028 = ((($1027)) + 4|0);
     $1029 = HEAP32[$1028>>2]|0;
     $1030 = $1029 & -8;
     $1031 = ($1030|0)==($970|0);
     L459: do {
      if ($1031) {
       $T$0$lcssa$i$i = $1027;
      } else {
       $1032 = ($I1$0$i$i|0)==(31);
       $1033 = $I1$0$i$i >>> 1;
       $1034 = (25 - ($1033))|0;
       $1035 = $1032 ? 0 : $1034;
       $1036 = $970 << $1035;
       $K2$07$i$i = $1036;$T$06$i$i = $1027;
       while(1) {
        $1043 = $K2$07$i$i >>> 31;
        $1044 = (((($T$06$i$i)) + 16|0) + ($1043<<2)|0);
        $1039 = HEAP32[$1044>>2]|0;
        $1045 = ($1039|0)==(0|0);
        if ($1045) {
         $$lcssa211 = $1044;$T$06$i$i$lcssa = $T$06$i$i;
         break;
        }
        $1037 = $K2$07$i$i << 1;
        $1038 = ((($1039)) + 4|0);
        $1040 = HEAP32[$1038>>2]|0;
        $1041 = $1040 & -8;
        $1042 = ($1041|0)==($970|0);
        if ($1042) {
         $T$0$lcssa$i$i = $1039;
         break L459;
        } else {
         $K2$07$i$i = $1037;$T$06$i$i = $1039;
        }
       }
       $1046 = HEAP32[(5496)>>2]|0;
       $1047 = ($$lcssa211>>>0)<($1046>>>0);
       if ($1047) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$$lcssa211>>2] = $635;
        $1048 = ((($635)) + 24|0);
        HEAP32[$1048>>2] = $T$06$i$i$lcssa;
        $1049 = ((($635)) + 12|0);
        HEAP32[$1049>>2] = $635;
        $1050 = ((($635)) + 8|0);
        HEAP32[$1050>>2] = $635;
        break L299;
       }
      }
     } while(0);
     $1051 = ((($T$0$lcssa$i$i)) + 8|0);
     $1052 = HEAP32[$1051>>2]|0;
     $1053 = HEAP32[(5496)>>2]|0;
     $1054 = ($1052>>>0)>=($1053>>>0);
     $not$$i$i = ($T$0$lcssa$i$i>>>0)>=($1053>>>0);
     $1055 = $1054 & $not$$i$i;
     if ($1055) {
      $1056 = ((($1052)) + 12|0);
      HEAP32[$1056>>2] = $635;
      HEAP32[$1051>>2] = $635;
      $1057 = ((($635)) + 8|0);
      HEAP32[$1057>>2] = $1052;
      $1058 = ((($635)) + 12|0);
      HEAP32[$1058>>2] = $T$0$lcssa$i$i;
      $1059 = ((($635)) + 24|0);
      HEAP32[$1059>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1060 = HEAP32[(5492)>>2]|0;
  $1061 = ($1060>>>0)>($nb$0>>>0);
  if ($1061) {
   $1062 = (($1060) - ($nb$0))|0;
   HEAP32[(5492)>>2] = $1062;
   $1063 = HEAP32[(5504)>>2]|0;
   $1064 = (($1063) + ($nb$0)|0);
   HEAP32[(5504)>>2] = $1064;
   $1065 = $1062 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1066 = (($1063) + ($$sum$i32)|0);
   HEAP32[$1066>>2] = $1065;
   $1067 = $nb$0 | 3;
   $1068 = ((($1063)) + 4|0);
   HEAP32[$1068>>2] = $1067;
   $1069 = ((($1063)) + 8|0);
   $mem$0 = $1069;
   return ($mem$0|0);
  }
 }
 $1070 = (___errno_location()|0);
 HEAP32[$1070>>2] = 12;
 $mem$0 = 0;
 return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi59Z2D = 0, $$pre$phi61Z2D = 0, $$pre$phiZ2D = 0, $$pre57 = 0, $$pre58 = 0, $$pre60 = 0, $$sum = 0, $$sum11 = 0, $$sum12 = 0, $$sum13 = 0, $$sum14 = 0, $$sum1718 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum22 = 0, $$sum23 = 0, $$sum24 = 0;
 var $$sum25 = 0, $$sum26 = 0, $$sum27 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0, $$sum31 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0;
 var $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $K19$052 = 0, $R$0 = 0, $R$0$lcssa = 0, $R$1 = 0;
 var $R7$0 = 0, $R7$0$lcssa = 0, $R7$1 = 0, $RP$0 = 0, $RP$0$lcssa = 0, $RP9$0 = 0, $RP9$0$lcssa = 0, $T$0$lcssa = 0, $T$051 = 0, $T$051$lcssa = 0, $cond = 0, $cond47 = 0, $not$ = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(5496)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[(5500)>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[(5488)>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum20 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum20)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum30 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum30)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum31 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum31)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = (5520 + ($25<<2)|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = ((($22)) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[5480>>2]|0;
     $36 = $35 & $34;
     HEAP32[5480>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre60 = ((($24)) + 8|0);
     $$pre$phi61Z2D = $$pre60;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = ((($24)) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi61Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = ((($22)) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi61Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum22 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum22)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum23 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum23)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum25 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum25)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum24 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum24)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = ((($R$0)) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = ((($R$0)) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       $R$0$lcssa = $R$0;$RP$0$lcssa = $RP$0;
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0$lcssa>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0$lcssa>>2] = 0;
      $R$1 = $R$0$lcssa;
      break;
     }
    } else {
     $$sum29 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum29)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = ((($49)) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = ((($46)) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum26 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum26)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = (5784 + ($72<<2)|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[(5484)>>2]|0;
      $79 = $78 & $77;
      HEAP32[(5484)>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[(5496)>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = ((($44)) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = ((($44)) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[(5496)>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = ((($R$1)) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum27 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum27)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = ((($R$1)) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = ((($91)) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum28 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum28)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[(5496)>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = ((($R$1)) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = ((($97)) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum19 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum19)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[(5504)>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[(5492)>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[(5492)>>2] = $120;
   HEAP32[(5504)>>2] = $p$0;
   $121 = $120 | 1;
   $122 = ((($p$0)) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[(5500)>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    return;
   }
   HEAP32[(5500)>>2] = 0;
   HEAP32[(5488)>>2] = 0;
   return;
  }
  $125 = HEAP32[(5500)>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[(5488)>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[(5488)>>2] = $128;
   HEAP32[(5500)>>2] = $p$0;
   $129 = $128 | 1;
   $130 = ((($p$0)) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum1718 = $8 | 4;
    $138 = (($mem) + ($$sum1718)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = (5520 + ($140<<2)|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[(5496)>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = ((($137)) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[5480>>2]|0;
     $152 = $151 & $150;
     HEAP32[5480>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre58 = ((($139)) + 8|0);
     $$pre$phi59Z2D = $$pre58;
    } else {
     $154 = HEAP32[(5496)>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = ((($139)) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi59Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = ((($137)) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi59Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = ((($R7$0)) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = ((($R7$0)) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        $R7$0$lcssa = $R7$0;$RP9$0$lcssa = $RP9$0;
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[(5496)>>2]|0;
      $188 = ($RP9$0$lcssa>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0$lcssa>>2] = 0;
       $R7$1 = $R7$0$lcssa;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[(5496)>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = ((($166)) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = ((($163)) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum12 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum12)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = (5784 + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond47 = ($R7$1|0)==(0|0);
      if ($cond47) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[(5484)>>2]|0;
       $198 = $197 & $196;
       HEAP32[(5484)>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[(5496)>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = ((($161)) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = ((($161)) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[(5496)>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = ((($R7$1)) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum13 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum13)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = ((($R7$1)) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = ((($210)) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum14 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum14)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[(5496)>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = ((($R7$1)) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = ((($216)) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = ((($p$0)) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[(5500)>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[(5488)>>2] = $133;
   return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = ((($p$0)) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = (5520 + ($233<<2)|0);
  $235 = HEAP32[5480>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[5480>>2] = $239;
   $$pre = (($233) + 2)|0;
   $$pre57 = (5520 + ($$pre<<2)|0);
   $$pre$phiZ2D = $$pre57;$F16$0 = $234;
  } else {
   $$sum11 = (($233) + 2)|0;
   $240 = (5520 + ($$sum11<<2)|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[(5496)>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = ((($F16$0)) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = ((($p$0)) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = ((($p$0)) + 12|0);
  HEAP32[$246>>2] = $234;
  return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = (5784 + ($I18$0<<2)|0);
 $273 = ((($p$0)) + 28|0);
 HEAP32[$273>>2] = $I18$0;
 $274 = ((($p$0)) + 16|0);
 $275 = ((($p$0)) + 20|0);
 HEAP32[$275>>2] = 0;
 HEAP32[$274>>2] = 0;
 $276 = HEAP32[(5484)>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[(5484)>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = ((($p$0)) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = ((($p$0)) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = ((($p$0)) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ((($284)) + 4|0);
   $286 = HEAP32[$285>>2]|0;
   $287 = $286 & -8;
   $288 = ($287|0)==($psize$1|0);
   L201: do {
    if ($288) {
     $T$0$lcssa = $284;
    } else {
     $289 = ($I18$0|0)==(31);
     $290 = $I18$0 >>> 1;
     $291 = (25 - ($290))|0;
     $292 = $289 ? 0 : $291;
     $293 = $psize$1 << $292;
     $K19$052 = $293;$T$051 = $284;
     while(1) {
      $300 = $K19$052 >>> 31;
      $301 = (((($T$051)) + 16|0) + ($300<<2)|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       $$lcssa = $301;$T$051$lcssa = $T$051;
       break;
      }
      $294 = $K19$052 << 1;
      $295 = ((($296)) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L201;
      } else {
       $K19$052 = $294;$T$051 = $296;
      }
     }
     $303 = HEAP32[(5496)>>2]|0;
     $304 = ($$lcssa>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$$lcssa>>2] = $p$0;
      $305 = ((($p$0)) + 24|0);
      HEAP32[$305>>2] = $T$051$lcssa;
      $306 = ((($p$0)) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = ((($p$0)) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = ((($T$0$lcssa)) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[(5496)>>2]|0;
   $311 = ($309>>>0)>=($310>>>0);
   $not$ = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = $311 & $not$;
   if ($312) {
    $313 = ((($309)) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = ((($p$0)) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = ((($p$0)) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = ((($p$0)) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[(5512)>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[(5512)>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = (5936);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = ((($sp$0$i)) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[(5512)>>2] = -1;
 return;
}
function _calloc($n_elements,$elem_size) {
 $n_elements = $n_elements|0;
 $elem_size = $elem_size|0;
 var $$ = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $req$0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($n_elements|0)==(0);
 if ($0) {
  $req$0 = 0;
 } else {
  $1 = Math_imul($elem_size, $n_elements)|0;
  $2 = $elem_size | $n_elements;
  $3 = ($2>>>0)>(65535);
  if ($3) {
   $4 = (($1>>>0) / ($n_elements>>>0))&-1;
   $5 = ($4|0)==($elem_size|0);
   $$ = $5 ? $1 : -1;
   $req$0 = $$;
  } else {
   $req$0 = $1;
  }
 }
 $6 = (_malloc($req$0)|0);
 $7 = ($6|0)==(0|0);
 if ($7) {
  return ($6|0);
 }
 $8 = ((($6)) + -4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = $9 & 3;
 $11 = ($10|0)==(0);
 if ($11) {
  return ($6|0);
 }
 _memset(($6|0),0,($req$0|0))|0;
 return ($6|0);
}
function runPostSets() {

}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
  }
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
  }
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
  }
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 8 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  
function dynCall_viiiii(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0;
  FUNCTION_TABLE_viiiii[index&31](a1|0,a2|0,a3|0,a4|0,a5|0);
}


function dynCall_iiiddi(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=+a3; a4=+a4; a5=a5|0;
  return FUNCTION_TABLE_iiiddi[index&127](a1|0,a2|0,+a3,+a4,a5|0)|0;
}


function dynCall_vd(index,a1) {
  index = index|0;
  a1=+a1;
  FUNCTION_TABLE_vd[index&127](+a1);
}


function dynCall_vid(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=+a2;
  FUNCTION_TABLE_vid[index&127](a1|0,+a2);
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&127](a1|0);
}


function dynCall_iiidd(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=+a3; a4=+a4;
  return FUNCTION_TABLE_iiidd[index&63](a1|0,a2|0,+a3,+a4)|0;
}


function dynCall_vii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  FUNCTION_TABLE_vii[index&63](a1|0,a2|0);
}


function dynCall_iiiddd(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=+a3; a4=+a4; a5=+a5;
  return FUNCTION_TABLE_iiiddd[index&63](a1|0,a2|0,+a3,+a4,+a5)|0;
}


function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&127](a1|0)|0;
}


function dynCall_iidd(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=+a2; a3=+a3;
  return FUNCTION_TABLE_iidd[index&63](a1|0,+a2,+a3)|0;
}


function dynCall_iiiiii(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0;
  return FUNCTION_TABLE_iiiiii[index&127](a1|0,a2|0,a3|0,a4|0,a5|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&63](a1|0,a2|0,a3|0)|0;
}


function dynCall_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0;
  FUNCTION_TABLE_viiiiii[index&31](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0);
}


function dynCall_iiid(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=+a3;
  return FUNCTION_TABLE_iiid[index&63](a1|0,a2|0,+a3)|0;
}


function dynCall_iid(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=+a2;
  return FUNCTION_TABLE_iid[index&63](a1|0,+a2)|0;
}


function dynCall_iiddd(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=+a2; a3=+a3; a4=+a4;
  return FUNCTION_TABLE_iiddd[index&63](a1|0,+a2,+a3,+a4)|0;
}


function dynCall_iiddi(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=+a2; a3=+a3; a4=a4|0;
  return FUNCTION_TABLE_iiddi[index&127](a1|0,+a2,+a3,a4|0)|0;
}


function dynCall_iii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  return FUNCTION_TABLE_iii[index&63](a1|0,a2|0)|0;
}


function dynCall_iiiiddiddi(index,a1,a2,a3,a4,a5,a6,a7,a8,a9) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=+a4; a5=+a5; a6=a6|0; a7=+a7; a8=+a8; a9=a9|0;
  return FUNCTION_TABLE_iiiiddiddi[index&63](a1|0,a2|0,a3|0,+a4,+a5,a6|0,+a7,+a8,a9|0)|0;
}


function dynCall_iiiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return FUNCTION_TABLE_iiiii[index&127](a1|0,a2|0,a3|0,a4|0)|0;
}


function dynCall_iiiddiddi(index,a1,a2,a3,a4,a5,a6,a7,a8) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=+a3; a4=+a4; a5=a5|0; a6=+a6; a7=+a7; a8=a8|0;
  return FUNCTION_TABLE_iiiddiddi[index&63](a1|0,a2|0,+a3,+a4,a5|0,+a6,+a7,a8|0)|0;
}


function dynCall_viii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  FUNCTION_TABLE_viii[index&63](a1|0,a2|0,a3|0);
}


function dynCall_v(index) {
  index = index|0;
  
  FUNCTION_TABLE_v[index&0]();
}


function dynCall_viiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  FUNCTION_TABLE_viiii[index&31](a1|0,a2|0,a3|0,a4|0);
}

function b0(p0,p1,p2,p3,p4) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0; nullFunc_viiiii(0); }
function b1(p0,p1,p2,p3,p4) { p0 = p0|0;p1 = p1|0;p2 = +p2;p3 = +p3;p4 = p4|0; nullFunc_iiiddi(1);return 0; }
function b2(p0) { p0 = +p0; nullFunc_vd(2); }
function b3(p0,p1) { p0 = p0|0;p1 = +p1; nullFunc_vid(3); }
function b4(p0) { p0 = p0|0; nullFunc_vi(4); }
function b5(p0,p1,p2,p3) { p0 = p0|0;p1 = p1|0;p2 = +p2;p3 = +p3; nullFunc_iiidd(5);return 0; }
function b6(p0,p1) { p0 = p0|0;p1 = p1|0; nullFunc_vii(6); }
function b7(p0,p1,p2,p3,p4) { p0 = p0|0;p1 = p1|0;p2 = +p2;p3 = +p3;p4 = +p4; nullFunc_iiiddd(7);return 0; }
function b8(p0) { p0 = p0|0; nullFunc_ii(8);return 0; }
function b9(p0,p1,p2) { p0 = p0|0;p1 = +p1;p2 = +p2; nullFunc_iidd(9);return 0; }
function b10(p0,p1,p2,p3,p4) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0; nullFunc_iiiiii(10);return 0; }
function b11(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_iiii(11);return 0; }
function b12(p0,p1,p2,p3,p4,p5) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; nullFunc_viiiiii(12); }
function b13(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = +p2; nullFunc_iiid(13);return 0; }
function b14(p0,p1) { p0 = p0|0;p1 = +p1; nullFunc_iid(14);return 0; }
function b15(p0,p1,p2,p3) { p0 = p0|0;p1 = +p1;p2 = +p2;p3 = +p3; nullFunc_iiddd(15);return 0; }
function b16(p0,p1,p2,p3) { p0 = p0|0;p1 = +p1;p2 = +p2;p3 = p3|0; nullFunc_iiddi(16);return 0; }
function b17(p0,p1) { p0 = p0|0;p1 = p1|0; nullFunc_iii(17);return 0; }
function b18(p0,p1,p2,p3,p4,p5,p6,p7,p8) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = +p3;p4 = +p4;p5 = p5|0;p6 = +p6;p7 = +p7;p8 = p8|0; nullFunc_iiiiddiddi(18);return 0; }
function b19(p0,p1,p2,p3) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_iiiii(19);return 0; }
function b20(p0,p1,p2,p3,p4,p5,p6,p7) { p0 = p0|0;p1 = p1|0;p2 = +p2;p3 = +p3;p4 = p4|0;p5 = +p5;p6 = +p6;p7 = p7|0; nullFunc_iiiddiddi(20);return 0; }
function b21(p0,p1,p2) { p0 = p0|0;p1 = p1|0;p2 = p2|0; nullFunc_viii(21); }
function b22() { ; nullFunc_v(22); }
function b23(p0,p1,p2,p3) { p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; nullFunc_viiii(23); }

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_viiiii = [b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,b0,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b0,b0,b0,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b0,b0,b0,__ZNK10__cxxabiv121__vmi_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,b0,b0,b0,b0,b0,b0,b0,b0
,b0,b0,b0];
var FUNCTION_TABLE_iiiddi = [b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,__ZN10emscripten8internal7InvokerIP13heman_image_sJS3_ffS3_EE6invokeEPFS3_S3_ffS3_ES3_ffS3_,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1,b1
,b1,b1,b1,b1,b1,b1,b1,b1,b1];
var FUNCTION_TABLE_vd = [b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,_heman_color_set_gamma,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2,b2
,b2,b2,b2,b2,b2,b2,b2,b2,b2];
var FUNCTION_TABLE_vid = [b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3,__ZN10emscripten8internal7InvokerIvJfEE6invokeEPFvfEf,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3,b3
,b3,b3,b3,b3,b3,b3,b3,b3,b3];
var FUNCTION_TABLE_vi = [b4,__ZNSt9bad_allocD2Ev,__ZNSt9bad_allocD0Ev,b4,__ZN10__cxxabiv116__shim_type_infoD2Ev,__ZN10__cxxabiv123__fundamental_type_infoD0Ev,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,b4,__ZN10__cxxabiv117__class_type_infoD0Ev,b4,b4,b4,b4,__ZN10__cxxabiv120__si_class_type_infoD0Ev,b4,b4,b4,__ZN10__cxxabiv121__vmi_class_type_infoD0Ev,b4,b4,b4,__ZN10__cxxabiv119__pointer_type_infoD0Ev,b4,b4,__ZN10emscripten8internal14raw_destructorI13heman_image_sEEvPT_,b4,b4,b4
,b4,b4,b4,b4,__ZN10emscripten8internal14raw_destructorI5ImageEEvPT_,b4,b4,b4,_heman_image_destroy,b4,__ZN10emscripten8internal14raw_destructorI8GenerateEEvPT_,b4,b4,b4,b4,b4,__ZN10emscripten8internal14raw_destructorI3OpsEEvPT_,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,__ZN10emscripten8internal14raw_destructorI8LightingEEvPT_,b4,b4,b4,b4,b4,__ZN10emscripten8internal14raw_destructorI5ColorEEvPT_,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4,b4
,b4,b4,b4,b4,b4,b4,b4,b4,b4];
var FUNCTION_TABLE_iiidd = [b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5
,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,b5,__ZN10emscripten8internal7InvokerIP13heman_image_sJS3_ffEE6invokeEPFS3_S3_ffES3_ff,b5,b5,b5,b5,b5,b5,b5,b5,b5
,b5,b5,b5,b5,b5];
var FUNCTION_TABLE_vii = [b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6
,b6,b6,b6,b6,b6,b6,b6,__ZN10emscripten8internal7InvokerIvJP13heman_image_sEE6invokeEPFvS3_ES3_,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,b6,_heman_ops_accumulate,b6
,b6,b6,b6,b6,b6];
var FUNCTION_TABLE_iiiddd = [b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7,b7
,b7,__ZN10emscripten8internal7InvokerIP13heman_image_sJS3_fffEE6invokeEPFS3_S3_fffES3_fff,b7,b7,b7];
var FUNCTION_TABLE_ii = [b8,b8,b8,__ZNKSt9bad_alloc4whatEv,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,__ZN10emscripten8internal13getActualTypeI13heman_image_sEEPKvPT_,b8,__ZL12buffer_widthP13heman_image_s,b8,__ZL13buffer_heightP13heman_image_s
,__ZL13buffer_nbandsP13heman_image_s,__ZL12buffer_beginP13heman_image_s,__ZL10buffer_endP13heman_image_s,__ZN10emscripten8internal13getActualTypeI5ImageEEPKvPT_,b8,b8,b8,b8,b8,__ZN10emscripten8internal13getActualTypeI8GenerateEEPKvPT_,b8,b8,b8,b8,b8,__ZN10emscripten8internal13getActualTypeI3OpsEEPKvPT_,b8,b8,b8,b8,b8,b8,b8,b8,b8,_heman_ops_sweep,_heman_ops_laplacian,b8,b8,__ZN10emscripten8internal13getActualTypeI8LightingEEPKvPT_
,b8,b8,b8,_heman_lighting_compute_normals,_heman_lighting_compute_occlusion,__ZN10emscripten8internal13getActualTypeI5ColorEEPKvPT_,b8,b8,b8,b8,b8,b8,b8,_heman_color_from_grayscale,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8
,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8,b8
,b8,b8,b8,b8,b8,b8,b8,b8,b8];
var FUNCTION_TABLE_iidd = [b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,b9,_heman_ops_normalize_f32,b9,b9,b9,b9,b9,b9,b9,b9
,b9,b9,b9,b9,b9];
var FUNCTION_TABLE_iiiiii = [b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,__ZN10emscripten8internal7InvokerIP13heman_image_sJiiPKiPKjEE6invokeEPFS3_iiS5_S7_EiiS5_S7_,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10,b10
,b10,b10,b10,b10,b10,b10,b10,b10,b10];
var FUNCTION_TABLE_iiii = [b11,b11,b11,b11,b11,b11,b11,b11,__ZNK10__cxxabiv123__fundamental_type_info9can_catchEPKNS_16__shim_type_infoERPv,b11,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,__ZNK10__cxxabiv119__pointer_type_info9can_catchEPKNS_16__shim_type_infoERPv,b11,b11,b11,b11,b11
,b11,b11,b11,b11,b11,b11,_heman_image_create,b11,b11,b11,b11,_heman_generate_island_heightmap,_heman_generate_planet_heightmap,b11,b11,b11,b11,__ZN10emscripten8internal7InvokerIP13heman_image_sJPS3_iEE6invokeEPFS3_S4_iES4_i,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11,b11
,b11,b11,b11,b11,b11];
var FUNCTION_TABLE_viiiiii = [b12,b12,b12,b12,b12,b12,b12,b12,b12,b12,b12,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b12,b12,b12,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b12,b12,b12,__ZNK10__cxxabiv121__vmi_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b12,b12,b12,b12,b12,b12,b12,b12,b12
,b12,b12,b12];
var FUNCTION_TABLE_iiid = [b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13
,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,b13,__ZN10emscripten8internal7InvokerIP13heman_image_sJS3_fEE6invokeEPFS3_S3_fES3_f,b13,b13,b13,b13,b13,b13,b13
,b13,b13,b13,b13,b13];
var FUNCTION_TABLE_iid = [b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14
,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,b14,_heman_ops_step,b14,b14,b14,b14,b14,b14
,b14,b14,b14,b14,b14];
var FUNCTION_TABLE_iiddd = [b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15
,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15,b15
,b15,b15,__ZL14lighting_applyP13heman_image_sfff,b15,b15];
var FUNCTION_TABLE_iiddi = [b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16
,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16
,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,_heman_color_apply_gradient,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16
,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16,b16
,b16,b16,b16,b16,b16,b16,b16,b16,b16];
var FUNCTION_TABLE_iii = [b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,__ZN10emscripten8internal15FunctionInvokerIPFiP13heman_image_sEiS3_JEE6invokeEPS5_S3_,b17
,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,b17,_heman_ops_stitch_horizontal,_heman_ops_stitch_vertical,b17,b17,b17,b17,__ZN10emscripten8internal7InvokerIP13heman_image_sJS3_EE6invokeEPFS3_S3_ES3_,b17,b17,b17,b17,b17
,b17,b17,b17,b17,b17];
var FUNCTION_TABLE_iiiiddiddi = [b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,__ZN10emscripten8internal7InvokerIP13heman_image_sJiiffiffiEE6invokeEPFS3_iiffiffiEiiffiffi,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18,b18
,b18,b18,b18,b18,b18];
var FUNCTION_TABLE_iiiii = [b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19
,b19,b19,b19,b19,b19,__ZN10emscripten8internal7InvokerIP13heman_image_sJiiiEE6invokeEPFS3_iiiEiii,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19
,b19,b19,b19,b19,b19,b19,b19,b19,_heman_color_create_gradient,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19
,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19,b19
,b19,b19,b19,b19,b19,b19,b19,b19,b19];
var FUNCTION_TABLE_iiiddiddi = [b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20
,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,_heman_generate_simplex_fbm,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20,b20
,b20,b20,b20,b20,b20];
var FUNCTION_TABLE_viii = [b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21
,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,b21,__ZN10emscripten8internal7InvokerIvJP13heman_image_sS3_EE6invokeEPFvS3_S3_ES3_S3_,b21,b21
,b21,b21,b21,b21,b21];
var FUNCTION_TABLE_v = [b22];
var FUNCTION_TABLE_viiii = [b23,b23,b23,b23,b23,b23,b23,b23,b23,b23,b23,b23,b23,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b23,b23,b23,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b23,b23,b23,__ZNK10__cxxabiv121__vmi_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b23,b23,b23,b23,b23,b23,b23
,b23,b23,b23];

  return { _strlen: _strlen, _free: _free, _i64Add: _i64Add, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, ___getTypeName: ___getTypeName, __GLOBAL__sub_I_wrapjs_cpp: __GLOBAL__sub_I_wrapjs_cpp, __GLOBAL__sub_I_bind_cpp: __GLOBAL__sub_I_bind_cpp, runPostSets: runPostSets, _emscripten_replace_memory: _emscripten_replace_memory, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_viiiii: dynCall_viiiii, dynCall_iiiddi: dynCall_iiiddi, dynCall_vd: dynCall_vd, dynCall_vid: dynCall_vid, dynCall_vi: dynCall_vi, dynCall_iiidd: dynCall_iiidd, dynCall_vii: dynCall_vii, dynCall_iiiddd: dynCall_iiiddd, dynCall_ii: dynCall_ii, dynCall_iidd: dynCall_iidd, dynCall_iiiiii: dynCall_iiiiii, dynCall_iiii: dynCall_iiii, dynCall_viiiiii: dynCall_viiiiii, dynCall_iiid: dynCall_iiid, dynCall_iid: dynCall_iid, dynCall_iiddd: dynCall_iiddd, dynCall_iiddi: dynCall_iiddi, dynCall_iii: dynCall_iii, dynCall_iiiiddiddi: dynCall_iiiiddiddi, dynCall_iiiii: dynCall_iiiii, dynCall_iiiddiddi: dynCall_iiiddiddi, dynCall_viii: dynCall_viii, dynCall_v: dynCall_v, dynCall_viiii: dynCall_viiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real___GLOBAL__sub_I_bind_cpp = asm["__GLOBAL__sub_I_bind_cpp"]; asm["__GLOBAL__sub_I_bind_cpp"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real___GLOBAL__sub_I_bind_cpp.apply(null, arguments);
};

var real__i64Add = asm["_i64Add"]; asm["_i64Add"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__i64Add.apply(null, arguments);
};

var real____getTypeName = asm["___getTypeName"]; asm["___getTypeName"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real____getTypeName.apply(null, arguments);
};

var real___GLOBAL__sub_I_wrapjs_cpp = asm["__GLOBAL__sub_I_wrapjs_cpp"]; asm["__GLOBAL__sub_I_wrapjs_cpp"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real___GLOBAL__sub_I_wrapjs_cpp.apply(null, arguments);
};

var real__emscripten_replace_memory = asm["_emscripten_replace_memory"]; asm["_emscripten_replace_memory"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__emscripten_replace_memory.apply(null, arguments);
};
var _strlen = Module["_strlen"] = asm["_strlen"];
var __GLOBAL__sub_I_bind_cpp = Module["__GLOBAL__sub_I_bind_cpp"] = asm["__GLOBAL__sub_I_bind_cpp"];
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var ___getTypeName = Module["___getTypeName"] = asm["___getTypeName"];
var __GLOBAL__sub_I_wrapjs_cpp = Module["__GLOBAL__sub_I_wrapjs_cpp"] = asm["__GLOBAL__sub_I_wrapjs_cpp"];
var _emscripten_replace_memory = Module["_emscripten_replace_memory"] = asm["_emscripten_replace_memory"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_iiiddi = Module["dynCall_iiiddi"] = asm["dynCall_iiiddi"];
var dynCall_vd = Module["dynCall_vd"] = asm["dynCall_vd"];
var dynCall_vid = Module["dynCall_vid"] = asm["dynCall_vid"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_iiidd = Module["dynCall_iiidd"] = asm["dynCall_iiidd"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iiiddd = Module["dynCall_iiiddd"] = asm["dynCall_iiiddd"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iidd = Module["dynCall_iidd"] = asm["dynCall_iidd"];
var dynCall_iiiiii = Module["dynCall_iiiiii"] = asm["dynCall_iiiiii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iiid = Module["dynCall_iiid"] = asm["dynCall_iiid"];
var dynCall_iid = Module["dynCall_iid"] = asm["dynCall_iid"];
var dynCall_iiddd = Module["dynCall_iiddd"] = asm["dynCall_iiddd"];
var dynCall_iiddi = Module["dynCall_iiddi"] = asm["dynCall_iiddi"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_iiiiddiddi = Module["dynCall_iiiiddiddi"] = asm["dynCall_iiiiddiddi"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_iiiddiddi = Module["dynCall_iiiddiddi"] = asm["dynCall_iiiddiddi"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// TODO: strip out parts of this we do not need

//======= begin closure i64 code =======

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

var i64Math = (function() { // Emscripten wrapper
  var goog = { math: {} };


  /**
   * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
   * values as *signed* integers.  See the from* functions below for more
   * convenient ways of constructing Longs.
   *
   * The internal representation of a long is the two given signed, 32-bit values.
   * We use 32-bit pieces because these are the size of integers on which
   * Javascript performs bit-operations.  For operations like addition and
   * multiplication, we split each number into 16-bit pieces, which can easily be
   * multiplied within Javascript's floating-point representation without overflow
   * or change in sign.
   *
   * In the algorithms below, we frequently reduce the negative case to the
   * positive case by negating the input(s) and then post-processing the result.
   * Note that we must ALWAYS check specially whether those values are MIN_VALUE
   * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
   * a positive number, it overflows back into a negative).  Not handling this
   * case would often result in infinite recursion.
   *
   * @param {number} low  The low (signed) 32 bits of the long.
   * @param {number} high  The high (signed) 32 bits of the long.
   * @constructor
   */
  goog.math.Long = function(low, high) {
    /**
     * @type {number}
     * @private
     */
    this.low_ = low | 0;  // force into 32 signed bits.

    /**
     * @type {number}
     * @private
     */
    this.high_ = high | 0;  // force into 32 signed bits.
  };


  // NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
  // from* methods on which they depend.


  /**
   * A cache of the Long representations of small integer values.
   * @type {!Object}
   * @private
   */
  goog.math.Long.IntCache_ = {};


  /**
   * Returns a Long representing the given (32-bit) integer value.
   * @param {number} value The 32-bit integer in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
      var cachedObj = goog.math.Long.IntCache_[value];
      if (cachedObj) {
        return cachedObj;
      }
    }

    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
      goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
  };


  /**
   * Returns a Long representing the given value, provided that it is a finite
   * number.  Otherwise, zero is returned.
   * @param {number} value The number in question.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
      return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
      return goog.math.Long.fromNumber(-value).negate();
    } else {
      return new goog.math.Long(
          (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
          (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
    }
  };


  /**
   * Returns a Long representing the 64-bit integer that comes by concatenating
   * the given high and low bits.  Each is assumed to use 32 bits.
   * @param {number} lowBits The low 32-bits.
   * @param {number} highBits The high 32-bits.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
  };


  /**
   * Returns a Long representation of the given string, written using the given
   * radix.
   * @param {string} str The textual representation of the Long.
   * @param {number=} opt_radix The radix in which the text is written.
   * @return {!goog.math.Long} The corresponding Long value.
   */
  goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
      throw Error('number format error: empty string');
    }

    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (str.charAt(0) == '-') {
      return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf('-') >= 0) {
      throw Error('number format error: interior "-" character: ' + str);
    }

    // Do several (8) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
      var size = Math.min(8, str.length - i);
      var value = parseInt(str.substring(i, i + size), radix);
      if (size < 8) {
        var power = goog.math.Long.fromNumber(Math.pow(radix, size));
        result = result.multiply(power).add(goog.math.Long.fromNumber(value));
      } else {
        result = result.multiply(radixToPower);
        result = result.add(goog.math.Long.fromNumber(value));
      }
    }
    return result;
  };


  // NOTE: the compiler should inline these constant values below and then remove
  // these variables, so there should be no runtime penalty for these.


  /**
   * Number used repeated below in calculations.  This must appear before the
   * first call to any from* function below.
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_32_DBL_ =
      goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_31_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ / 2;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_48_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_64_DBL_ =
      goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


  /**
   * @type {number}
   * @private
   */
  goog.math.Long.TWO_PWR_63_DBL_ =
      goog.math.Long.TWO_PWR_64_DBL_ / 2;


  /** @type {!goog.math.Long} */
  goog.math.Long.ZERO = goog.math.Long.fromInt(0);


  /** @type {!goog.math.Long} */
  goog.math.Long.ONE = goog.math.Long.fromInt(1);


  /** @type {!goog.math.Long} */
  goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


  /** @type {!goog.math.Long} */
  goog.math.Long.MAX_VALUE =
      goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


  /** @type {!goog.math.Long} */
  goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


  /**
   * @type {!goog.math.Long}
   * @private
   */
  goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


  /** @return {number} The value, assuming it is a 32-bit integer. */
  goog.math.Long.prototype.toInt = function() {
    return this.low_;
  };


  /** @return {number} The closest floating-point representation to this value. */
  goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
           this.getLowBitsUnsigned();
  };


  /**
   * @param {number=} opt_radix The radix in which the text should be written.
   * @return {string} The textual representation of this value.
   */
  goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
      throw Error('radix out of range: ' + radix);
    }

    if (this.isZero()) {
      return '0';
    }

    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        // We need to change the Long value before it can be negated, so we remove
        // the bottom-most digit in this base and then recurse to do the rest.
        var radixLong = goog.math.Long.fromNumber(radix);
        var div = this.div(radixLong);
        var rem = div.multiply(radixLong).subtract(this);
        return div.toString(radix) + rem.toInt().toString(radix);
      } else {
        return '-' + this.negate().toString(radix);
      }
    }

    // Do several (6) digits each time through the loop, so as to
    // minimize the calls to the very expensive emulated div.
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

    var rem = this;
    var result = '';
    while (true) {
      var remDiv = rem.div(radixToPower);
      var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
      var digits = intval.toString(radix);

      rem = remDiv;
      if (rem.isZero()) {
        return digits + result;
      } else {
        while (digits.length < 6) {
          digits = '0' + digits;
        }
        result = '' + digits + result;
      }
    }
  };


  /** @return {number} The high 32-bits as a signed value. */
  goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
  };


  /** @return {number} The low 32-bits as a signed value. */
  goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
  };


  /** @return {number} The low 32-bits as an unsigned value. */
  goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return (this.low_ >= 0) ?
        this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
  };


  /**
   * @return {number} Returns the number of bits needed to represent the absolute
   *     value of this Long.
   */
  goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
      if (this.equals(goog.math.Long.MIN_VALUE)) {
        return 64;
      } else {
        return this.negate().getNumBitsAbs();
      }
    } else {
      var val = this.high_ != 0 ? this.high_ : this.low_;
      for (var bit = 31; bit > 0; bit--) {
        if ((val & (1 << bit)) != 0) {
          break;
        }
      }
      return this.high_ != 0 ? bit + 33 : bit + 1;
    }
  };


  /** @return {boolean} Whether this value is zero. */
  goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
  };


  /** @return {boolean} Whether this value is negative. */
  goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
  };


  /** @return {boolean} Whether this value is odd. */
  goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long equals the other.
   */
  goog.math.Long.prototype.equals = function(other) {
    return (this.high_ == other.high_) && (this.low_ == other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long does not equal the other.
   */
  goog.math.Long.prototype.notEquals = function(other) {
    return (this.high_ != other.high_) || (this.low_ != other.low_);
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than the other.
   */
  goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is less than or equal to the other.
   */
  goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than the other.
   */
  goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
  };


  /**
   * @param {goog.math.Long} other Long to compare against.
   * @return {boolean} Whether this Long is greater than or equal to the other.
   */
  goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
  };


  /**
   * Compares this Long with the given one.
   * @param {goog.math.Long} other Long to compare against.
   * @return {number} 0 if they are the same, 1 if the this is greater, and -1
   *     if the given one is greater.
   */
  goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
      return 0;
    }

    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
      return -1;
    }
    if (!thisNeg && otherNeg) {
      return 1;
    }

    // at this point, the signs are the same, so subtraction will not overflow
    if (this.subtract(other).isNegative()) {
      return -1;
    } else {
      return 1;
    }
  };


  /** @return {!goog.math.Long} The negation of this value. */
  goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.MIN_VALUE;
    } else {
      return this.not().add(goog.math.Long.ONE);
    }
  };


  /**
   * Returns the sum of this and the given Long.
   * @param {goog.math.Long} other Long to add to this one.
   * @return {!goog.math.Long} The sum of this and the given Long.
   */
  goog.math.Long.prototype.add = function(other) {
    // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 + b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns the difference of this and the given Long.
   * @param {goog.math.Long} other Long to subtract from this.
   * @return {!goog.math.Long} The difference of this and the given Long.
   */
  goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
  };


  /**
   * Returns the product of this and the given long.
   * @param {goog.math.Long} other Long to multiply with this.
   * @return {!goog.math.Long} The product of this and the other.
   */
  goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
      return goog.math.Long.ZERO;
    } else if (other.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().multiply(other.negate());
      } else {
        return this.negate().multiply(other).negate();
      }
    } else if (other.isNegative()) {
      return this.multiply(other.negate()).negate();
    }

    // If both longs are small, use float multiplication
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
        other.lessThan(goog.math.Long.TWO_PWR_24_)) {
      return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }

    // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
    // We can skip products that would overflow.

    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 0xFFFF;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 0xFFFF;

    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 0xFFFF;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 0xFFFF;

    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 0xFFFF;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 0xFFFF;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 0xFFFF;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 0xFFFF;
    return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
  };


  /**
   * Returns this Long divided by the given one.
   * @param {goog.math.Long} other Long by which to divide.
   * @return {!goog.math.Long} This Long divided by the given one.
   */
  goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
      throw Error('division by zero');
    } else if (this.isZero()) {
      return goog.math.Long.ZERO;
    }

    if (this.equals(goog.math.Long.MIN_VALUE)) {
      if (other.equals(goog.math.Long.ONE) ||
          other.equals(goog.math.Long.NEG_ONE)) {
        return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
      } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ONE;
      } else {
        // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
        var halfThis = this.shiftRight(1);
        var approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) {
          return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        } else {
          var rem = this.subtract(other.multiply(approx));
          var result = approx.add(rem.div(other));
          return result;
        }
      }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ZERO;
    }

    if (this.isNegative()) {
      if (other.isNegative()) {
        return this.negate().div(other.negate());
      } else {
        return this.negate().div(other).negate();
      }
    } else if (other.isNegative()) {
      return this.div(other.negate()).negate();
    }

    // Repeat the following until the remainder is less than other:  find a
    // floating-point that approximates remainder / other *from below*, add this
    // into the result, and subtract it from the remainder.  It is critical that
    // the approximate value is less than or equal to the real value so that the
    // remainder never becomes negative.
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
      // Approximate the result of division. This may be a little greater or
      // smaller than the actual value.
      var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

      // We will tweak the approximate result by changing it in the 48-th digit or
      // the smallest non-fractional digit, whichever is larger.
      var log2 = Math.ceil(Math.log(approx) / Math.LN2);
      var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

      // Decrease the approximation until it is smaller than the remainder.  Note
      // that if it is too large, the product overflows and is negative.
      var approxRes = goog.math.Long.fromNumber(approx);
      var approxRem = approxRes.multiply(other);
      while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
        approx -= delta;
        approxRes = goog.math.Long.fromNumber(approx);
        approxRem = approxRes.multiply(other);
      }

      // We know the answer can't be zero... and actually, zero would cause
      // infinite recursion since we would make no progress.
      if (approxRes.isZero()) {
        approxRes = goog.math.Long.ONE;
      }

      res = res.add(approxRes);
      rem = rem.subtract(approxRem);
    }
    return res;
  };


  /**
   * Returns this Long modulo the given one.
   * @param {goog.math.Long} other Long by which to mod.
   * @return {!goog.math.Long} This Long modulo the given one.
   */
  goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
  };


  /** @return {!goog.math.Long} The bitwise-NOT of this value. */
  goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
  };


  /**
   * Returns the bitwise-AND of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to AND.
   * @return {!goog.math.Long} The bitwise-AND of this and the other.
   */
  goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_,
                                   this.high_ & other.high_);
  };


  /**
   * Returns the bitwise-OR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to OR.
   * @return {!goog.math.Long} The bitwise-OR of this and the other.
   */
  goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_,
                                   this.high_ | other.high_);
  };


  /**
   * Returns the bitwise-XOR of this Long and the given one.
   * @param {goog.math.Long} other The Long with which to XOR.
   * @return {!goog.math.Long} The bitwise-XOR of this and the other.
   */
  goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                   this.high_ ^ other.high_);
  };


  /**
   * Returns this Long with bits shifted to the left by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the left by the given amount.
   */
  goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var low = this.low_;
      if (numBits < 32) {
        var high = this.high_;
        return goog.math.Long.fromBits(
            low << numBits,
            (high << numBits) | (low >>> (32 - numBits)));
      } else {
        return goog.math.Long.fromBits(0, low << (numBits - 32));
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount.
   */
  goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >> numBits);
      } else {
        return goog.math.Long.fromBits(
            high >> (numBits - 32),
            high >= 0 ? 0 : -1);
      }
    }
  };


  /**
   * Returns this Long with bits shifted to the right by the given amount, with
   * the new top bits matching the current sign bit.
   * @param {number} numBits The number of bits by which to shift.
   * @return {!goog.math.Long} This shifted to the right by the given amount, with
   *     zeros placed into the new leading bits.
   */
  goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
      return this;
    } else {
      var high = this.high_;
      if (numBits < 32) {
        var low = this.low_;
        return goog.math.Long.fromBits(
            (low >>> numBits) | (high << (32 - numBits)),
            high >>> numBits);
      } else if (numBits == 32) {
        return goog.math.Long.fromBits(high, 0);
      } else {
        return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
      }
    }
  };

  //======= begin jsbn =======

  var navigator = { appName: 'Modern Browser' }; // polyfill a little

  // Copyright (c) 2005  Tom Wu
  // All Rights Reserved.
  // http://www-cs-students.stanford.edu/~tjw/jsbn/

  /*
   * Copyright (c) 2003-2005  Tom Wu
   * All Rights Reserved.
   *
   * Permission is hereby granted, free of charge, to any person obtaining
   * a copy of this software and associated documentation files (the
   * "Software"), to deal in the Software without restriction, including
   * without limitation the rights to use, copy, modify, merge, publish,
   * distribute, sublicense, and/or sell copies of the Software, and to
   * permit persons to whom the Software is furnished to do so, subject to
   * the following conditions:
   *
   * The above copyright notice and this permission notice shall be
   * included in all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
   * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
   * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
   *
   * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
   * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
   * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
   * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
   * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * In addition, the following condition applies:
   *
   * All redistributions must retain an intact copy of this copyright notice
   * and disclaimer.
   */

  // Basic JavaScript BN library - subset useful for RSA encryption.

  // Bits per digit
  var dbits;

  // JavaScript engine analysis
  var canary = 0xdeadbeefcafe;
  var j_lm = ((canary&0xffffff)==0xefcafe);

  // (public) Constructor
  function BigInteger(a,b,c) {
    if(a != null)
      if("number" == typeof a) this.fromNumber(a,b,c);
      else if(b == null && "string" != typeof a) this.fromString(a,256);
      else this.fromString(a,b);
  }

  // return new, unset BigInteger
  function nbi() { return new BigInteger(null); }

  // am: Compute w_j += (x*this_i), propagate carries,
  // c is initial carry, returns final carry.
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue
  // We need to select the fastest one that works in this environment.

  // am1: use a single mult and divide to get the high bits,
  // max digit bits should be 26 because
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)
  function am1(i,x,w,j,c,n) {
    while(--n >= 0) {
      var v = x*this[i++]+w[j]+c;
      c = Math.floor(v/0x4000000);
      w[j++] = v&0x3ffffff;
    }
    return c;
  }
  // am2 avoids a big mult-and-extract completely.
  // Max digit bits should be <= 30 because we do bitwise ops
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
  function am2(i,x,w,j,c,n) {
    var xl = x&0x7fff, xh = x>>15;
    while(--n >= 0) {
      var l = this[i]&0x7fff;
      var h = this[i++]>>15;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
      c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
      w[j++] = l&0x3fffffff;
    }
    return c;
  }
  // Alternately, set max digit bits to 28 since some
  // browsers slow down when dealing with 32-bit numbers.
  function am3(i,x,w,j,c,n) {
    var xl = x&0x3fff, xh = x>>14;
    while(--n >= 0) {
      var l = this[i]&0x3fff;
      var h = this[i++]>>14;
      var m = xh*l+h*xl;
      l = xl*l+((m&0x3fff)<<14)+w[j]+c;
      c = (l>>28)+(m>>14)+xh*h;
      w[j++] = l&0xfffffff;
    }
    return c;
  }
  if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
    BigInteger.prototype.am = am2;
    dbits = 30;
  }
  else if(j_lm && (navigator.appName != "Netscape")) {
    BigInteger.prototype.am = am1;
    dbits = 26;
  }
  else { // Mozilla/Netscape seems to prefer am3
    BigInteger.prototype.am = am3;
    dbits = 28;
  }

  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = ((1<<dbits)-1);
  BigInteger.prototype.DV = (1<<dbits);

  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2,BI_FP);
  BigInteger.prototype.F1 = BI_FP-dbits;
  BigInteger.prototype.F2 = 2*dbits-BI_FP;

  // Digit conversions
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr,vv;
  rr = "0".charCodeAt(0);
  for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

  function int2char(n) { return BI_RM.charAt(n); }
  function intAt(s,i) {
    var c = BI_RC[s.charCodeAt(i)];
    return (c==null)?-1:c;
  }

  // (protected) copy this to r
  function bnpCopyTo(r) {
    for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }

  // (protected) set from integer value x, -DV <= x < DV
  function bnpFromInt(x) {
    this.t = 1;
    this.s = (x<0)?-1:0;
    if(x > 0) this[0] = x;
    else if(x < -1) this[0] = x+DV;
    else this.t = 0;
  }

  // return bigint initialized to value
  function nbv(i) { var r = nbi(); r.fromInt(i); return r; }

  // (protected) set from string and radix
  function bnpFromString(s,b) {
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 256) k = 8; // byte array
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else { this.fromRadix(s,b); return; }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while(--i >= 0) {
      var x = (k==8)?s[i]&0xff:intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if(sh == 0)
        this[this.t++] = x;
      else if(sh+k > this.DB) {
        this[this.t-1] |= (x&((1<<(this.DB-sh))-1))<<sh;
        this[this.t++] = (x>>(this.DB-sh));
      }
      else
        this[this.t-1] |= x<<sh;
      sh += k;
      if(sh >= this.DB) sh -= this.DB;
    }
    if(k == 8 && (s[0]&0x80) != 0) {
      this.s = -1;
      if(sh > 0) this[this.t-1] |= ((1<<(this.DB-sh))-1)<<sh;
    }
    this.clamp();
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) clamp off excess high words
  function bnpClamp() {
    var c = this.s&this.DM;
    while(this.t > 0 && this[this.t-1] == c) --this.t;
  }

  // (public) return string representation in given radix
  function bnToString(b) {
    if(this.s < 0) return "-"+this.negate().toString(b);
    var k;
    if(b == 16) k = 4;
    else if(b == 8) k = 3;
    else if(b == 2) k = 1;
    else if(b == 32) k = 5;
    else if(b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1<<k)-1, d, m = false, r = "", i = this.t;
    var p = this.DB-(i*this.DB)%k;
    if(i-- > 0) {
      if(p < this.DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
      while(i >= 0) {
        if(p < k) {
          d = (this[i]&((1<<p)-1))<<(k-p);
          d |= this[--i]>>(p+=this.DB-k);
        }
        else {
          d = (this[i]>>(p-=k))&km;
          if(p <= 0) { p += this.DB; --i; }
        }
        if(d > 0) m = true;
        if(m) r += int2char(d);
      }
    }
    return m?r:"0";
  }

  // (public) -this
  function bnNegate() { var r = nbi(); BigInteger.ZERO.subTo(this,r); return r; }

  // (public) |this|
  function bnAbs() { return (this.s<0)?this.negate():this; }

  // (public) return + if this > a, - if this < a, 0 if equal
  function bnCompareTo(a) {
    var r = this.s-a.s;
    if(r != 0) return r;
    var i = this.t;
    r = i-a.t;
    if(r != 0) return (this.s<0)?-r:r;
    while(--i >= 0) if((r=this[i]-a[i]) != 0) return r;
    return 0;
  }

  // returns bit length of the integer x
  function nbits(x) {
    var r = 1, t;
    if((t=x>>>16) != 0) { x = t; r += 16; }
    if((t=x>>8) != 0) { x = t; r += 8; }
    if((t=x>>4) != 0) { x = t; r += 4; }
    if((t=x>>2) != 0) { x = t; r += 2; }
    if((t=x>>1) != 0) { x = t; r += 1; }
    return r;
  }

  // (public) return the number of bits in "this"
  function bnBitLength() {
    if(this.t <= 0) return 0;
    return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));
  }

  // (protected) r = this << n*DB
  function bnpDLShiftTo(n,r) {
    var i;
    for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
    for(i = n-1; i >= 0; --i) r[i] = 0;
    r.t = this.t+n;
    r.s = this.s;
  }

  // (protected) r = this >> n*DB
  function bnpDRShiftTo(n,r) {
    for(var i = n; i < this.t; ++i) r[i-n] = this[i];
    r.t = Math.max(this.t-n,0);
    r.s = this.s;
  }

  // (protected) r = this << n
  function bnpLShiftTo(n,r) {
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<cbs)-1;
    var ds = Math.floor(n/this.DB), c = (this.s<<bs)&this.DM, i;
    for(i = this.t-1; i >= 0; --i) {
      r[i+ds+1] = (this[i]>>cbs)|c;
      c = (this[i]&bm)<<bs;
    }
    for(i = ds-1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t+ds+1;
    r.s = this.s;
    r.clamp();
  }

  // (protected) r = this >> n
  function bnpRShiftTo(n,r) {
    r.s = this.s;
    var ds = Math.floor(n/this.DB);
    if(ds >= this.t) { r.t = 0; return; }
    var bs = n%this.DB;
    var cbs = this.DB-bs;
    var bm = (1<<bs)-1;
    r[0] = this[ds]>>bs;
    for(var i = ds+1; i < this.t; ++i) {
      r[i-ds-1] |= (this[i]&bm)<<cbs;
      r[i-ds] = this[i]>>bs;
    }
    if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
    r.t = this.t-ds;
    r.clamp();
  }

  // (protected) r = this - a
  function bnpSubTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]-a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c -= a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c -= a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = (c<0)?-1:0;
    if(c < -1) r[i++] = this.DV+c;
    else if(c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }

  // (protected) r = this * a, r != this,a (HAC 14.12)
  // "this" should be the larger one if appropriate.
  function bnpMultiplyTo(a,r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i+y.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
    r.s = 0;
    r.clamp();
    if(this.s != a.s) BigInteger.ZERO.subTo(r,r);
  }

  // (protected) r = this^2, r != this (HAC 14.16)
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2*x.t;
    while(--i >= 0) r[i] = 0;
    for(i = 0; i < x.t-1; ++i) {
      var c = x.am(i,x[i],r,2*i,0,1);
      if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x.DV) {
        r[i+x.t] -= x.DV;
        r[i+x.t+1] = 1;
      }
    }
    if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
    r.s = 0;
    r.clamp();
  }

  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
  // r != q, this != m.  q or r may be null.
  function bnpDivRemTo(m,q,r) {
    var pm = m.abs();
    if(pm.t <= 0) return;
    var pt = this.abs();
    if(pt.t < pm.t) {
      if(q != null) q.fromInt(0);
      if(r != null) this.copyTo(r);
      return;
    }
    if(r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB-nbits(pm[pm.t-1]);	// normalize modulus
    if(nsh > 0) { pm.lShiftTo(nsh,y); pt.lShiftTo(nsh,r); }
    else { pm.copyTo(y); pt.copyTo(r); }
    var ys = y.t;
    var y0 = y[ys-1];
    if(y0 == 0) return;
    var yt = y0*(1<<this.F1)+((ys>1)?y[ys-2]>>this.F2:0);
    var d1 = this.FV/yt, d2 = (1<<this.F1)/yt, e = 1<<this.F2;
    var i = r.t, j = i-ys, t = (q==null)?nbi():q;
    y.dlShiftTo(j,t);
    if(r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t,r);
    }
    BigInteger.ONE.dlShiftTo(ys,t);
    t.subTo(y,y);	// "negative" y so we can replace sub with am later
    while(y.t < ys) y[y.t++] = 0;
    while(--j >= 0) {
      // Estimate quotient digit
      var qd = (r[--i]==y0)?this.DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
      if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
        y.dlShiftTo(j,t);
        r.subTo(t,r);
        while(r[i] < --qd) r.subTo(t,r);
      }
    }
    if(q != null) {
      r.drShiftTo(ys,q);
      if(ts != ms) BigInteger.ZERO.subTo(q,q);
    }
    r.t = ys;
    r.clamp();
    if(nsh > 0) r.rShiftTo(nsh,r);	// Denormalize remainder
    if(ts < 0) BigInteger.ZERO.subTo(r,r);
  }

  // (public) this mod a
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a,null,r);
    if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r,r);
    return r;
  }

  // Modular reduction using "classic" algorithm
  function Classic(m) { this.m = m; }
  function cConvert(x) {
    if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) { return x; }
  function cReduce(x) { x.divRemTo(this.m,null,x); }
  function cMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }
  function cSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;

  // (protected) return "-1/this % 2^DB"; useful for Mont. reduction
  // justification:
  //         xy == 1 (mod m)
  //         xy =  1+km
  //   xy(2-xy) = (1+km)(1-km)
  // x[y(2-xy)] = 1-k^2m^2
  // x[y(2-xy)] == 1 (mod m^2)
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
  // JS multiply "overflows" differently from C/C++, so care is needed here.
  function bnpInvDigit() {
    if(this.t < 1) return 0;
    var x = this[0];
    if((x&1) == 0) return 0;
    var y = x&3;		// y == 1/x mod 2^2
    y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
    y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
    y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
    // last step - calculate inverse mod DV directly;
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
    y = (y*(2-x*y%this.DV))%this.DV;		// y == 1/x mod 2^dbits
    // we really want the negative inverse, and -DV < y < DV
    return (y>0)?this.DV-y:-y;
  }

  // Montgomery reduction
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp&0x7fff;
    this.mph = this.mp>>15;
    this.um = (1<<(m.DB-15))-1;
    this.mt2 = 2*m.t;
  }

  // xR mod m
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t,r);
    r.divRemTo(this.m,null,r);
    if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r,r);
    return r;
  }

  // x/R mod m
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }

  // x = x/R mod m (HAC 14.32)
  function montReduce(x) {
    while(x.t <= this.mt2)	// pad x so am has enough room later
      x[x.t++] = 0;
    for(var i = 0; i < this.m.t; ++i) {
      // faster way of calculating u0 = x[i]*mp mod DV
      var j = x[i]&0x7fff;
      var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x.DM;
      // use am to combine the multiply-shift-add into one call
      j = i+this.m.t;
      x[j] += this.m.am(0,u0,x,i,0,this.m.t);
      // propagate carry
      while(x[j] >= x.DV) { x[j] -= x.DV; x[++j]++; }
    }
    x.clamp();
    x.drShiftTo(this.m.t,x);
    if(x.compareTo(this.m) >= 0) x.subTo(this.m,x);
  }

  // r = "x^2/R mod m"; x != r
  function montSqrTo(x,r) { x.squareTo(r); this.reduce(r); }

  // r = "xy/R mod m"; x,y != r
  function montMulTo(x,y,r) { x.multiplyTo(y,r); this.reduce(r); }

  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;

  // (protected) true iff this is even
  function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

  // (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
  function bnpExp(e,z) {
    if(e > 0xffffffff || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
    g.copyTo(r);
    while(--i >= 0) {
      z.sqrTo(r,r2);
      if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
      else { var t = r; r = r2; r2 = t; }
    }
    return z.revert(r);
  }

  // (public) this^e % m, 0 <= e < 2^32
  function bnModPowInt(e,m) {
    var z;
    if(e < 256 || m.isEven()) z = new Classic(m); else z = new Montgomery(m);
    return this.exp(e,z);
  }

  // protected
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;

  // public
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;

  // "constants"
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);

  // jsbn2 stuff

  // (protected) convert from radix string
  function bnpFromRadix(s,b) {
    this.fromInt(0);
    if(b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
    for(var i = 0; i < s.length; ++i) {
      var x = intAt(s,i);
      if(x < 0) {
        if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b*w+x;
      if(++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w,0);
        j = 0;
        w = 0;
      }
    }
    if(j > 0) {
      this.dMultiply(Math.pow(b,j));
      this.dAddOffset(w,0);
    }
    if(mi) BigInteger.ZERO.subTo(this,this);
  }

  // (protected) return x s.t. r^x < DV
  function bnpChunkSize(r) { return Math.floor(Math.LN2*this.DB/Math.log(r)); }

  // (public) 0 if this == 0, 1 if this > 0
  function bnSigNum() {
    if(this.s < 0) return -1;
    else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
    else return 1;
  }

  // (protected) this *= n, this >= 0, 1 < n < DV
  function bnpDMultiply(n) {
    this[this.t] = this.am(0,n-1,this,0,0,this.t);
    ++this.t;
    this.clamp();
  }

  // (protected) this += n << w words, this >= 0
  function bnpDAddOffset(n,w) {
    if(n == 0) return;
    while(this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while(this[w] >= this.DV) {
      this[w] -= this.DV;
      if(++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }

  // (protected) convert to radix string
  function bnpToRadix(b) {
    if(b == null) b = 10;
    if(this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b,cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d,y,z);
    while(y.signum() > 0) {
      r = (a+z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d,y,z);
    }
    return z.intValue().toString(b) + r;
  }

  // (public) return value as integer
  function bnIntValue() {
    if(this.s < 0) {
      if(this.t == 1) return this[0]-this.DV;
      else if(this.t == 0) return -1;
    }
    else if(this.t == 1) return this[0];
    else if(this.t == 0) return 0;
    // assumes 16 < DB < 32
    return ((this[1]&((1<<(32-this.DB))-1))<<this.DB)|this[0];
  }

  // (protected) r = this + a
  function bnpAddTo(a,r) {
    var i = 0, c = 0, m = Math.min(a.t,this.t);
    while(i < m) {
      c += this[i]+a[i];
      r[i++] = c&this.DM;
      c >>= this.DB;
    }
    if(a.t < this.t) {
      c += a.s;
      while(i < this.t) {
        c += this[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += this.s;
    }
    else {
      c += this.s;
      while(i < a.t) {
        c += a[i];
        r[i++] = c&this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = (c<0)?-1:0;
    if(c > 0) r[i++] = c;
    else if(c < -1) r[i++] = this.DV+c;
    r.t = i;
    r.clamp();
  }

  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.addTo = bnpAddTo;

  //======= end jsbn =======

  // Emscripten wrapper
  var Wrapper = {
    abs: function(l, h) {
      var x = new goog.math.Long(l, h);
      var ret;
      if (x.isNegative()) {
        ret = x.negate();
      } else {
        ret = x;
      }
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
    },
    ensureTemps: function() {
      if (Wrapper.ensuredTemps) return;
      Wrapper.ensuredTemps = true;
      Wrapper.two32 = new BigInteger();
      Wrapper.two32.fromString('4294967296', 10);
      Wrapper.two64 = new BigInteger();
      Wrapper.two64.fromString('18446744073709551616', 10);
      Wrapper.temp1 = new BigInteger();
      Wrapper.temp2 = new BigInteger();
    },
    lh2bignum: function(l, h) {
      var a = new BigInteger();
      a.fromString(h.toString(), 10);
      var b = new BigInteger();
      a.multiplyTo(Wrapper.two32, b);
      var c = new BigInteger();
      c.fromString(l.toString(), 10);
      var d = new BigInteger();
      c.addTo(b, d);
      return d;
    },
    stringify: function(l, h, unsigned) {
      var ret = new goog.math.Long(l, h).toString();
      if (unsigned && ret[0] == '-') {
        // unsign slowly using jsbn bignums
        Wrapper.ensureTemps();
        var bignum = new BigInteger();
        bignum.fromString(ret, 10);
        ret = new BigInteger();
        Wrapper.two64.addTo(bignum, ret);
        ret = ret.toString(10);
      }
      return ret;
    },
    fromString: function(str, base, min, max, unsigned) {
      Wrapper.ensureTemps();
      var bignum = new BigInteger();
      bignum.fromString(str, base);
      var bigmin = new BigInteger();
      bigmin.fromString(min, 10);
      var bigmax = new BigInteger();
      bigmax.fromString(max, 10);
      if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
        var temp = new BigInteger();
        bignum.addTo(Wrapper.two64, temp);
        bignum = temp;
      }
      var error = false;
      if (bignum.compareTo(bigmin) < 0) {
        bignum = bigmin;
        error = true;
      } else if (bignum.compareTo(bigmax) > 0) {
        bignum = bigmax;
        error = true;
      }
      var ret = goog.math.Long.fromString(bignum.toString()); // min-max checks should have clamped this to a range goog.math.Long can handle well
      HEAP32[tempDoublePtr>>2] = ret.low_;
      HEAP32[tempDoublePtr+4>>2] = ret.high_;
      if (error) throw 'range error';
    }
  };
  return Wrapper;
})();

//======= end closure i64 code =======



// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    var applyMemoryInitializer = function(data) {
      if (data.byteLength) data = new Uint8Array(data);
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }
    var request = Module['memoryInitializerRequest'];
    if (request) {
      // a network request has already been created, just use that
      if (request.response) {
        setTimeout(function() {
          applyMemoryInitializer(request.response);
        }, 0); // it's already here; but, apply it asynchronously
      } else {
        request.addEventListener('load', function() { // wait for it
          if (request.status !== 200 && request.status !== 0) {
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest, status: ' + request.status);
          }
          if (!request.response || typeof request.response !== 'object' || !request.response.byteLength) {
            console.warn('a problem seems to have happened with Module.memoryInitializerRequest response (expected ArrayBuffer): ' + request.response);
          }
          applyMemoryInitializer(request.response);
        });
      }
    } else {
      // fetch it from the network ourselves
      Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, function() {
        throw 'could not load memory initializer ' + memoryInitializer;
      });
    }
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') implicitly called by end of main(), but noExitRuntime, so not exiting the runtime (you can use emscripten_force_exit, if you want to force a true shutdown)');
    return;
  }

  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)');
  } else {
    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}




  return Module;
};

# 模块加载原理

为了说明在 bundle.js 中是如何实现最基本的模块的，我们这里以一个最简单的例子为例。首先我们在目录 src 下新建两个文件，分别是 main.js 和 show.js。show.js 的内容如下：

```js
function show (content) {
    window.document.getElementById('app').innerText = 'Hello, ' + content
}

module.exports = show
```

在 main.js 中首先会引入 show.js 模块，然后调用 show 模块，如下：

```js
const show = require('./show.js')

show('webpack')
```

接下来我们在 config 文件夹下新建一个名为 webpack_bundle.js 的 webpack 配置文件，并将入口文件指向这个 main.js 文件，如下：

```js
const path = require('path')

module.exports = {
    mode: 'development',
    entry: './src/main.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, '../dist')
    }
}
```

然后我们在 package.json 中新增一条命令，如下：

```json
{
  // ...
  "scripts": {
    "bundle": "webpack --config ./config/webpack_bundle.js",
  }
}
```

这里特别说明下，之所以新建一个配置文件，并且新增加一条命令，是为了不污染原先的配置文件，仅是为了分析打包文件而存在的，所以 bundle 这条命令并没有特殊含义。

在做完了上述基本配置以后，接下来我们就可以实际运行 ```npm run bundle``` 这条命令来打包了，如下：

![bundle.js](./img/2/5.jpg)

现在我们用浏览器打开包含这个 bundle.js 的 html 文件，如下：

![index](./img/2/6.jpg)

我们可以看到浏览器是可以正确渲染，并且输出的正是我们在 main.js 中调用的 ```show('webpack')``` 的结果。接下来我们打开 bundle.js 文件，具体看下实现原理。为了后续分析方便，对于无关代码，都直接用 "//..." 方式来代替了。

首先我们来看下打包出来的 bundle.js 的整体结构，如下：

```js
(function(modules) { // webpackBootstrap
    // The module cache
    var installedModules = {};
    // The require function
    function __webpack_require__(moduleId) {
        // ...
    }
    // ...
    // Load entry module and return exports
    return __webpack_require__(__webpack_require__.s = "./src/main.js");
})({
        "./src/main.js": function(module, exports, __webpack_require__) {
            // ...
        },
        "./src/show.js": function(module, exports) {
            // ...
        }
    });
```

上述是一个非常简单的自执行函数。所以 bundle.js 能够在被包含进 html 的时候就能自动执行。同时，我们看这个函数的参数是一个对象，对象里面的属性名是由模块文件的路径组成，而属性值则是对应的函数。接着这个参数就被传递到最上面的匿名函数中，作为 modules 传入。

接着我们看匿名函数，在匿名函数中首先声明了一个 installedModules 变量，这个变量中保存着已经导入的模块，这样可以避免后续的重复导入。接着就声明了核心函数 ```__webpack_require__(moduleId)```，这个函数就是 webpack 自己实现的模块导入函数。继续往下看，在函数运行的最后，发现会调用之前定义的 ```__webpack_require__``` 函数，同时将入口文件路径也就是 './src/main.js' 作为参数导入到模块调用函数中。这也是为什么 webpack 配置中一定要提供一个入口文件的原因。

在分析了上述 bundle.js 的基本流程以后，接下来我们重点看下 ```__webpack_require__(moduleId)``` 的内容，如下：

```js
function __webpack_require__(moduleId) {
    // Check if module is in cache
    if(installedModules[moduleId]) {
        return installedModules[moduleId].exports;
    }
    // Create a new module (and put it into the cache)
    var module = installedModules[moduleId] = {
        i: moduleId,
        l: false,
        exports: {}
    };

    // Execute the module function
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

    // Flag the module as loaded
    module.l = true;

    // Return the exports of the module
    return module.exports;
}
```

这个函数就是 webpack 中实现模块导入的函数，该函数接收一个 moduleId 作为参数，而 moduleId 就是模块对应的文件路径，在 webpack 中每个独立的文件都是一个模块，由于文件路径不同，所以 moduleId 也肯定不同。在函数中，首先会从 installedModules 中判断当前模块是否已经导入了，避免重复导入模块。接着就新建一个 module 对象来代表当前导入的模块，并存入 installedModules 中。这里需要注意的是在每次运行这个函数的时候，module 都是一个新建的对象，以此来确保不同模块之间不会相互干扰。

这个 module 对象中有三个属性，i 代表模块 ID，l 则表示模块是否导入了，exports 中则保存了模块的导出信息，比如模块的导出函数，导出变量等。

在声明完 module 变量以后，就运行 modules 中的对应函数了。这个 modules 变量就是最外层函数传入的参数。这个我们后面再看。调用完以后就将 module.l 属性置为 true，然后再返回 module.exports 的内容即可。

上述就是模块导入的完整过程了，比较重要的就是在每次新导入一个模块的时候，都会新建一个 module 变量，并将这个 module 对象传入 ```modules[moduleId].call()``` 函数中。

接着我们继续看 ```modules[moduleId].call()``` 这个函数。它就是我们一开始传入的参数，如下：

```js
(function (modules) {
    // ...
})
({
    "./src/main.js": (function(module, exports, __webpack_require__) {
        eval("const show = __webpack_require__(/*! ./show.js */ \"./src/show.js\")\n\nshow('webpack')\n\n\n//# sourceURL=webpack:///./src/main.js?");
    }),
    "./src/show.js": (function(module, exports) {
        eval("function show (content) {\n    window.document.getElementById('app').innerText = 'Hello, ' + content\n}\n\nmodule.exports = show\n\n\n//# sourceURL=webpack:///./src/show.js?");
    })
});
```

我们可以看到参数中是以模块路径作为属性名，对应的 function 作为属性值，而 function 内部就是我们模块的源码的字符串格式，并通过 eval 来进行执行。这里的 eval 是 js 的语法，它的作用就是能将其中的字符串当作实际的 js 代码来执行，相当于一个 js 解释器。

我们可以看入口模块的函数，在源码中，我们是用 ```const show = require('./show')``` 的方式进行导入的，而在构建文件中，将这个导入方式替换成了 webpack 实现的模块导入函数 ```__webpack_require__('./src/show.js')```。而这个函数的作用我们上面已经分析过了，它的主要原理就是对每个模块都声明一个 module 变量，然后运行 modules 中这个模块所对应的函数，这里面因为是导入 'show.js' 模块，所以就运行参数的第二个函数，并且会将 module 对象当作参数传入这个函数中，所以在函数中通过 ```module.exports = show```，就能正确的将 show 模块中的方法导出到 main 模块中，并进行使用。(在源码文件中，show.js 是通过 module.exports 来进行导出的，这个是 CommonJS 的规范，所以这里本质上就是 webpack 重新声明了一个对象 module，并且这个对象中有一个 exports 属性，这样就能根据原先的 CommonJS 规范，正确的获取到每个模块导出的接口了)。

## 异步加载原理

在了解了 webpack 基本的模块导入规则后，接下来我们看下 webpack 是如何实现异步导入模块的。异步导入模块有利于提升首页加载速度，因为首页内容一般都比较少，所以没必要加载很多无关模块，只有当用户具体点击的时候在进行导入，这样能大大减小首页文件大小，从而提高加载速度。

同样的，我们先修改以下入口文件 main.js 的代码，如下：

```js
import('./show').then(show => {
    show('webpack')
})
```

如上所示，采用 webpack 中提供的 import 函数即可实现异步导入。我们直接进行打包，这时候我们可以看到有两个打包文件了，如下：

![async](./img/2/7.jpg)

我们看下 0.bundle.js 这个文件的内容，如下：

```js
(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[0],{
"./src/show.js": (function(module, exports) {
    eval("function show (content) {\r\n    window.document.getElementById('app').innerText = 'Hello, ' + content\r\n}\r\n\r\nmodule.exports = show\r\n\n\n//# sourceURL=webpack:///./src/show.js?");
})
}]);
```

我们从这个文件中可以看出 webpack 是将异步导入的模块 show.js 单独打包出一个文件 (这里是 *0.bundle.js* 文件)，这样在进行首屏渲染的时候浏览器只会下载主要的 bundle.js 文件，其他的单独打包出来的 bundle.js 文件（这里指 0.bundle.js）并不会被下载。这是因为在 index.html 中只会包含一个 bundle.js 文件，所以这也就实现了减少首屏文件加载的大小，并后续进行异步加载其他文件的功能。

我们先看下 bundle 文件的内容，如下：

```js
(function(modules) { // webpackBootstrap
    // install a JSONP callback for chunk loading
    function webpackJsonpCallback(data) {
        // ...
    }

    var installedModules = {};

    // script path function
    function jsonpScriptSrc(chunkId) {
        // ...
    }

    // The require function
    function __webpack_require__(moduleId) {
        // ...
    }

    // This file contains only the entry chunk.
    // The chunk loading function for additional chunks
    __webpack_require__.e = function requireEnsure(chunkId) {
        // ...
    }
    // ...
    var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
    var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
    jsonpArray.push = webpackJsonpCallback;

    // Load entry module and return exports
    return __webpack_require__(__webpack_require__.s = "./src/main.js");
})
({
    "./src/main.js": (function(module, exports, __webpack_require__) {
        eval("__webpack_require__.e(/*! import() */ 0).then(__webpack_require__.t.bind(null, /*! ./show */ \"./src/show.js\", 7)).then(show => {\r\n    show('webpack')\r\n})\r\n\n\n//# sourceURL=webpack:///./src/main.js?");
    })
});
```

我们可以看到这个文件的主框架其实并没有改变，同样是一个匿名的自执行函数，并且它的参数 modules 就是一个包含模块路径以及模块源码函数的对象，只不过这里只有一个模块 main.js 了，也就是我们的入口文件。

接着我们看下自执行函数内部，这里省略了一些无关代码。我们可以看到在函数内部多了两个新的函数 ```webpackJsonpCallback``` 以及 ```jsonpScriptSrc```，这两个函数就是实现异步加载的关键。我们稍后详细解析。程序接着又会声明模块调用函数 ```__webpack_require__```，这个函数和原先的并无区别，这里就不展开讲解了。

接着程序会声明一个全局变量 **webpackJsonp**, 它是一个空数组，同时程序又重写了这个数组的 push 方法，将其变成了 ```webpackJsonpCallback``` 函数。

程序最后就调用函数 ```__webpack_require__```，并将入口文件 './src/main.js' 作为参数开始运行。

我们知道在 ```__webpack_require__``` 函数内部会调用模块函数的，所以程序会进入模块函数内部，如下：

```js
"./src/main.js": (function(module, exports, __webpack_require__) {
    eval("__webpack_require__.e(/*! import() */ 0).then(__webpack_require__.t.bind(null, /*! ./show */ \"./src/show.js\", 7)).then(show => {\r\n    show('webpack')\r\n})\r\n\n\n//# sourceURL=webpack:///./src/main.js?");
})
```

首先会执行 ```___webpack_require__.e(0)```, 这个函数在匿名函数中定义如下：

```js
__webpack_require__.e = function requireEnsure(chunkId) {
    var promises = [];
    // setup Promise in chunk cache
    var promise = new Promise(function(resolve, reject) {
        installedChunkData = installedChunks[chunkId] = [resolve, reject];
    });

    // start chunk loading
    var script = document.createElement('script');
    var onScriptComplete;

    script.charset = 'utf-8';
    script.src = jsonpScriptSrc(chunkId);
    onScriptComplete = function (event) {
        // ...
    };
    // ...
    document.head.appendChild(script);
    return Promise.all(promises);
}
```

上述内容中省略了一些次要逻辑。我们可以看到在这个函数中主要做了两件事，一是声明了一个 Promise 对象，然后就创建了一个 script 标签，并且 src 设置为 0.bundle.js，并且将这个 script 标签添加到了 index.html 的 \<head\> 标签中，这时候浏览器就开始异步下载 0.bundle.js 文件了。同时这个函数会将 promise 对象返回。

上述函数返回以后，这里需要注意，此时程序并不会继续往下运行下面的函数 ```.then(__webpack_require__t.bind(null, "./src/show.js"))```，这是因为上一个函数返回的是 promise 对象，所以在显示的调用 resolve 函数以前，该对象都处于 pending 状态，所以程序不会继续往下运行，转而运行其他代码。

还记得在函数 ```__webpack_require__``` 中声明了 script 标签来下载 0.bundle.js 文件嘛，当该文件下载完成后，会自动运行该文件内容，而我们之前在 0.bundle.js 中看到，它会直接调用 ```window["webpackJsonp"].push([[0], {"./src/show.js": function () {//...}}])```。

而上述的 push 方法在匿名函数中被重写了，如下：

```js
var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
jsonpArray.push = webpackJsonpCallback;
```

所以这时候程序就会调用 ```webpackJsonpCallback``` 函数，这个函数的定义在自执行匿名函数中，如下：

```js
function webpackJsonpCallback(data) {
    var chunkIds = data[0];
    var moreModules = data[1];
    // ...
    while(resolves.length) {
        resolves.shift()();
    }
};
```

相比你们应该也已经猜到了，在这个函数中会调用 ```___webpack_require__.e(0)``` 函数返回的 promise 对象的 resolve 方法，从而能使程序继续往下执行。这里顺便提一下为什么能获取到之前函数所返回的 promise 对象的 resolve 方法呢，这是通过变量 "installedChunks" 来实现的。

接着程序就会继续往下执行 ```.then(__webpack_require__t.bind(null, "./src/show.js"))``` 这个函数，我们看下函数 ```__webpack_require__t.bind```，内容如下：

```js
__webpack_require__.t = function(value, mode) {
    if(mode & 1) value = __webpack_require__(value);
    // ...
};
```

上述函数功能很简单，就是根据 mode 的不同值来执行不同方式的加载，这里程序会调用 ```__webpack_require__``` 这个我们已经很熟悉的模块调用函数来调用 "./src/show.js" 模块，并将其导出。

接着程序就运行下一个 then 方法了，也就是调用 show 方法。如下：

```js
.then(show => {\n    show('webpack')\n})\n\n\n//# sourceURL=webpack:///./src/main.js?");
```

至此整个的异步导入过程就分析完成了。这里做一个简单的**小结**：webpack 首先将异步导入的模块单独打包出来，然后开始执行主打包文件 bundle.js，在该匿名函数中通过新建一个 script 标签来异步下载单独打包出来的文件，当异步文件下载完成后，就调用 ```__webpack_require__``` 这个模块加载方法来加载下载完成的模块，最后就能使用该模块了。

我们给出完整的运行流程图来加深整个过程的理解，如下：

![async](./img/2/webpack异步加载原理.jpg)

## 参考资料

[webpack原理解读](https://juejin.im/entry/5c57e914e51d457f963d0c3b)

[webpack原理](https://juejin.im/entry/5b0e3eba5188251534379615)

[手写一个100行webpack](https://zhuanlan.zhihu.com/p/58151131)

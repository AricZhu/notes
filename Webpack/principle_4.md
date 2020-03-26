# webpack 的 debug 调试

本文中我们借助 debug 调试来详细分析 webpack 打包的整个流程

## compile 和 compilation

我们知道 webpack 从配置初始化到 build 完成经历了一个完整的生命周期，包括 run、compile、make、build、seal、emit 等等。而正是得益于上面 tapable 的订阅-发布架构，我们才能在自己编写的 plugin 中监听到这些钩子函数

而整个 webpack 的构建过程中最重要的两个对象 compiler 和 compilation 就是继承了 tapable 并且通过它来注册了生命周期中的每一个流程需要触发的事件。同时，webpack 内部也实现了一堆 plugin，这些内部的 plugin 是 webpack 打包构建过程中的功能实现，订阅感兴趣的事件，在执行的流程中调用不同的订阅函数就构成了 webpack 完整的生命周期。

下面给出 compiler 和 compilation 的官方说明：

在插件开发中最重要的两个资源就是 compiler 和 compilation 对象。理解它们的角色是扩展 webpack 引擎重要的第一步。

+ compiler 对象代表了完整的 webpack 环境配置。这个对象在启动 webpack 时被一次性建立，并配置好所有可操作的设置，包括 options，loader 和 plugin。当在 webpack 环境中应用一个插件时，插件将收到此 compiler 对象的引用。可以使用它来访问 webpack 的主环境。

+ compilation 对象代表了一次资源版本构建。当运行 webpack 开发环境中间件时，每当检测到一个文件变化，就会创建一个新的 compilation，从而生成一组新的编译资源。一个 compilation 对象表现了当前的模块资源、编译生成资源、变化的文件、以及被跟踪依赖的状态信息。compilation 对象也提供了很多关键时机的回调，以供插件做自定义处理时选择使用。

这两个组件是任何 webpack 插件不可或缺的部分（特别是 compilation），因此，开发者在阅读源码，并熟悉它们之后，会感到获益匪浅

+ [compiler](https://github.com/webpack/webpack/blob/master/lib/Compiler.js)
+ [compilation](https://github.com/webpack/webpack/blob/master/lib/Compilation.js)

## debugger 调试

经过上面对 webpack 的源码与工作机制有了一个初步的认知之后，现在我们通过 debugger 调试的方法来详细解析 webpack 打包的整个运行流程。这里还是沿用上一章的 webpack_bundle.js 的配置以及 main.js 和 show.js 的源码文件。同时做一些修改，在 webpack_bundle.js 中添加以下配置，将 main.js 文件中的内容改成普通模块调用，如下：

```js
// main.js
const show = require('./show.js')
const txt = require('../test/example.txt')

show('webpack' + txt)
```

```js
// package.json
"scripts": {
    // 添加 debugger 命令
    "debugger": "node --inspect-brk ./node_modules/webpack/bin/webpack.js --config ./config/webpack_bundle.js --inline --progress",
}
```

```js
// webpack_bundle.js
const path = require('path')

// 此处添加断点
debugger
module.exports = {
    // ...
    module: {
        // 添加对 txt 文件的处理
        rules: [{
            test: /\.txt$/,
            use: {
                loader: path.resolve(__dirname, '../loader/loader.js'),
                options: {
                    name: 'Alice'
                }
            }
        }]
    }
}
```

接下来我们就可以开始调试 webpack 的打包过程了。这里我们介绍使用 chrome 浏览器来调试 node 应用。方法如下：

首先在终端运行 ```npm run debugger```，这时候终端提示可以监听 ws://127.0.0.1:9229/... 这个 url 来捕获此次的 debugger。我们现在打开 chrome 浏览器，并输入网址： "chrome://inspect/#devices"，并选择 "Open dedicated DevTools for Node" 就可以开始调试 node 应用了，如下：

这时候的终端就显示了 “Debugger attached.” 提示，表示此次的 debugger 已经被捕获了。同时会弹出一个 chrome 调试面板，供我们后续调试。并且程序暂停在了第一行处，等待后续操作。之所以程序会停在第一行，是因为我们在启动命令 ```npm run debugger``` 中实际包含了 "--inspect-brk" 这个参数。当前的调试界面如下：

### 初始化阶段

为了能更清楚的说明程序主流程的运行逻辑，在后续的说明中会省略大量的分支逻辑。我们继续往下看，程序的入口是 webpack.js 文件，在这个文件中主要就是寻找安装了哪一个 webpack 的脚手架工具，这里我们安装了 'webpack-cli'，因此会导入并运行这个 'webpack-cli' 文件。如下：

```js
// webpack.js

// 寻找已安装的 cli 工具
const installedClis = CLIs.filter(cli => cli.installed);

if (installedClis.length === 0) {
    // ...
    let notify =
        "One CLI for webpack must be installed. These are recommended choices, delivered as separate packages:";
} else if (installedClis.length === 1) {
    const path = require("path");
    const pkgPath = require.resolve(`${installedClis[0].package}/package.json`);
    const pkg = require(pkgPath);
    // 导入安装的 webpack-cli 并运行
    require(path.resolve(
        path.dirname(pkgPath),
        pkg.bin[installedClis[0].binName]
    ));
} else {
    process.exitCode = 1;
}
```

我们继续调试进入 'cli.js' 文件内部，在该文件中会进行各种配置的读取，包括我们的 'webpack_bundle.js' 中的配置，所以此时程序就停在了我们之前在 'webpack_bundle.js' 中设置的断点处，如下：

### 实例化 compiler 阶段

在读取完配置后，接着就进入了 ```processOptions```函数进行处理配置。如下：

```js
// cli.js

function processOptions(options) {
    // ...
    try {
        // 通过 webpack 进行实例化 compiler 对象
        compiler = webpack(options);
    } catch (e) {
        // ...
    }
}
```

上述过程中我们省略了一些初始化工作，直接看关键代码。在该函数中会调用 ```webpack``` 函数来创建一个 compiler 对象。还记得 compiler 和 compilation 这两个对象是 webpack 中最终要的两个对象嘛。我们继续调试进入 ```webpack``` 函数中，如下：

```js
// webpack.js

const webpack = (options, callback) => {
    // ...
    // 调用 Compiler 来进行实例化 compiler 对象
    compiler = new Compiler(options.context);
    compiler.hooks.environment.call();
    compiler.hooks.afterEnvironment.call();
    // 初始化一些列内置插件
    compiler.options = new WebpackOptionsApply().process(options, compiler);
}
```

如上所示，在 ```webpack``` 中通过 ```new Compiler``` 来实例化 compiler 对象，在实例化之后，就触发 compiler 对象的 environment 和 afterEnvironment 钩子事件。接着就调用 ```new WebpackOptionsApply().process(options, compiler)```来初始化 webpack 中的一些列内置插件。我们进入这个函数详细看下，如下：

```js
// WebpackOptionsApply.js

class WebpackOptionsApply extends OptionsApply {
    constructor() {
        super();
    }

    process(options, compiler) {
        // ...
        new JavascriptModulesPlugin().apply(compiler);
        new JsonModulesPlugin().apply(compiler);
        // 入口处理插件
        new EntryOptionPlugin().apply(compiler);
        compiler.hooks.entryOption.call(options.context, options.entry);
        // ...
    }
}
```

在这个函数中会进行一系列内置插件的配置，他们大多都是监听 compiler.compilation 事件钩子。我们重点看下入口处理插件。在 make 阶段主程序会从这个入口插件开始分析依赖，我们来看下内部实现。首先进入 ```new EntryOptionPlugin().apply(compiler)``` 函数，如下：

```js
// EntryOptionPlugin.js

module.exports = class EntryOptionPlugin {
    apply(compiler) {
        compiler.hooks.entryOption.tap("EntryOptionPlugin", (context, entry) => {
            if (typeof entry === "string" || Array.isArray(entry)) {
                itemToPlugin(context, entry, "main").apply(compiler);
            } else if (typeof entry === "object") {
                for (const name of Object.keys(entry)) {
                    itemToPlugin(context, entry[name], name).apply(compiler);
                }
            } else if (typeof entry === "function") {
                new DynamicEntryPlugin(context, entry).apply(compiler);
            }
            return true;
        });
    }
};
```

在这个函数中主要就是创建了一个 'EntryOptionPlugin' 插件来监听 entryOption 事件。我们跳出这个函数，继续看 ```compiler.hooks.entryOption.call(options.context, options.entry);``` 这个函数就是触发 entryOption 这个事件钩子，那么此时程序就来到了我们刚刚注册的 `EntryOptionPlugin` 插件，并运行 ```itemToPlugin``` 函数，我们继续往下看：

```js
// EntryOptionPlugin.js

const itemToPlugin = (context, item, name) => {
    if (Array.isArray(item)) {
        return new MultiEntryPlugin(context, item, name);
    }
    return new SingleEntryPlugin(context, item, name);
};
```

这个函数中主要就是根据单入口还是多入口调用对应的处理函数。这里我们是单入口，所以程序就进入了 ```new SingleEntryPlugin``` 函数，如下：

```js
// SingleEntryPlugin.js

class SingleEntryPlugin {
    apply(compiler) {
        // ...
        compiler.hooks.make.tapAsync(
            "SingleEntryPlugin",
            (compilation, callback) => {
                const { entry, name, context } = this;

                const dep = SingleEntryPlugin.createDependency(entry, name);
                // 此处打断点，在 make 阶段会进入此处开始从入口分析依赖
                compilation.addEntry(context, dep, name, callback);
            }
        );
    }
}
```

上述函数中主要就是订阅了 make 这个钩子事件，这里需要提前打一个断点，在 make 阶段会进入此处正式从入口开始分析依赖，也就是调用 ```compilation.addEntry``` 函数。

我们继续往下调试，接着程序会初始化后续的一系列插件，然后就又回到了本小节一开始的 'cli.js' 文件中的 ```processOptions(options)``` 函数中，初始化 compiler 实例的过程正式结束。实例化 compiler 对象后，根据 options 的 watch 判断是否启动了 watch，如果启动了 watch 就调用 compiler.watch 来构建文件，否则启动 compiler.run 来构建文件。这里我们是调用 compiler.run 来构建文件的。

```js
// clis.js

function processOptions(options) {
    // ...
    try {
        // 实例化 compiler 对象
        compiler = webpack(options);
    } catch (e) {
        // ...
    }
    // ...
    // 判断是否开启 watch
    if (firstOptions.watch || options.watch) {
        // ...
    } else {
        // 未开启 watch 时，调用 run 来进行构建。我们这里就使用 run 来进行构建的
        compiler.run((err, stats) => {
            // ...
        });
    }
}
```

### 编译构建阶段

承接上文，我们现在进入 ```compiler.run``` 开始构建过程。进入 run 函数后，在触发了 ```beforeRun``` 和 ```run``` 事件钩子以后，最终会调用 ```this.compile``` 进行编译。如下：

```js
// Compiler.js

run (callback) {
    // ...
    this.hooks.beforeRun.callAsync(this, err => {
        // ...
        this.hooks.run.callAsync(this, err => {
            // ...
            this.compile(onCompiled);
        });
    });
}
```

我们继续调试进入 ```this.compiler``` 函数，如下：

```js
// Compiler.js

compile(callback) {
    const params = this.newCompilationParams();
    this.hooks.beforeCompile.callAsync(params, err => {
        // 触发 compiler 的 compile 事件钩子
        this.hooks.compile.call(params);
        // 为本次构建实例化一个 compilation 对象
        const compilation = this.newCompilation(params);
        // 触发 compiler 的 make 事件钩子，正式开始构建
        this.hooks.make.callAsync(compilation, err => {
            // ...
        });
    });
}
```

如上所示，在 ```compile``` 函数中，首先触发 'beforeCompile' 事件钩子，然后触发 'compile' 事件钩子，接下来就实例化本次构建的 compilation 对象，然后就触发 'make' 事件钩子，正式开始构建。主分支逻辑运行到这里后就结束了，接下来我们需要查找监听了 make 事件钩子的插件。这里顺便插一句题外话，其实 webpack 的强大之处正是它的这种插件机制，可以非常灵活的控制各个流程，并且可以对外开放，不断补充各种插件，从而使其功能更加强大。但这种插件机制会给程序调试带来非常大的困难，因为往往主程序运行着就没了，接下来你需要去寻找各种监听它事件的插件，使得整个程序运行过程不再是简单的深度遍历方式，而更像是一种类似于网络的过程，其中各种插件就是一个个的节点，程序在节点中无规律的跳转着。

言归正传，上面说到主流程运行到 make 事件钩子后就没有了，接下来我们需要去寻找监听 make 事件的插件。还记得在上一章节中我们特意提到了 'SingleEntryPlugin' 这个插件嘛，它就是监听 make 事件的，它是来处理模块依赖入口的插件。此时，我们程序就进入了这个插件的回调函数内部，如下：

```js
// SingleEntryPlugin.js

class SingleEntryPlugin {
    // ...
    compiler.hooks.make.tapAsync(
        "SingleEntryPlugin",
        (compilation, callback) => {
            // 开始进入入口
            compilation.addEntry(context, dep, name, callback);
        }
    );
}
```

如上所示，在该插件中主要就是调用 ```addEntry```，我们继续调试进入该函数中，如下：

```js
// Compilation.js

addEntry(context, entry, name, callback) {
    // ...
    this.hooks.addEntry.call(entry, name);
    this._addModuleChain();
}
```

在该函数中主要就是调用 ```_addModuleChain``` 函数，我们继续调试进入该函数，如下：

```js
// Compilation.js

_addModuleChain(context, dependency, onModule, callback) {
    // ...
    // 获取模块对应的工厂函数
    const moduleFactory = this.dependencyFactories.get(Dep);
    this.semaphore.acquire(() => {
        // 调用工厂函数 create
        moduleFactory.create(
            {/*...*/},
            (err, module) => {
                const afterBuild = () => {
                    // ...
                };

                if (addModuleResult.build) {
                    // 开始构建
                    this.buildModule(module, false, null, null, err => {
                        // ...
                        afterBuild()
                    });
                }
            }
        );
    });
}
```

函数中首先会依赖获取到模块的工厂函数，然后调用 create 进行创建，在它的回调函数中调用 ```this.buildModule``` 开始编译构建，然后在回调中调用 ```afterBuild``` 函数进行构建后的操作。这里我们先随着程序运行进入 ```this.buildModule``` 函数，如下：

```js
// Compilation.js

buildModule(module, optional, origin, dependencies, thisCallback) {
    // ...
    // 触发 buildModule 事件钩子
    this.hooks.buildModule.call(module);
    module.build(
        this.options,
        this,
        this.resolverFactory.get("normal", module.resolveOptions),
        this.inputFileSystem,
        error => {/*...*/}
    );
}
```

在该函数中先是触发 'buildModule' 事件钩子，然后调用 ```module.build``` 函数，我们进入这个 ```module.build``` 函数，如下：

```js
// NormalModule.js

build(options, compilation, resolver, fs, callback) {
    // ...
    // 调用 doBuild 开始正是构建
    return this.doBuild(options, compilation, resolver, fs, err => {})
}
```

在 ```build``` 函数中会调用 ```this.doBuild``` 开始正式构建。可以看到，此时终端也提示构建 module

我们继续调试进入 ```this.doBuild``` 函数，如下：

```js
// NormalModule.js

doBuild(options, compilation, resolver, fs, callback) {
    // ...
    // 调用 runLoaders 开始通过 loader 来加载对应的资源
    runLoaders(
        {/*...*/},
        (err, result) => {/*...*/}
    );
}
```

继续调试进入 ```runLoaders``` 函数，如下：

```js
// LoaderRunner.js

exports.runLoaders = function runLoaders(options, callback) {
    // 对加载的资源进行一系列的初始化操作，当前加载的资源就是入口文件 ${ProjectDir}/src/main.js
    // ...
    // 递归执行带有 pitch 属性的 loader
    iteratePitchingLoaders(processOptions, loaderContext, function(err, result) {/*...*/});
};
```

继续调试进入 ```iteratePitchingLoaders``` 函数，如下：

```js
// LoaderRunner.js

function iteratePitchingLoaders(options, loaderContext, callback) {
    // abort after last loader
    if(loaderContext.loaderIndex >= loaderContext.loaders.length)
        return processResource(options, loaderContext, callback);

    // load loader module
    loadLoader(currentLoaderObject, function(err) {/*...*/});
    // ...
}
```

在这个函数中加入当前没有对应的 loader，那么就会进入 ```processResource``` 函数来处理资源，否则就调用 ```loadLoader``` 来处理。这里因为我们处理的是入口文件 main.js 资源，所以不需要额外的 loader，程序会进入 ```processResource``` 函数中，如下：

```js
// LoaderRunner.js

function processResource(options, loaderContext, callback) {
    // set loader index to last loader
    loaderContext.loaderIndex = loaderContext.loaders.length - 1;

    var resourcePath = loaderContext.resourcePath;
    if(resourcePath) {
        loaderContext.addDependency(resourcePath);
        // 这里的 options.readResource 就是 node 中的 readFile 函数，resourcePath 就是入口文件 main.js
        options.readResource(resourcePath, function(err, buffer) {
            // 进入文件读取回调函数中
            if(err) return callback(err);
            // 这里面读出来的是十六进制
            options.resourceBuffer = buffer;
            // 将资源文件 main.js 读入后，再调用 iterateNoramalLoaders 进行处理
            iterateNormalLoaders(options, loaderContext, [buffer], callback);
        });
    } else {
        iterateNormalLoaders(options, loaderContext, [null], callback);
    }
}
```

其中 ```options.readResource``` 函数就是 node 中的 readFile 函数，在文件读取的回调函数中将文件内容（十六进制形式）保存在 'resourceBuffer' 中，并且调用 ```iterateNormalLoaders``` 函数进行后续的处理

我们继续进入 ```iterateNormalLoaders``` 函数中，如下：

```js
// LoaderRunner.js

function iterateNormalLoaders(options, loaderContext, args, callback) {
    // 没有 loader 时就直接返回
    if(loaderContext.loaderIndex < 0)
        return callback(null, args);

    // 获取当前的 loader 对象
    var currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];

    // ...
    // 同步或这异步调用 loader 来处理资源
    runSyncOrAsync(fn, loaderContext, args, function(err) {/*...*/});
}
```

这里我们没有 loader，所以就直接调用 callback 返回了。

至此，一开始在 ```doBuild``` 函数中的 ```runLoaders``` 函数就运行完成了，正式完成了资源的加载（这里就是入口文件 main.js 的加载），接着运行它的回调函数，如下：

```js
// NormalModule.js

doBuild(options, compilation, resolver, fs, callback) {
    runLoaders(
        {/*...*/},
        (err, result) => {
            // ...
            // 将十六进制码转换成字符串格式
            this._source = this.createSource(
                this.binary ? asBuffer(source) : asString(source),
                resourceBuffer,
                sourceMap
            );
            return callback();
        }
    );
}
```

上面程序中主要就是将刚刚读取来的十六进制表示字节转变成字符串格式。所以，此时 'this._source' 的内容就是入口文件 'main.js' 的文本内容。

接着程序就运行 ```callback``` 回调函数，继续调试进入，现在进入了 ```doBuild``` 函数的回调中，如下：

```js
// NormalModule.js

build(options, compilation, resolver, fs, callback) {
    return this.doBuild(options, compilation, resolver, fs, err => {

        const handleParseResult = result => {
            // ...
            return callback()
        };

        try {
            // 调用 parse 来分析主入口文件内容，这里采用的是 acorn 的 js 编译器来进行分析的，不做详细展开
            const result = this.parser.parse(
                this._ast || this._source.source(),
                // ...
            );
            if (result !== undefined) {
                // parse is sync
                handleParseResult(result);
            }
    });
}
```

上述代码中主要就是调用 acorn 编译库来分析 js 代码，并最终将分析结果传入 ```handleParseResult``` 函数中。在该函数中又会调用 ```callback``` 回调函数，接着我们就进入了 ```module.build``` 的回调中，如下：

```js
// Compilation.js

buildModule(module, optional, origin, dependencies, thisCallback) {
    module.build(
        /*...*/,
        error => {
            // 触发该模块编译成功的钩子事件
            this.hooks.succeedModule.call(module);
            return callback();
        }
    );
}
```

在上述的回调中，先是触发 'succeedModule' 钩子事件，然后就调用回调。最终程序回到了 ```this.buildModule``` 的回调中，并调用 ```afterBuild``` 函数来进行下一步的处理。

```js
// Compilation.js

_addModuleChain(context, dependency, onModule, callback) {
    this.semaphore.acquire(() => {
        moduleFactory.create(
            {/*...*/},
            (err, module) => {
                // ...
                const afterBuild = () => {
                    if (addModuleResult.dependencies) {
                        // 进行编译后资源的处理
                        this.processModuleDependencies(module, err => {
                            callback(null, module);
                        });
                    }
                };

                if (addModuleResult.build) {
                    this.buildModule(module, false, null, null, err => {
                        // 调用 afterBuild 来进行后续资源的处理
                        afterBuild();
                    });
                }
            }
        );
    });
}
```

在回调函数中会调用 ```afterBuild``` 函数进行编译后资源的处理，我们进入该函数，接着，程序通过 ```this.processModuleDependencies``` 来处理编译后资源。我们调试进入，如下：

```js
// Compilation.js

processModuleDependencies(module, callback) {
    // ...
    // 分析模块依赖
    this.addModuleDependencies(/*...*/);
}
```

我们继续调试进入 ```this.addModuleDependencies``` 中，如下：

```js
// Compilation.js

addModuleDependencies(
    /*...*/
) {
    asyncLib.forEach(
        dependencies,
        (item, callback) => {
            const dependencies = item.dependencies;

            const semaphore = this.semaphore;
            semaphore.acquire(() => {
                const factory = item.factory;
                // 调用工厂函数
                factory.create(
                    {/*...*/},
                    (err, dependentModule) => {
                        const afterBuild = () => {
                            if (recursive && addModuleResult.dependencies) {
                                this.processModuleDependencies(dependentModule, callback);
                            }
                        };
                        if (addModuleResult.build) {
                            // 进行模块的编译
                            this.buildModule(
                                /*...*/
                                err => {
                                    // 编译后的回调
                                    afterBuild();
                                }
                            );
                        }
                    }
                );
            });
        },
    );
}
```

我们详细看下这个 ```addModuleDependencies``` 函数，可以看到它和之前我们编译主入口文件的函数 ```_addModuleChain``` 几乎一样，都是从调用工厂函数开始，然后进入回调中调用 ```this.buildModule``` 开始编译模块，接着在回调中调用 ```afterBuild``` 来进一步操作，并在该函数中调用 ```processModuleDependencies``` 函数来递归分析该模块中的其他依赖。

所以，接下来的调试过程就不详细给出了，这里我们只关心 'example.txt' 这个资源文件，看下 webpack 到底是如何调用我们自己写的 loader 来加载处理该资源的。在跳过了 'show.js' 的编译过程后，我们继续调试，进入 ```iteratePitchingLoaders``` 函数中

'currentLoaderObject' 中的路径就指向了我们自己的编写的 loader 中。接着调用 ```loadLoader``` 函数将我们的 loader 加载进来，继续调试，接着进入了最后的 ```iterateNormalLoaders``` 函数中

可以看到此时的 fn 就是我们自己定义的 loader 函数，并且 webpack 中通过 ```runSyncOrAsync``` 来调用 fn 处理我们的资源 example.txt，后续的过程这里就不展开了

上面就是资源的编译加载过程，包括了入口文件的编译分析以及它所包含的所有的资源的加载和分析。接下来程序会开始对构建后的结果进行封装等操作

### seal 阶段

在上述的编译完成以后，程序进入了 make 的回调函数中，开始进入 seal 阶段，如下：

```js
// Compiler.js

compile(callback) {
    const params = this.newCompilationParams();
    this.hooks.beforeCompile.callAsync(params, err => {
        // ...
        compilation.seal(err => {/*...*/});
    });
}
```

我们继续调试进入 ```seal``` 函数中，如下：

```js
// Compilation.js

seal(callback) {
    this.hooks.seal.call();
    this.hooks.afterOptimizeDependencies.call(this.modules);
    this.hooks.beforeChunks.call();
    // ...
    // 开始创建输出资源
    this.createChunkAssets();
```

在 ```seal``` 中首先会进行一系列依赖优化，然后就调用 ```this.createChunkAssets``` 函数来生成源码对象。我们进入该函数，如下：

```js
// Compilation.js

createChunkAssets() {
    // ...
    // 获取到 manifest 对象
    const manifest = template.getRenderManifest({
        chunk,
        hash: this.hash,
        fullHash: this.fullHash,
        outputOptions,
        moduleTemplates: this.moduleTemplates,
        dependencyTemplates: this.dependencyTemplates
    });
    // 生成源码
    source = fileManifest.render();
}
```

首先获取 manifest 对象，它的值如下，接着调用 ```fileManifest.render``` 函数来生成源码

我们继续调试进入 ```fileManifest.render``` 函数，如下：

```js
class JavascriptModulesPlugin {
    apply(compiler) {
        // ...
        // 调用 render
        compilation.mainTemplate.render(/*...*/)
    }
}
```

我们继续调试进入 ```compilation.mainTemplate.render``` 函数，如下：

```js
render(hash, chunk, moduleTemplate, dependencyTemplates) {
    // 生成启动代码
    const buf = this.renderBootstrap(
        hash,
        chunk,
        moduleTemplate,
        dependencyTemplates
    );
    // 生成源码对象
    let source = this.hooks.render.call(
        new OriginalSource(
            Template.prefix(buf, " \t") + "\n",
            "webpack/bootstrap"
        ),
        chunk,
        hash,
        moduleTemplate,
        dependencyTemplates
    );
    // ...
}
```

可以看到此时的 source 的值和最终的 bundle.js 文件中的内容一样，只不过此时是以数组的形式保存在了 source 中。后续就是将源码写入文件中，生成最终的 bundle.js 文件，此处就不再赘述了。

在程序运行的最后， webpack 会调用 ```emitAssets``` 函数，按照 output 中的配置项异步将文件输出到对应的 path 中，从而整个 webpack 的打包过程结束了。当然，你也可以通过在自己的插件中监听 'emit' 事件来进行后续扩展。

### 总结

以上就是 debugger webpack 打包的整个过程了，我们可以看到 webpack 将整个打包分成了很多过程，并且以插件的形式分别处理每个流程。虽然这种插件形式的架构方便扩展，但同时也给我们的程序调试定位带来极大的麻烦。当然，上述的 debugger 过程只是分析了程序主分支流程，还有很多细节并为提及，比如 webpack 的 watch 模式等，有兴趣的可以自己进行详细调试。

下面给出一个完整的 webpack 打包运行流程图作为本节的结束：

**TODO webpack 打包流程图**

## 参考资料

[webpack调试](https://www.webpackjs.com/contribute/debugging/)

[webpack4源码分析](https://juejin.im/post/5c1859745188254fef232ead)

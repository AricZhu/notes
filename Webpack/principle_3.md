# tapable 库

webpack 是一个插件架构，它的很多功能都是通过内置插件完成的，同时也支持自定义插件来完成各种事情，这也是它方便易用同时又足够强大的重要原因之一。为此，webpack 专门写了一个插件系统 tapable，提供了更加强大的注册和调用插件的功能。

webpack 中提供的 tapable 本质上就是一个发布-订阅设计模式。我们以下面一张图为例说明这个模式的工作方式：

![sub/pub](./img/2/8.jpg)

首先这个模式有两个角色，分别是发布者和订阅者。这里以一个发布者对多个订阅者为例说明。为了能收到相关消息，首先订阅者需要进行订阅操作，比如使用发布者提供的 subs 来进行订阅。在订阅成功后，发布者就可以发布消息给订阅者了，比如上面的 notify API 来通知所有的订阅者。

接下来我们看一下 tapable 这个库。它里面提供了各种发布者模式，有同步，异步，串行，并行以及 waterfull 模式等等。如下：

```js
const {
    SyncHook,
    SyncBailHook,
    SyncWaterfallHook,
    SyncLoopHook,
    AsyncParallelHook,
    AsyncParallelBailHook,
    AsyncSeriesHook,
    AsyncSeriesBailHook,
    AsyncSeriesWaterfallHook
} = require("tapable")
```

它的使用方式也足够的简单，通过 tap 来进行订阅，通过 call 来进行通知。在 src 目录下新建一个 tapable-demo.js 的文件，内容如下：

```js
const frontendSync = new SyncHook(['name'])

frontendSync.tap('LearnJS', name => console.log(`${name} learn js.`))
frontendSync.tap('LearnWebpack', name => console.log(`${name} learn webpack.`))
frontendSync.tap('LearnVue', name => console.log(`${name} learn vue.`))

frontendSync.call('xiaoming')
```

这时候的输出就打印出以下三条信息：

```text
xiaoming learn js.
xiaoming learn webpack.
xiaoming learn vue.
```

我们也可以使用 SyncWaterfallHook 这个函数来让传递订阅者之间的消息。如下：

```js
const frontendWf = new SyncWaterfallHook(['name'])

frontendWf.tap('LearnJs', name => {
    console.log(`${name} start learn frontend.`)
    return 'learn js done.'
})

frontendWf.tap('LearnWebpack', val => {
    console.log(val)
    return 'learn webpack done.'
})

frontendWf.tap('LearnVue', val => {
    console.log(val)
    console.log('learn vue done.')
})

frontendWf.call('xiaohong')
```

最终运行结果如下：

```text
xiaohong start learn frontend.
learn js done.
learn webpack done.
learn vue done.
```

除了上述的同步方法，tapable 还提供异步插件等功能，这里就不详细介绍了。

## 参考资料

[tapable](https://github.com/webpack/tapable/)

[tapable用法详解](https://juejin.im/post/5cb43b3e5188251b2b20b7ed/)

# 前端安全

## 浏览器同源策略

同源策略是浏览器安全的基石，其设计目的是为了保证信息安全，防止恶意的网站窃取数据。所谓同源必须满足以下三个方面：

* 协议相同
* 域名相同
* 端口相同（默认端口是80，可以省略）

如果是非同源的，以下行为会受到限制：

* Cookie, LocalStorage 和 IndexDB 无法读取
* DOM 无法获取
* Ajax 请求不能发送

接下来我们讲解在非同源下，如何解决上述的三个限制

## 非同源下的 Cookie 共享

Cookie 只有同源的网站才能获取，但是如果两个网页的一级域名相同，只是二级域名不同，则可以设置相同的 document.domain，两个网页就能共享 cookie 了。

首先我们看下域名的划分，如下：

1. 顶级域名: .com
2. 一级域名: baidu.com
3. 二级域名: tieba.baidu.com

现在假设 A 网页是 http://w1.sillywa.com/a.html",  B 网页是 http://w2.sillywa.com/b.html, 那么我们就可以设置 document.domain = 'sillywa.com' 从而可以使 A 网页 和 B 网页共享 Cookie 了。(服务器传回的 Cookie，可以设置 Cookie 的 domain 属性)

这里需要注意，这种方式只适用于 Cookie 和 iframe，对于 LocalStorage 和 IndexDB 则不能通过这种方式规避同源策略，而是需要用 PostMessage API，详见后文。

## 非同源下的 DOM 获取

如果两个网页不同源，就没法拿到对方的 DOM，典型的就是 iframe 窗口和 window.open 方法打开的窗口，它们与父窗口无法通信。

所以对于完全不同源的网站，目前可以使用以下三种方法来规避同源问题：

* hash 传值
* window.name
* 跨文档通信 API（window.postMessage）

**hash 传值**:

可以通过改变 url 中的 hash 值，再监听 hashchange 事件来达到传递数据的目的。

* 父页面：parent.html（所在域：www.parent.com）
* 子页面：child.html（所在域：www.child.com）
* 代理页面：proxy.html（所在域：www.parent.com）必须与父页面在同域下 (要实现父子页面双向的事件调用和传值，需要多加一个代理页面，主要用于子页面调用父页面的方法)

现在我们要在父页面中给子页面传递数据，可以进行如下操作：

```js
// parent.html (注意，子页面是以 iframe 标签的形式嵌入文档的, 其中 iframe 的 src 就是子页面的 url 连接，用来加载子页面的 html)
var frameurl = "http://www.child.com/child.html"
document.getElementById("frameId").src=frameurl+"#action="+actionName+"&data="+dataJSONStr

// child.html 我们在子页面中设置 hashchange 事件即可
window.onhashchange = () => {
    let hash = location.hash.substring(1)
    let action = ...
    let data = ...
    childFuncClass[action](data)
}
```

现在我们要实现子页面数据传递给父页面，可以进行如下操作：

在子页面 child.html 中添加一个 iframe 链接到上面所说的 proxy.html，child.html 中通过改变 proxy.html 的 hash 值，在 proxy.html 中监听 hash 变化事件，监听到以后直接调用 parent.html 中的方法（与父页面调用子页面方法一致）

```js
// proxy.html
window.onhashchange = () => {
    let hash = location.hash.substring(1)
    let action = ...
    let data = ...
    window.parent.parent[action](data) // 因为 proxy 和父页面同域，因此可以直接获取父页面
}
```

**window.name**:

浏览器有一个 window.name 属性，这个属性的最大特点就是无论是否同源，只要在同一个窗口中，前一个网页设置了这个属性，后一个网页就可以读取它。

**window.postMessage**:

HTML5 中为了解决跨域窗口通信问题，引入了一个新的 API：跨文档通信 API。这个 API 为 window 新增了一个 window.postMessage() 方法，允许跨窗口通信，不论这两个窗口是否同源。

postMessage 方法的使用语法如下:

**window.postMessage(message, targetOrigin, [transfer])**

window: 其他窗口的一个引用，比如 iframe 的 contentWindow 属性、执行 window.open 返回的窗口对象、或者是命名过或数值索引的 window.frames。

**这里需要特别注意的是**: window 并不是指发送消息的窗口，而是接收消息的窗口。举个例子：

* A页面中：A页面向B页面发送跨域信息，window 就是在A页面中嵌入的 iframe 指向的B页面的 window，即：iframe.contentWindow
* B页面中，B页面向A页面发送跨域信息，window 就是A页面的 window，如果 B 页面是嵌入到 A 页面中的，可以通过 top 或 parent 属性拿到 A 页面的 window

message: 将要发送到其他 window 的数据。它将会被结构化克隆算法序列化。这意味着你可以不受什么限制的将数据对象安全的传送给目标窗口而无需自己序列化。

targetOrigin: 通过窗口的 origin 属性来指定哪些窗口能接收到消息事件，其值可以是字符串 "*"（表示无限制）或者一个 URI。在发送消息的时候，如果目标窗口的协议、主机地址或端口这三者的任意一项不匹配 targetOrigin 提供的值，那么消息就不会被发送；只有三者完全匹配，消息才会被发送。

一个使用 postMessage 进行跨域通信的例子如下：

```js
//假设父窗口为：http://aaa.com，子窗口为：http://bbb.com

// 父窗口向子窗口发送消息, 注意：这里是调用子窗口 popup 的 postMessage
let popup = window.open('http://bbb.com', 'title')
popup.postMessage('Hello World!', 'http://bbb.com')

// 同样，子窗口向父窗口发送消息，注意：这里是调用父窗口的 postMessage
window.opener.postMessage('Nice to see you', 'http://aaa.com')

// 父窗口和子窗口都可以通过message事件，监听对方的消息：
window.addEventListener('message', function(e) {
    // 我们能相信信息的发送者吗?  (也许这个发送者和我们最初打开的不是同一个页面).
    if (event.origin !== "....") return
    console.log(e.data)
},false)

/* message 事件中的 event 对象有以下三个属性:
1. event.source：发送消息的窗口
2. event.origin：消息发送的来源, 一般用来判断消息发送者是不是我们信任的，这个判断比较重要
3. event.data：消息内容
*/
```

通过 postMessage 我们可以进行跨域发送消息。如果我们将发送的消息改为 LocalStorage，则可以互相读取 LocalStorage。

## 非同源下的 Ajax 请求发送

同样的，Ajax 请求也会收到同源策略的影响，除了使用代理服务器意外以外，还有以下方法实现跨域：

* jsonp
* CORS
* WebSocket

### JSONP

JSONP在CORS出现之前，是最常见的一种跨域方案，在IE10以下的版本，是不兼容CORS的，所以如果有需要兼容IE10一下的，都会使用JSONP去解决跨域问题。

基本实现原理：动态向页面添加一个script标签，浏览器对脚本请求是没有域限制的，浏览器会请求脚本，然后解析脚本，执行脚本。通过这个我们就可以实现跨域请求。

```js
function handleResponse(response) {
  console.log(response)
}
var script = document.createElement("script")
script.src = "http://localhost:3000/?callback=handleResponse"
document.body.insertBefore(script, document.body.firstChild)
```

研究一下这段代码，新建一个script标签，设置标签的src属性，动态插入标签到body后面。插入以后浏览器会请求src的内容，下载下来并执行。

那怎么通过回调handleResponse获得数据？src后面那段querystring又是干什么的？

如果请求得到的脚本里面的代码长这样

```js
handleResponse('hello world')
```

执行的时候是不是就可以通过回调得到 data -> ‘hello world’

所以 jsonp 其实也需要后端的支持，这个 queryString 就是让后端知道你前端的回调方法，然后要返回怎样的脚本给前端。

以下是后端的代码：

```js
const koa = require('koa')
const app = new koa()
app.use(async ctx => {
  ctx.body = `${ctx.query.callback}('hello world')`
})
app.listen(3000)
```

JSONP 的缺点是只能使用 get 请求。

### CORS

### WebSocket

WebScoket不同于http，它提供一种双向通讯的功能，即客户端可以向服务器请求数据，同时服务器也可以向客户端发送数据。而http只能是单向的。

同时WebScoket使用ws:\//（非加密）和wss:\//（加密）作为协议前缀。该协议不实行同源政策，只要服务器支持，就可以通过它进行跨源通信。

要创建WebScoket，先实例化一个WebScoket对象并传入要连接的URL：

```js
let scoket = new WebScoket("ws://www.example.com/server.php")
scoket.send('hello word')
```

当服务器向客户端发来消息时，WebScoket对象就会触发message事件。这个message事件与其它传递消息的协议类似，也就是把返回的数据保存在event.data的属性中。

```js
scoket.onmessage = function(event) {
    console.log(event.data)
}
```

更多关于 WebSocket 的用法详见 websocket.md 文档介绍，此处不详细展开。

## CSRF

## XSS

## 参考资料

1. [同源策略及其解决方案](https://juejin.im/post/5aaa44e2f265da2373142e27)

2. [Iframe父子窗口之间的跨域事件调用和传值](https://www.cnblogs.com/lycnblogs/p/7687255.html)

3. [MDN--window.postMessage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/postMessage)

4. [跨域资源共享 CORS 详解](http://www.ruanyifeng.com/blog/2016/04/cors.html)

5. [彻底理解浏览器的跨域](https://juejin.im/post/5cad99796fb9a068ab40a29a)

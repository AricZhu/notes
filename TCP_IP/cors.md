# 前端跨域

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

### hash 传值

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

### window.name

浏览器有一个 window.name 属性，这个属性的最大特点就是无论是否同源，只要在同一个窗口中，前一个网页设置了这个属性，后一个网页就可以读取它。

### window.postMessage

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
* WebSocket
* CORS

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

### CORS

CORS 是一个 W3C 的标准，全称是 “跨域资源共享”(Cross-Origin Resource Sharing)，这个标准允许了浏览器向跨域服务器发出 XMLHttpRequest 请求，从而克服了 Ajax 只能同源使用的限制。

#### 简介

CORS 需要浏览器和服务器的同时支持，目前所有浏览器都支持该功能，IE 浏览器版本不能低于 IE10

整个 CORS 的通信过程都是浏览器自动完成的，不需要用户参与，因此对于开发者来说，CORS 通信和同源的 Ajax 通信在使用上没有差别。当浏览器发现该 Ajax 请求是跨域请求的时候，会自动在该请求上附加一些头信息，有时候还会多出一次请求，但用户完全不会有感觉。

因此实现 CORS 的通信的关键还是在于服务器的配置，只要服务器支持了，就可以实现 CORS 通信。

#### 两种请求

浏览器将 CORS 的请求分成两类：简单请求（simple request）和非简单请求（not-simple-request）

只要同时满足以下两大条件，就属于简单请求：

1. 请求方法是以下三种之一：
    * HEAD
    * GET
    * POST
2. HTTP 的头信息不超出以下几种字段：
    * Accept
    * Accept-Language
    * Content-Language
    * Last-Event-ID
    * Content-Type: 只限于三个值 application/x-www-form-urlencoded、multipart/form-data、text/plain

凡是不同时满足上面两个条件，就属于非简单请求。至于这里为什么要分成简单请求和非简单请求两类，简单来说就是减轻服务器压力，详细原因见参考资料 5

#### 简单请求

##### 1、基本流程

对于简单请求，浏览器直接发送 CORS 请求，并且在头信息中添加一个 Origin 字段

一个例子如下，浏览器发现这次跨域 Ajax 请求是简单请求，就自动在头信息中添加一个 Origin 字段：

```text
GET /cors HTTP/1.1
Origin: http://api.bob.com
Host: api.alice.com
Accept-Language: en-US
Connection: keep-alive
User-Agent: Mozilla/5.0...
```

上面头信息中的 Origin 字段用来说明本次请求来自于哪个源（协议+域名+端口号）。服务器根据这个值来决定是否同意本次请求

如果 Origin 指定的源不在服务器的许可范围内，服务器会返回一个正常的 HTTP 请求，这时候浏览器发现响应中没有包含 Access-Control-Allow-Origin 字段，就知道出错了，从而抛出一个错误，被 XMLHttpRequest 的 onerror 回调捕获

从这里我们知道了其实服务器是正常返回的，只是没有添加 Access-Control-Allow-Origin 字段，是浏览器主动抛出了错误，当然这时候的 Http 返回码有可能就是正常的 200。所以其实是浏览器限制了 CORS，这也就是为什么我们在前端开发的过车过程中，可以通过各种脚本或者客户端来代理跨域请求(使用 webpack 反向代理)，因为对于脚本或者其他客户端不需要受到 Access-Control-Allow-Origin 这个限制，只需要正常返回服务器的响应即可

那么假如 Origin 指定的域名在服务器的许可范围内的话，服务器返回的响应中会多出几个头信息字段：

```text
Access-Control-Allow-Origin: http://api.bob.com
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: FooBar
Content-Type: text/html; charset=utf-8
```

以上的头部信息中，有三个与 CORS 请求相关，都以 Access-Control- 开头

**(1) Access-Control-Allow-Origin**

该字段是必须的，它的值要么就是请求的时的 Origin，要么就是 *，表示接受任意域名的请求

**(2) Access-Control-Allow-Credentials**

该字段可选，它的值是一个布尔值，表示是否允许发送 Cookie。默认情况下，Cookie 不包括在 CORS 请求中。设置为 true，表示服务器明确许可 Cookie 可以包含在请求中发送给服务器。这个值也只能设置为 true，如果服务器不要浏览器发送 Cookie，直接删除这个字段即可

**(3) Access-Control-Expose-Headers**

该字段可选。CORS请求时，XMLHttpRequest对象的getResponseHeader()方法只能拿到6个基本字段：Cache-Control、Content-Language、Content-Type、Expires、Last-Modified、Pragma。如果想拿到其他字段，就必须在Access-Control-Expose-Headers里面指定。上面的例子指定，getResponseHeader('FooBar')可以返回FooBar字段的值

##### 2、withCredentials 属性

上面说到 CORS 默认不发送 Cookie 和 HTTP 认证信息，如果要把 Cookie 发送到服务器，一方面要服务器的同意，指定 Access-Control-Allow-Credentials 字段：

```text
Access-Control-Allow-Credentials: true
```

另一方面，开发者必须在 Ajax 请求中打开 withCredentials 属性：

```js
let xhr = new XMLHttpRequest()
xhr.withCredentials = true
```

否则，即使服务器同意发送Cookie，浏览器也不会发送。或者，服务器要求设置Cookie，浏览器也不会处理

但是，如果省略withCredentials设置，有的浏览器还是会一起发送Cookie。这时，可以显式关闭withCredentials:

```js
xhr.withCredentials = false
```

**这里需要特别注意的是**: 如果要发送 Cookie，那么 Access-Control-Allow-Origin 的值就不能设置为 *，必须指定明确的、与请求网页一致的域名。同时 Cookie 仍然遵守同源政策，只有用服务器域名设置的 Cookie 才会上传，其他域名的 Cookie 并不会上传，同时跨域网页中的 document.cookie 也无法读取服务器域名下的 Cookie

#### 非简单请求

##### 预检请求

非简单请求是那种对服务器有特殊要求的请求，比如请求方法是PUT或DELETE，或者Content-Type字段的类型是application/json（无法直接通过 html 的表单实现的请求就是非简单请求）

非简单请求在正式发送 CORS 请求前，会增加一次 HTTP 查询请求，被称为 ”预检“ 请求（preflight）

浏览器先询问服务器，当前网页所在的域名是否在服务器的许可名单之中，以及可以使用哪些 HTTP 动词和头信息字段。只有得到肯定答复，浏览器才会发出正式的 XMLHttpRequest 请求，否则就报错

下面是一段浏览器的JavaScript脚本:

```js
let url = 'http://api.alice.com/cors'
let xhr = new XMLHttpRequest()
xhr.open('PUT', url, true)
xhr.setRequestHeader('X-Custom-Header', 'value')
xhr.send()
```

上面代码中，HTTP 请求的方法是 **PUT**，并且发送一个自定义头信息 X-Custom-Header

浏览器发现，这是一个非简单请求，就自动发出一个"预检"请求，要求服务器确认可以这样请求。下面是这个"预检"请求的 HTTP 头信息:

```text
OPTIONS /cors HTTP/1.1
Origin: http://api.bob.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: X-Custom-Header
Host: api.alice.com
Accept-Language: en-US
Connection: keep-alive
User-Agent: Mozilla/5.0...
```

"预检"请求用的请求方法是 **OPTIONS**，表示这个请求是用来询问的。头信息里面，关键字段是 Origin，表示请求来自哪个源。除了 Origin 字段，"预检"请求的头信息包括两个特殊字段:

**(1) Access-Control-Request-Method**

该字段是必须的，用来列出浏览器的 CORS 请求会用到哪些 HTTP 方法，上例是 PUT

**(2) Access-Control-Request-Headers**

该字段是一个逗号分隔的字符串，指定浏览器 CORS 请求会额外发送的头信息字段，上例中是 X-Custom-Header

##### 预检请求的响应

服务器收到"预检"请求以后，检查了 Origin、Access-Control-Request-Method 和 Access-Control-Request-Headers 字段以后，确认允许跨源请求，就可以做出回应:

```text
HTTP/1.1 200 OK
Date: Mon, 01 Dec 2008 01:15:39 GMT
Server: Apache/2.0.61 (Unix)
Access-Control-Allow-Origin: http://api.bob.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: X-Custom-Header
Content-Type: text/html; charset=utf-8
Content-Encoding: gzip
Content-Length: 0
Keep-Alive: timeout=2, max=100
Connection: Keep-Alive
Content-Type: text/plain
```

上面的HTTP回应中，关键的是Access-Control-Allow-Origin字段，表示http://api.bob.com可以请求数据。该字段也可以设为星号，表示同意任意跨源请求

如果浏览器否定了"预检"请求，会返回一个正常的HTTP回应，但是没有任何CORS相关的头信息字段。这时，浏览器就会认定，服务器不同意预检请求，因此触发一个错误，被XMLHttpRequest对象的onerror回调函数捕获。控制台会打印出如下的报错信息:

```text
XMLHttpRequest cannot load http://api.alice.com.
Origin http://api.bob.com is not allowed by Access-Control-Allow-Origin.
```

服务器回应的其他CORS相关字段如下:

```text
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: X-Custom-Header
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 1728000
```

**(1）Access-Control-Allow-Methods**

该字段必需，它的值是逗号分隔的一个字符串，表明服务器支持的所有跨域请求的方法。注意，返回的是 **所有支持的方法**，而不单是浏览器请求的那个方法。这是为了避免多次"预检"请求

**(2）Access-Control-Allow-Headers**

如果浏览器请求包括 Access-Control-Request-Headers 字段，则 Access-Control-Allow-Headers 字段是必需的。它也是一个逗号分隔的字符串，表明服务器支持的 **所有头信息字段**，不限于浏览器在"预检"中请求的字段

**(3）Access-Control-Allow-Credentials**

该字段与简单请求时的含义相同

**(4）Access-Control-Max-Age**

该字段可选，用来指定本次预检请求的有效期，单位为秒。上面结果中，有效期是 20 天（1728000 秒），即允许缓存该条回应 1728000 秒（即 20 天），在此期间，不用发出另一条预检请求

##### 浏览器的正常请求和回应

一旦服务器通过了"预检"请求，以后每次浏览器正常的CORS请求，就都跟简单请求一样，会有一个Origin头信息字段。服务器的回应，也都会有一个Access-Control-Allow-Origin头信息字段

下面是"预检"请求之后，浏览器的正常CORS请求:

```text
PUT /cors HTTP/1.1
Origin: http://api.bob.com
Host: api.alice.com
X-Custom-Header: value
Accept-Language: en-US
Connection: keep-alive
User-Agent: Mozilla/5.0...
```

上面头信息的Origin字段是浏览器自动添加的。下面是服务器正常的回应:

```text
Access-Control-Allow-Origin: http://api.bob.com
Content-Type: text/html; charset=utf-8
```

上面头信息中，Access-Control-Allow-Origin 字段是每次回应都必定包含的

## 跨域、同域、跨站、同站、浏览器同源

## 参考资料

1. [同源策略及其解决方案](https://juejin.im/post/5aaa44e2f265da2373142e27)

2. [Iframe父子窗口之间的跨域事件调用和传值](https://www.cnblogs.com/lycnblogs/p/7687255.html)

3. [MDN--window.postMessage](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/postMessage)

4. [跨域资源共享 CORS 详解](http://www.ruanyifeng.com/blog/2016/04/cors.html)

5. [为什么跨域的post请求区分为简单请求和非简单请求和content-type相关？](https://www.zhihu.com/question/268998684/answer/344949204)

6. [预测最近面试会考 Cookie 的 SameSite 属性](https://zhuanlan.zhihu.com/p/114093227)

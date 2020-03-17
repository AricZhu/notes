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

现在假设 A 网页是 http://w1.sillywa.com/a.html",  B 网页是 http://w2.sillywa.com/b.html, 那么我们就可以设置 document.domain = 'sillywa.com' 从而可以使 A 网页 和 B 网页共享 Cookie 了。

这里需要注意，这种方式只适用于 Cookie 和 iframe，对于 LocalStorage 和 IndexDB 则不能通过这种方式规避同源策略，而是需要用 PostMessage API，详见后文。

## 非同源下的 DOM 获取

如果两个网页不同源，就没法拿到对方的 DOM，典型的就是 iframe 窗口和 window.open 方法打开的窗口，它们与父窗口无法通信。

所以对于完全不同源的网站，目前可以使用以下三种方法来规避同源问题：

* 片段标识符（fragment identifier）
* window.name
* 跨文档通信 API（window.postMessage）

**片段标识符**:

片段标识符是指 url 中的 '#' 后边的部分，也就是 hash 值，通过修改这个 hash 值，子窗口中可以通过监听 hashchange 事件，从而获取到数据。

首先设置子窗口监听 hashchange 事件，如下：

```js
window.onhashchange = function () {
    console.log(window.location.hash)
}
```

然后父窗口就可以通过修改子窗口的 url 的 hash 值来传递数据，如下：

```js
let src = originURL + '#' + data
document.getElementById('myIframe').src = src
```

上面讲述了在非同源下，利用 hash 实现父窗口像子窗口传递数据，那么在非同源下，子窗口又如何向父窗口传递数据呢。

其实原理和上述一样，简单说就是在子窗口中内嵌一个和父窗口同源的 iframe，然后再利用 hash 实现子窗口将数据传给这个内嵌的 iframe，又因为这个内嵌的 iframe 和父窗口是同域的，因此可以使用同域的方式来获取数据。

**window.name**:

浏览器有一个 window.name 属性，这个属性的最大特点就是无论是否同源，只要在同一个窗口中，前一个网页设置了这个属性，后一个网页就可以读取它。

**window.postMessage**:

HTML5 中为了解决跨域窗口通信问题，引入了一个新的 API：跨文档通信 API。这个 API 为 window 新增了一个 window.postMessage() 方法，允许跨窗口通信，不论这两个窗口是否同源。

## 非同源下的 Ajax 请求发送

### CORS

### JSONP

## CSRF

## XSS

## 参考资料

1. [同源策略及其解决方案](https://juejin.im/post/5aaa44e2f265da2373142e27)

https://juejin.im/entry/5ac1d8b16fb9a028c8130338

https://juejin.im/post/5cad99796fb9a068ab40a29a

https://juejin.im/post/5b0bac706fb9a009e70e9381

http://www.ruanyifeng.com/blog/2016/04/same-origin-policy.html

http://www.ruanyifeng.com/blog/2016/04/cors.html

# CSRF 和 XSS 攻击

## CSRF

### CSRF 简介

CSRF (Cross-site request forgery), 中文名称：跨站请求伪造，也被称为 one click attack/session riding, 缩写为 CSRF/XSRF

CSRF 攻击简单来说就是：攻击者盗用你的身份，以你的名义恶意发送请求。CSRF 能够做的事情包括：以你的名义发送邮件，发消息，盗取你的账号，甚至于购买商品，虚拟货币转账......造成的问题包括：个人隐私泄露以及财产安全

### CSRF 攻击原理

![csrf](./img/csrf.jpg)

从上图中可以看出，要完成一次 CSRF 攻击，受害者必须依次完成以下两个步骤：

1. 登录受信任网站 A，并在本地生成 Cookie
2. 在不登出 A 的请情况下，访问危险网站 B

CSRF 的攻击类型主要有以下三种：

1. GET 类型的 CSRF
2. POST 类型的 CSRF
3. 链接类型的 CSRF

**GET 类型的 CSRF**

这类攻击很简单，只需要一个 HTTP 请求，如下：

```html
<img src="http://a.com/withdraw?amount=10000&for=hacker" >
```

当受害者访问包含有这个 img 标签的网站时，浏览器会自动向 a.com 发送一次 HTTP 请求，同时，因为受害者已经登录 a.com 这个网站了，因此浏览器还会携带这个 Cookie 信息。而对于服务器来说，它并不知道这个请求是用户主动发送的，还是被动发送的，它只知道这个请求中携带了有效的 Cookie，因此就正常处理

**POST 类型的 CSRF**

这种类型的 CSRF 通常使用一个自动提交的表单，如：

```html
<form action="http://a.com/withdraw" method=POST>
    <input type="hidden" name="account" value="airing" />
    <input type="hidden" name="amount" value="10000" />
    <input type="hidden" name="for" value="hacker" />
</form>
<script> document.forms[0].submit(); </script> 
```

同样的，当用户访问这个页面的时候，表单会自动提交，浏览器同样没法区别

**链接类型的 CSRF**

链接类型的 CSRF 攻击其实就是一个带有指定域名的 a 标签，当用户点击的时候，就会发送这个 HTTP 请求，如下：

```html
<a href="http://a.com/withdraw.php?amount=1000&for=hacker" taget="_blank">
    屠龙宝刀，点击就送！
</a>
```

### CSRF 防御方法

从上面的 CSRF 的攻击方式中我们可以知道，CSRF 的攻击本质上就是利用 Cookie 信息，这里需要注意一点：CSRF 攻击只是间接利用了 Cookie 信息，它是没法主动读取这个 Cookie 信息的，因为跨域下 Cookie 是读取不到的。而服务器只根据 Cookie 来判断用户操作也是 CSRF 能攻击的根源。

针对上述的两个特点，CSRF 的防御可制定以下两种防御策略：

1. 自动防御：阻止不明外域的访问
    * 同源检测
    * Samesite Cookie
2. 主动防御：提交表单时要求附加本域才能获取的信息
    * Synchrogazer Tokens
    * Double Cookie Defense
    * Custom Header

#### 同源检测

在 HTTP 协议中，每一个异步请求都会携带两个 Header，用来标记来源域名：

* Origin Header
* Referer Header

通过验证这两个 Header 是否受信任从而实现同源检测。但这种方法并不靠谱，因为攻击者可以隐藏甚至修改这两个字段

#### Samesite Cookie

为了从源头上解决这个问题，Google 起草了一份草案 来改进 HTTP 协议，那就是为 Set-Cookie 响应头新增 Samesite 属性，它用来标明这个 cookie 是个“同站 cookie”，同站 cookie 只能作为第一方 cookie，不能作为第三方 cookie。SameSite 有两个属性值，分别是 Strict 和 Lax。

* Samesite=Strict：严格模式，表明这个 cookie 在任何情况下都不可能作为第三方 cookie，绝无例外
* Samesite=Lax：宽松模式，比 Strict 放宽了点限制。假如这个请求是同步请求（改变了当前页面或者打开了新页面）且同时是个 GET 请求，则这个 cookie 可以作为第三方 cookie

但是 Samesite Cookie 存在着一些问题：

* Samesite 兼容性不好，现阶段除了最新版 Chrome 和 Firefox 支持外，其他还不支持
* Samesite 不支持子域。这样的话，当访问每个子域名时，用户都要重新登录

#### Synchrogazer Token

即同步表单的 CSRF 校验。服务器可以要求所有用户在提交表单的时候携带一个 CSRF 攻击者无法获取到的 Token，这样的话，在后续用户请求的时候，服务器通过校验请求中是否携带正确的 Token 来判断是否合法。具体分为以下三个步骤：

1. 将 CSRF Token 输出到页面中
2. 页面提交的请求携带这个 Token，通常隐藏在表单域中作为参数提交，或拼接在 URL 后作为 query 提交
3. 服务器验证 Token 是否正确

当用户从客户端得到了 Token，再次提交给服务器的时候，服务器需要判断 Token 的有效性，验证过程是先解密 Token，对比加密字符串以及时间戳，如果加密字符串一致且时间未过期，那么这个 Token 就是有效的

这种 Token 的值通常是使用 UserID、时间戳和随机数，通过加密的方法生成。这样的加密既能验证请求的用户、请求的时间，又能保证 Token 不容易被破解

这种方法要比之前检查 Referer 或者 Origin 要安全一些，Token 可以在产生并放于 Session 之中，然后在每次请求时把 Token 从 Session 中拿出，与请求中的 Token 进行比对

#### Double Cookie Defense

双重 Cookie 验证，我们可以利用 CSRF 不能获取用户 Cookie 的特点，在提交表单的时候携带一个 Cookie 值

此方法相对于 CSRF Token 就简单了许多。可以直接通过前后端拦截的的方法自动化实现。后端校验也更加方便，只需进行请求中字段的对比，而不需要再进行查询和存储 Token

但是它并没有被大规模应用，尤其在大型网站上，存在着严重的缺陷。举一个栗子🌰：

由于任何跨域都会导致前端无法获取 Cookie 中的字段（包括子域名之间），所以当用户访问我的 me.ursb.me 之时，由于我的后端 api 部署在 api.ursb.me 上，那么在 me.ursb.me 用户拿不到 api.ursb.me 的 Cookie，也就无法完成双重 Cookie 验证

因此，我们的 Cookie 放在了 ursb.me 主域名下，以保证每个子域名都可以访问。但 ursb.me 下其实我还部署了很多其他的子应用，如果某个子域名 xxx.ursb.me 存在漏洞，虽然这个 xxx.ursb.me 可能没有什么值得窃取的信息，但是攻击者可以修改 ursb.me 下的 Cookie，从而实现 XSS 攻击，并利用篡改的 Cookie 对 me.ursb.me 发起 CSRF 攻击

同时，为了确保 Cookie 传输安全，采用这种防御方式的最好确保用整站 HTTPS 的方式，如果还没切 HTTPS 的使用这种方式会有风险

## XSS

## 参考资料

1. [前端安全系列 | CSRF](https://juejin.im/post/5d6945f3f265da03ab4264b8)

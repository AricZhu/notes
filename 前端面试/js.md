# js 类型问题归类

1、 多次 bind 后只会返回第一次的 bind 值，如下：

```js
let [one, two, three] = [{x: 1}, {x: 2}, {x: 3}]
let f = function () {return this.x}
f.bind(one).bind(two).bind(three)() // 输出 1，而不是 2 或者 3
```

一个 bind 的简单实现如下：(参考自 MDN)

```js
// Does not work with `new funcA.bind(thisArg, args)`
if (!Function.prototype.bind) (function(){
  var slice = Array.prototype.slice;
  Function.prototype.bind = function() {
    var thatFunc = this, thatArg = arguments[0];
    var args = slice.call(arguments, 1);
    if (typeof thatFunc !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - ' +
             'what is trying to be bound is not callable');
    }
    return function(){
      var funcArgs = args.concat(slice.call(arguments))
      return thatFunc.apply(thatArg, funcArgs);
    };
  };
})()
```

原因：
从上述实现上我们可以看到 bind() 的实现，相当于使用函数在内部包了一个 call / apply ，第二次 bind() 相当于再包住第一次 bind() ,故第二次以后的 bind 是无法生效的。

2、原码，补码，反码

[1](https://www.cnblogs.com/zhangziqiu/archive/2011/03/30/computercode.html)

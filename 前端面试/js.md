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

补充：js 中 call 的实现

[js中call方法的实现](https://segmentfault.com/q/1010000009688328)

首先说明在 js 中，call 方法的作用：改变函数运行时的 this 指向。例子如下：

```js
function foo () {
  console.log(this.x)
}
foo.call({x: 'one'}) // one
foo.call({x: 'two'}) // two
```

call 的实现原理其实很简单，就是将调用的函数作为一个引用地址传递给对象，然后调用对象中的这个函数，这样的话，函数中的this 自然就指向了这个对象了。（需要注意的是函数的参数，这里涉及到了数组和字符串的隐式变换）

```js
Function.prototype.call2 = function (context) {
  context.fn = this // 因为函数也是对象，所以这里的 this 就是指函数本身
  let args = []
  for (let i = 1; i < arguments.length; i++) {
    args.push('arguments[' + i + ']') // args = ['arguments[1]', 'arguments[2]', 'arguments[3]', ...]
  }
  let ret = eval('contextfn(' + args + ')') // 这里面用到了数组和字符串的隐式转换, '(' + ['a', 'b' + ')' = '(a, b)'
  delete context.fn
  return ret
}
```

补充2: js 中 apply 的实现

apply 的实现和 call 基本一样，不同的就是 apply 接收的参数是数组形式

```js
Function.prototype.apply = function (context, arr) {
    var context = Object(context) || window;
    context.fn = this;

    var result;
    if (!arr) {
        result = context.fn();
    }
    else {
        var args = [];
        for (var i = 0, len = arr.length; i < len; i++) {
            args.push('arr[' + i + ']');
        }
        result = eval('context.fn(' + args + ')')
    }

    delete context.fn
    return result;
}
```

[实现 call()、apply() 和 bind() 方法](https://juejin.im/post/5cb3f7006fb9a068ac3df2c9)

2、原码，补码，反码

[1](https://www.cnblogs.com/zhangziqiu/archive/2011/03/30/computercode.html)

# js 前端面试题集锦 1

## 1、apply, call, bind

多次 bind 后只会返回第一次的 bind 值，如下：(完整例子请看 1-multi-bind.html)

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
    // 匿名函数
    return function(){
      var funcArgs = args.concat(slice.call(arguments))
      return thatFunc.apply(thatArg, funcArgs);
    };
  };
})()
```

**原因**：

虽然上述例子中调用了三次 bind，确实将原先函数的this作用域从 {x: 1} 改成 {x: 2}, 最后又变成 {x: 3}，但是当调用函数的时候，调用的是匿名函数，而匿名函数中又是调用的 thatFunc, 这个thatFunc 就是闭包中的前一个调用对象，也就是第二个 bind 后的匿名函数，同样的，在执行第二个 bind 后的匿名函数时，thatFunc 就是第一个bind的匿名函数。

又因为返回的匿名函数中并没有 this，所以前面的 apply 并没有效果(从第三个匿名函数到第二个匿名函数再到第一个匿名函数)，所以最后再运行第一个匿名函数的时候，thatFunc 就是第一次bind时闭包中的f， thatArg 就是闭包中保存的one。这里需要注意的是，funcArgs 由于闭包作用，它现在的值是 [1, 2, 3]

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

## 2、原码，补码，反码

首先我们需要了解 “机器数” 和 “真值” 的概念。众所周知，计算机是使用二进制来表示存储数据的。所以 “机器数” 就是这个数的二进制表示。当然，“机器数” 是可以表示负数的，在计算机中约定最高位为0则表示正数，最高位为1则表示负数，例如一个8位二进制数：00000001 表示1，10000001 表示-1

因为上面机器数的最高位是符号位，所以机器数的形式不能代表它的实际大小，还需要考虑最高位。因此，“真值” 的概念就出现了: 带符号位的机器数的真正数值，就是真值。例: 0000 0001的真值 = +000 0001 = +1，1000 0001的真值 = –000 0001 = –1

原码、补码、反码是机器存储数字的不同编码方式。

**原码**: 符号位加上真值的绝对值。其实也就是机器数。这也是最直观人脑最能理解的编码方式。

```text
[+1]原 = 00000001
[-1]原 = 10000001
```

所以原码的取值范围就是 [11111111, 011111111]，也就是 [-127, 127]

**反码**: 正数的反码是本身，负数的反码符号为不变，其余位取反

```text
[+1] = [00000001]原 = [00000001]反
[-1] = [10000001]原 = [11111110]反
```

**补码**: 正数的补码是本身，负数的补码符号为不变，其余位取反并加1。同时在补码中规定 100000000 为 -128

```text
[+1] = [00000001]原 = [00000001]补
[-1] = [10000001]原 = [11111111]补
```

**为何需要使用 原码、反码、补码**:

由上面的概念，我们知道了对于正数而言，它的三种编码都是一样的，但对于负数，反码和补码的方式并不直观，所以又为什么要保留这两种编码方式呢？

原因就在于提高基础计算的性能以及降低电路逻辑复杂度。首先，对于我们人脑来说，可以根据运算符来判断什么时候用加法，什么时候用减法, 当然对于计算机也可以这样判断，但势必就造成了电路逻辑复杂，试想一下，如果每次计算机在做运算前都要首先判断一下是用加法还是减法，那这个速度就慢了很多了。而且这个加减法是计算机底层操作，一旦它慢了，整个上层应用都会受到影响。

于是乎人们就开始探索将符号位也参与运算，这样就会只保留加法运算，不需要减法了。

首先来看下原码的表现：

```text
计算十进制的表达式: 1-1=0

1 - 1 = 1 + (-1) = [00000001]原 + [10000001]原 = [10000010]原 = -2
```

如果用原码表示, 让符号位也参与计算, 显然对于减法来说, 结果是不正确的.这也就是为何计算机内部不使用原码表示一个数.

为了解决原码的减法问题，出现了反码：

```text
计算十进制的表达式: 1-1=0

1 - 1 = 1 + (-1) = [00000001]原 + [10000001]原 = [00000001]反 + [11111110]反 = [11111111]反 = [10000000]原= -0
```

从上面结果看，使用反码是正确的，但是却出现了-0这个表示，虽然 +0 和 -0 理解上是一样的，但却有瑕疵，而且为后续处理也带来了一定的麻烦，会有 [00000000]原 和 [10000000]原两个编码表示0

于是乎，补码出现了，解决了0的问题以及两个编码的问题：

```text
1 - 1 = 1 + (-1) = [00000001]原 + [10000001]原 = [00000001]补 + [11111111]补 = [00000000]补 = [00000000]原码 = 0
```

这样0用[0000 0000]表示, 而以前出现问题的-0则不存在了.而且可以用[1000 0000]表示-128:

```text
(-1) + (-127) = [10000001]原 + [11111111]原 = [11111111]补 + [10000001]补 = [10000000]补 = -128
```

-1 - 127 的结果应该是 -128，在用补码的运算中，[1000 0000]补 就是 -128。但这里需要注意，实际上就是使用以前的 -0 的补码来表示 -128，所以 -128 并没有对应的原码和反码的表示。

使用了补码不仅修复了0的符号，还解决了存在两个0的问题，而且还能表示一个最低数，这就是为什么8位二进制数，使用原码或反码能表示的范围是 [-127, 127], 而使用补码能表示的范围是 [-128, 127]

因为机器使用补码形式，所以对于编程中常用到的 32 位 int 类型，可以表示的范围是: [-2^31, 2^31 - 1], 因为第一位表示的是符号位，同时补码又可以多保存一个最小值。

[原码、补码、反码 详解](https://www.cnblogs.com/zhangziqiu/archive/2011/03/30/computercode.html)

## 3、事件委托

事件委托简单来讲就是把一个元素响应事件的函数委托给另一个元素。一般会把一组元素的事件委托给它的父级元素上，从而达到节省资源的目的。(一般都是利用事件冒泡的特性)

[JavaScript 事件委托详解](https://zhuanlan.zhihu.com/p/26536815)

## 4、正则

//**TODO**

```js
// 将普通的正数千位加 ',', 比如 123456789 转换成 123,456,789
// 将带小数的值千位加 ',', 比如 153812.7 转换成 153,812.7
```

[JS正则表达式匹配货币数字](http://c.biancheng.net/view/5648.html)

## 5、手动实现 Promise.all 和 Promise.race

首先我们看下 Promise.all 的定义：该方法用于将多个 Promise 实例包装成一个新的 Promise 实例。用法如下：

```const p = Promise.all([p1, p2, p3])```

上面代码中，Promise.all 方法接受一个数组(或者可迭代对象)，p1, p2, p3 都是 Promise 实例，如果不是，则先用 Promise.resolve 方法转成 Promise 实例。 p 的状态由 p1, p2, p3 决定，分两种情况：

* 只有 p1, p2, p3 的状态都 fulfilled, p 的状态才会 fulfilled, 此时 p1, p2, p3 的值组成一个数组传递给 p 的回调函数
* 只要 p1, p2, p3 中有一个 rejected，p 的状态就会 rejected，此时第一个被 rejected 的实例的返回值传递个 p 的 rejected 的回调函数

注意：如果参数中的 Promise 实例自己实现了 catch 方法，那么它被 rejected 后是不会触发 Promise.all() 的 catch 方法。

```js
// Promise.all 的实现
function promiseAll (promises) {
  return new Promise((resolve, reject) => {
    promises = Array.from(promises)
    let len = promises.length
    let args = []
    let count = 0

    promises.forEach((el, idx) => {
      el.then(val => {
        args[idx] = val
        count++
        if (count === len) {
          return resolve(args)
        }
      }).catch(err => reject(err))
    })
  })
}
```

我们看下 Promise.race 的定义：同样是将多个 Promise 实例包装成一个新的 Promise 实例，不同的是，只要有一个实例率先改变状态，它的状态就跟着改变。

它的实现较简单，这里就省略了。

## 算法题

**1**: 给定一个数组，形如 [1, 1, 2 , 3, 3, 3, 3, 4, 6, 6]，给定一个数 n，例如 3，找出给定的数 n 在数组内出现的次数，要求时间复杂度小于 O(n)

```js
// 用递归寻找 左右边界，然后求出元素个数，时间复杂度为 O(logn)
function getBothBound (arr, left, right, val) {
    if (left > right || arr[left] > val || arr[right] < val) {
        return [-1, -1]
    }
    let mid = Math.floor((left + right) / 2)
    if (arr[mid] < val) {
        return getBothBound(arr, mid + 1, right, val)
    } else if (arr[mid] > val) {
        return getBothBound(arr, left, mid - 1 , val)
    } else {
        return [getLeftBound(arr, left, mid, val), getRightBound(arr, mid, right, val)]
    }
}

function getLeftBound (arr, left, mid, val) {
    if (arr[left] === val) {
        return left
    }
    let _mid = Math.floor((left + mid) / 2)
    if (arr[_mid] < val) {
        return getLeftBound(arr, _mid + 1, mid, val)
    } else if (arr[_mid] === val) {
        return getLeftBound(arr, left, _mid, val)
    } else {
        return -1
    }
}

function getRightBound (arr, mid, right, val) {
    if (arr[right] === val) {
        return right
    }
    let _mid = Math.floor((mid + right) / 2)
    if (arr[_mid] > val) {
        return getRightBound(arr, mid, _mid - 1, val)
    } else if (arr[_mid] === val) {
        return getRightBound(arr, _mid, right, val)
    } else {
        return -1
    }
}

function main () {
    let arr = [1, 1, 2, 3, 3, 3, 3, 4, 6, 6]
    let val = 6
    let [left, right] = getBothBound(arr, 0, arr.length - 1, val)
    let count = (left !== -1 && right !== -1) ? (right - left + 1) : 0
    console.log(`count of ${val} is: ${count}`)
}

main()
```

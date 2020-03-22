# Promise / async / Generator 实现原理

## Promise 的实现

### Promise.all 和 Promise.race 的实现

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

它的实现较简单，此处省略

## 参考资料

1. [Promise / async / Generator 实现&原理大解析（附源码）| 9k字](https://juejin.im/post/5e3b9ae26fb9a07ca714a5cc)

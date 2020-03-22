# js 前端面试题集锦 1

## 1、apply, call, bind

多次 bind 后只会返回第一次的 bind 值，如下：(完整例子请看 1-multi-bind.html)

```js
let [one, two, three] = [{x: 1}, {x: 2}, {x: 3}]
let f = function () {return this.x}
f.bind(one).bind(two).bind(three)() // 输出 1，而不是 2 或者 3
```

一个 bind 的简单实现如下：(参考自 MDN)

**原因**：

bind 的实现可以参照 JS/call_apply_bind.md 文档

虽然上述例子中调用了三次 bind，确实将原先函数的this作用域从 {x: 1} 改成 {x: 2}, 最后又变成 {x: 3}，但是当调用函数的时候，调用的是匿名函数，而匿名函数中又是调用的 thatFunc, 这个thatFunc 就是闭包中的前一个调用对象，也就是第二个 bind 后的匿名函数，同样的，在执行第二个 bind 后的匿名函数时，thatFunc 就是第一个bind的匿名函数。

又因为返回的匿名函数中并没有 this，所以前面的 apply 并没有效果(从第三个匿名函数到第二个匿名函数再到第一个匿名函数)，所以最后再运行第一个匿名函数的时候，thatFunc 就是第一次bind时闭包中的f， thatArg 就是闭包中保存的one。这里需要注意的是，funcArgs 由于闭包作用，它现在的值是 [1, 2, 3]

## 2、原码，补码，反码

见 Computer/code.md 文档

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

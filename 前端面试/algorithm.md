# 算法题

## 1 给定一个数组，形如 [1, 1, 2 , 3, 3, 3, 3, 4, 6, 6]，给定一个数 n，例如 3，找出给定的数 n 在数组内出现的次数，要求时间复杂度小于 O(n)

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

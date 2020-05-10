// compose(f, g, h) => (...args) => f(g(h(...args)))
const compose = (...fns) => {
  return fns.reduce(
    (acc, cur) => {
      return (...args) => acc(cur(...args))
    }
  )
}

// ['john-reese', 'harold-finch', 'sameen-shaw'] 
// 转换成 [{name: 'John Reese'}, {name: 'Harold Finch'}, {name: 'Sameen Shaw'}]

// 实现 add(1)(2)(3)(4)(5).valueOf(), 实现这么一个 add 函数，返回 15

const add = x => {
  let sum = x
  const temp = y => {
    sum = sum + y
    return temp
  }
  temp.valueOf = () => sum
  return temp
}

console.log(add(1)(2)(3)(4)(5).valueOf())

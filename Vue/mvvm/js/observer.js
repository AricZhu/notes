function observe (data) {
  if (!data || typeof data !== 'object') {
    return
  }
  Object.keys(data).forEach(key => defineReactive(data, key, data[key]))
}

function defineReactive (obj, key, val) {
  observe(val)
  let dep = new Dep()
  Object.defineProperty(obj, key, {
    configurable: false,
    enumerable: true,
    get () {
      // 通过 Dep.target 来传递订阅者
      Dep.target && dep.addSub(Dep.target)
      return val
    },
    set (newVal) {
      if (newVal === val) {
        return
      }
      val = newVal
      observe(newVal)
      // 数据更新的时候通知订阅者
      dep.notify()
    }
  })
}

class Dep {
  static target = null
  constructor () {
    this.subs = []
  }
  addSub (sub) {
    this.subs.push(sub) 
  }
  notify () {
    this.subs.forEach(sub => sub.update())
  }
}

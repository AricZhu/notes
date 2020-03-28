class Watcher {
  constructor (vm, exp, cb) {
    this.vm = vm
    this.exp = exp
    this.cb = cb
    this.getVal()
  }
  getVal () {
    Dep.target = this
    let val = this.vm[this.exp]
    Dep.target = null
    return val
  }
  update () {
    this.cb && this.cb()
  }
}

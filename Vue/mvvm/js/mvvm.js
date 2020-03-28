class MVVM {
  constructor (options) {
    this.$options = options
    this.$data = options.data
    // 数据代理，对 this.prop 的访问能够实际返回 this.$data.prop
    this._proxy(this.$data)
    observe(this.$data)
    compile(this, this.$options.el)
  }
  _proxy (data) {
    Object.keys(data).forEach(key => Object.defineProperty(this, key, {
      configurable: false,
      enumerable: true,
      get () {
        return this.$data[key]
      },
      set (newVal) {
        this.$data[key] = newVal
      }
    }))
  }
}

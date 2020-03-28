// parse html
function compile (vm, el) {
  let dom = document.querySelector(el)
  if (!dom) {
    console.error(`invalid css selector: ${el}`)
    return
  }
  parseHTML(dom, vm)
}

function parseHTML (dom, vm) {
  dom.childNodes.forEach(node => {
    if (compileUtil.isTextNode(node)) {
      let text = node.textContent
      let reg = /{{\s*(\w*)\s*}}/
      let exp = reg.test(text) ? text.match(reg)[1] : ''
      compileUtil.bindTextNode(node, vm, exp)
    } else if (compileUtil.isElementNode(node)) {
      compileUtil.bindElementNode(node, vm)
      node.childNodes.length && parseHTML(node, vm)
    }
  })
}

const compileUtil = {
  isTextNode (node) {
    return node.nodeType === 3
  },
  isElementNode (node) {
    return node.nodeType === 1
  },
  bindTextNode (node, vm, exp) {
    if (!exp) {
      return
    }
    this.updateTextNodeFn(node, vm[exp])
    // bind vm.exp && node update by watcher
    new Watcher(vm, exp, () => this.updateTextNodeFn(node, vm[exp]))
  },
  bindElementNode (node, vm) {
    let attrs = node.attributes
    Array.from(attrs).forEach(attr => {
      let vs = attr.name.split(':')
      switch (vs[0]) {
        case 'v-bind':
          this.updateAttrNodeFn(node, vs[1], vm[attr.value])
          new Watcher(vm, attr.value, () => this.updateAttrNodeFn(node, vs[1], vm[attr.value]))
          break
        case 'v-html':
          this.updateHtmlNodeFn(node, vm[attr.value])
          new Watcher(vm, attr.value, () => this.updateHtmlNodeFn(node, vm[attr.value]))
          break
        case 'v-on':
          this.eventHandler(node, vm, vs[1], vm.$options.methods[attr.value])
          break
        default:
          break
      }
    })
  },
  updateTextNodeFn (node, val) {
    node.textContent = val
  },
  updateAttrNodeFn (node, attr, val) {
    node.setAttribute(attr, val)
  },
  updateHtmlNodeFn (node, innerHtml) {
    node.innerHTML = innerHtml
  },
  eventHandler (node, vm, eventType, fn) {
    node.addEventListener(eventType, fn.bind(vm), false)
  }
}

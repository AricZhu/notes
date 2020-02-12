const fs = require("fs")
const wasm = new WebAssembly.Module(fs.readFileSync(__dirname + "/dist/module.optimized.wasm"), {})

const importObject = {
    env: {
        'memoryBase': 0,
        'tableBase': 0,
        'memory': new WebAssembly.Memory({initial: 256}),
        'table': new WebAssembly.Table({initial: 256, element: 'anyfunc'}),
        abort: function () {},
    }
}

module.exports = new WebAssembly.Instance(wasm, importObject).exports

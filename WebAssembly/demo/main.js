import('./dist/module.optimized.wasm').then(module => {
    const container = document.createElement('div')
    container.innerText = 'fibonacci(10) is: ' + module.fabonacci(10)
    document.body.appendChild(container)
})

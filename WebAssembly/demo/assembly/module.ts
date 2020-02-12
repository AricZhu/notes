export function fibonacci (x: i32): i32 {
    if (x === 1 || x === 2) {
        return 1
    }
    return fibonacci(x - 1) + fibonacci(x - 2)
}

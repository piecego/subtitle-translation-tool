import readline from 'readline'

export function singleOutput(message: string) {
  process.stdout.write(message)
}

export function clear(dir: 0 | -1 | 1 = 0) {
  readline.clearLine(process.stdout, dir)
}
export function clearLine() {
  readline.moveCursor(process.stdout, 0, 0)
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0)
}
export function move(x: number, y: number = 0) {
  readline.moveCursor(process.stdout, x, y)
}

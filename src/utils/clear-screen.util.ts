import readline from 'readline'

export function clearScreen() {
  for (let i = 0; i < process.stdout.rows; i++) {
    readline.cursorTo(process.stdout, 0, i)
    readline.clearLine(process.stdout, 0)
  }
  readline.cursorTo(process.stdout, 0, 0)
  process.stdout.write('\x1b[3J')
}

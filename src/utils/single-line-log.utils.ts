import readline from 'readline'
import readLine from "readline"

export function singleOutput(message: string) {
  process.stdout.write(message)
}

export function progress(num: number, pad: number = 0) {
  const columns = process.stdout.columns - 8 - pad
  const pr = Math.floor((columns / 100) * num)
  const v = `▮`.repeat(pr)
  const s = ' '.repeat(Math.max(0, columns - pr))
  singleOutput(`▮${v}${s}▮  ${num.toString().padStart(2, '0')}%\n`)
  return columns
}

export function clear(dir: 0 | -1 | 1 = 0) {
  readline.clearLine(process.stdout, dir)
}
export function clearLine() {
  readLine.moveCursor(process.stdout, 0, 0)
  readline.clearLine(process.stdout, 0)
  readLine.cursorTo(process.stdout, 0)
}
export function move(x: number, y: number = 0) {
  readline.moveCursor(process.stdout, x, y)
}

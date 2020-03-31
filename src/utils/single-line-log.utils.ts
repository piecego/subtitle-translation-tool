import readline from 'readline'
import stringWidth from 'string-width'
import { wait } from './timer.utils'

export function singleOutput(message: string) {
  process.stdout.write(message)
}

export function progress(num: number, pad: number = 0) {
  const columns = process.stdout.columns - 8 - pad
  const pr = Math.floor((columns / 100) * num)
  const v = `▮`.repeat(pr)
  const s = ' '.repeat(Math.max(0, columns - pr))
  return `▮${v}${s}▮  ${num.toString().padStart(2, '0')}%`
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

interface MultilineCache {
  line: number
  length: number
  message: string
}

export class Multiline {
  static timer: NodeJS.Timeout | null = null
  static cache: Map<string, MultilineCache> = new Map()
  static line = -1
  static async track(message: string, id: string) {
    if (this.cache.has(id)) {
      const data = this.cache.get(id) as MultilineCache
      this.cache.set(id, {
        length: stringWidth(message),
        message,
        line: data.line,
      })
      // console.log(`Refresh: ${this.line - data.line} # ${id}`)
      await this.render()
    } else {
      this.line += 1
      const line = this.line
      this.cache.set(id, {
        length: stringWidth(message),
        message: message,
        line,
      })
      // console.log(`Add: ${0} # ${id}`)
      // 移动到下一行
      // 移动光标无法让终端滚动，因此只能打印
      // \r 移动到当前行的开头
      // \n 移动到下一行的开头
      // \b 光标移动到前一个字符
      // \t 使光标移动到下一个制表符
      // this.line > 0 && move(0,1)
      this.line > 0 && process.stdout.write('\n')
      await this.render()
    }
  }
  static clearLine() {
    if (process.stdout.columns > 0) {
      process.stdout.write(`\r${' '.repeat(process.stdout.columns - 1)}`)
    }
    process.stdout.write('\r')
  }
  static async writeOnNthLine(n: number, message: string) {
    // console.log(n)
    if (n === 0) {
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(message)
      readline.clearLine(process.stdout, 1)
      return void 0
    }
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -n)
    process.stdout.write(message)
    readline.clearLine(process.stdout, 1)
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, n)
  }
  static async clearNthLine(n: number) {
    if (n === 0) {
      clearLine()
      return void 0
    }
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -n)
    readline.clearLine(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, n)
  }
  static async render() {
    for (let data of Array.from(this.cache.values())) {
      await this.writeOnNthLine(this.line - data.line, data.message)
    }
  }
  static end() {
    this.timer && clearTimeout(this.timer)
    this.timer = null
    this.line = -1
    this.cache.clear()
    process.stdout.write('\n')
  }
}

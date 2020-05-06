import readline from 'readline'
import stringWidth from 'string-width'

export function singleOutput(message: string) {
  process.stdout.write(message)
}

export function progress(p: number, pad: number = 0) {
  p = Math.min(100, p)
  const columns = process.stdout.columns - 9 - pad
  const pr = Math.floor((columns / 100) * p)
  const v = `▮`.repeat(pr)
  const s = ' '.repeat(Math.max(0, columns - pr))
  return `▮${v}${s}▮  ${p.toString().padStart(2, '0')}%`
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

enum Direction {
  clearLeft = -1,
  clearAll,
  clearRight,
}

interface MultilineCache {
  // 日子ID
  id: Symbol
  // 日志位置(即行数), 值越小越靠近底部
  index: number
  // 内容长度
  length: number
  message: string
  // 占用行数
  line: number
  // 已经渲染
  rendered: boolean
  // 日志时间，用于排序
  time: number
}

export class Multiline {
  // 日志缓存
  private static cache: Map<Symbol, MultilineCache> = new Map()
  // 占用位置
  private static index = -1
  private static inUsing = false
  constructor(private readonly id: Symbol) {}
  // 输出信息
  async track(message: string) {
    const newline = message.match(/\n/g)?.length
    const line = newline ? newline + 1 : 1
    if (Multiline.cache.has(this.id)) {
      const data = Multiline.cache.get(this.id) as MultilineCache
      Multiline.cache.set(this.id, {
        id: this.id,
        length: stringWidth(message),
        message,
        index: data.index,
        line,
        rendered: data.rendered,
        time: Date.now(),
      })
      // 处理内容占用行数变动
      if (line !== data.line) {
        const diff = data.line - line
        if (diff > 0) {
          for (const l of Array.from({ length: diff }).keys()) {
            await this.clearNthLine(Multiline.index - data.index + l - 1)
          }
          for (let i of Array.from({ length: diff })) {
            await this.clearLine()
            readline.moveCursor(process.stdout, 0, -1)
          }
        } else {
        //  增加
        }
        for (const v of Multiline.cache.values()) {
          if (v.index > data.index) {
            v.index -= diff
          }
        }
        Multiline.index -= diff
      }
      // console.log(`Refresh: ${this.line - data.line} # ${id}`)
      await this.render()
    } else {
      const index = Multiline.index + 1
      Multiline.index += line
      Multiline.cache.set(this.id, {
        id: this.id,
        length: stringWidth(message),
        message: message,
        index,
        line,
        rendered: false,
        time: Date.now(),
      })
      // console.log(`Add: ${0} # ${id}`)
      // 移动到下一行
      // 移动光标无法让终端滚动，因此只能打印
      // \r 移动到当前行的开头
      // \n 移动到下一行的开头
      // \b 光标移动到前一个字符
      // \t 使光标移动到下一个制表符
      // this.line > 0 && move(0,1)
      // 仅为给每行占用空间，多好自带换行符占用，所以无需更改
      index > 0 && process.stdout.write('\n')
      await this.render()
    }
  }
  static create(description = 'Multiline ID') {
    return new Multiline(Symbol(description))
  }
  clearLine() {
    if (process.stdout.columns > 0) {
      process.stdout.write(`\r${' '.repeat(process.stdout.columns - 1)}`)
    }
    process.stdout.write('\r')
  }
  async writeOnNthLine(n: number, message: string) {
    // console.log(n)
    if (n === 0) {
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(message)
      // readline.clearLine(process.stdout, Direction.clearRight)
      return void 0
    }
    readline.cursorTo(process.stdout, 0)
    // 移动到需要修改的行
    readline.moveCursor(process.stdout, 0, -n)
    process.stdout.write(message)
    // 当n=0一般都为第一次渲染，不需要进行多行清除
    if (message.includes('\n')) {
      const lines = message.split('\n')
      readline.moveCursor(process.stdout, 0, -(lines.length - 1))
      for (const line of lines) {
        const len = stringWidth(line)
        readline.cursorTo(process.stdout, len)
        readline.clearLine(process.stdout, Direction.clearRight)
        // await wait(3000)
        readline.moveCursor(process.stdout, 0, 1)
      }
      // 当循环结束就没有新的行了，需要回到之前所在行
      // await wait(3000)
      readline.moveCursor(process.stdout, 0, -lines.length)
    } else {
      readline.clearLine(process.stdout, Direction.clearRight)
    }
    // 回到最底部
    readline.moveCursor(process.stdout, 0, n)
    n < 0 && readline.cursorTo(process.stdout, 0)
  }
  sort(a: MultilineCache, b: MultilineCache) {
    if (!a.rendered) {
      if (!b.rendered) {
        return a.time > b.time ? 1 : a.time < b.time ? -1 : 0
      }
      return -1
    }
    return a.time > b.time ? 1 : a.time < b.time ? -1 : 0
  }
  async clearNthLine(n: number) {
    if (n === 0) {
      clearLine()
      return void 0
    }
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -n)
    readline.clearLine(process.stdout, Direction.clearAll)
    readline.moveCursor(process.stdout, 0, n)
  }
  async render() {
    for (let data of Array.from(Multiline.cache.values()).sort(this.sort)) {
      // 本身占用一行，所以总共占用行数减一
      const index = Multiline.index - data.index - (data.line - 1)
      if (data.rendered) {
        // console.log(data, index + data.line - 1)
        // console.log(`Again render => ID: ${data.id} => INDEX: ${index + data.line - 1}`)
        // await wait(3000)
        await this.writeOnNthLine(index + data.line - 1, data.message)
      } else {
        // console.log(`First render => ID: ${data.id} => INDEX: ${index}`)
        data.rendered = true
        // console.log(`${data.message} => ${index}`)
        await this.writeOnNthLine(index, data.message)
      }
    }
  }
  // 结束
  static end() {
    Multiline.inUsing = false
    Multiline.index = -1
    Multiline.cache.clear()
    process.stdout.write('\n')
  }
}

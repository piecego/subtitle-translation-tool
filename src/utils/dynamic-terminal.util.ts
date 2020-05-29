import stringWidth from 'string-width'
import readline from 'readline'

enum Direction {
  clearLeft = -1,
  clearAll,
  clearRight,
}

interface LogItem {
  // 日子ID
  id: Symbol
  // 日志结束位置, 值越小越靠近底部，计算开始位置为total - (index + line - 1)， 本身占用一行，所以总共占用行数减一
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

/**
 * terminal dynamic output
 * 终端动态输出
 */
export class DynamicTerminal {
  constructor(private readonly id: Symbol) {}
  // 日志缓存
  protected static cache: Map<Symbol, LogItem> = new Map()
  // 总共行数
  protected static totalLine = -1
  // 输出信息
  public async track(...messages: string[]) {
    const message = messages.length > 1 ? messages.join('\n') : messages[0]
    if (!message) return void 0
    const newline = message.match(/\n/g)?.length
    const line = newline ? newline + 1 : 1
    if (DynamicTerminal.cache.has(this.id)) {
      const data = DynamicTerminal.cache.get(this.id) as LogItem
      DynamicTerminal.cache.set(this.id, {
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
        // 行数减少
        if (diff > 0) {
          // 清理多余的行
          for (const l of Array.from({ length: diff }).keys()) {
            DynamicTerminal.clearNthLine(
              // 参考index属性的说明
              DynamicTerminal.totalLine - (data.index + data.line) + l 
            )
          }
          // 清理最下面空出来的行
          for (let i of Array.from({ length: diff })) {
            await DynamicTerminal.clearLine()
            readline.moveCursor(process.stdout, 0, -1)
          }
        } else {
          //  行数增加
          process.stdout.write('\n'.repeat(Math.abs(diff)))
        }
        // 改变每个数据的位置
        for (const v of DynamicTerminal.cache.values()) {
          if (v.index > data.index) {
            v.index -= diff
          }
        }
        // 更改总行数
        DynamicTerminal.totalLine -= diff
      }
      // console.log(`Refresh: ${this.line - data.line} # ${id}`)
    } else {
      const index = DynamicTerminal.totalLine + 1
      DynamicTerminal.totalLine += line
      DynamicTerminal.cache.set(this.id, {
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
      // 仅给每行占用空间，使用换行符占用，并且光标将自动下移
      index > 0 && process.stdout.write('\n')
    }
    await DynamicTerminal.render()
  }
  // 向最后添加一行
  public push(message: string) {
    const cache = DynamicTerminal.cache.get(this.id)
    if (cache) {
      return this.track(cache.message, message)
    } else {
      return this.track(message)
    }
  }
  // 替换最后一行
  public pop(message: string) {
    const cache = DynamicTerminal.cache.get(this.id)
    if (cache) {
      return this.track(
        cache.message.split('\n').slice(0, -1).join('\n'),
        message
      )
    } else {
      return this.track(message)
    }
  }
  // 想最前添加一行
  public shift(message: string) {
    const cache = DynamicTerminal.cache.get(this.id)
    if (cache) {
      return this.track(message, cache.message)
    } else {
      return this.track(message)
    }
  }
  // 替换最前一行
  public unshift(message: string) {
    const cache = DynamicTerminal.cache.get(this.id)
    if (cache) {
      return this.track(message, cache.message.split('\n').slice(1).join('\n'))
    } else {
      return this.track(message)
    }
  }
  // 从缓存中删除行，并在必要时在其位置插入新的行
  public splice(start: number, deleteCount: number, ...messages: string[]) {
    const cache = DynamicTerminal.cache.get(this.id)
    if (cache) {
      // splice存在副作用
      const lines = cache.message.split('\n')
      lines.splice(start, deleteCount, ...messages)
      return this.track(lines.join('\n'))
    } else {
      return this.track(...messages)
    }
  }
  get length(): number {
    const cache = DynamicTerminal.cache.get(this.id)
    if (cache) return cache.line + 1
    else return 0
  }
  // 创建实例
  public static create(description = 'Multiline ID') {
    return new DynamicTerminal(Symbol(description))
  }
  public static clearPreviousLine() {
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -1)
    readline.clearLine(process.stdout, Direction.clearRight)
  }
  protected static clearLine() {
    if (process.stdout.columns > 0) {
      process.stdout.write(`\r${' '.repeat(process.stdout.columns - 1)}`)
    }
    process.stdout.write('\r')
  }
  protected static writeOnNthLine(n: number, message: string) {
    // console.log(n)
    if (n === 0) {
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(message)
      readline.clearLine(process.stdout, Direction.clearRight)
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
  protected static sort(a: LogItem, b: LogItem) {
    if (!a.rendered) {
      if (!b.rendered) {
        return a.time > b.time ? 1 : a.time < b.time ? -1 : 0
      }
      return -1
    }
    return a.time > b.time ? 1 : a.time < b.time ? -1 : 0
  }
  protected static clearNthLine(n: number) {
    if (n === 0) {
      this.clearLine()
      return void 0
    }
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -n)
    readline.clearLine(process.stdout, Direction.clearAll)
    readline.moveCursor(process.stdout, 0, n)
  }
  protected static async render() {
    for (let data of Array.from(DynamicTerminal.cache.values()).sort(
      DynamicTerminal.sort
    )) {
      const index = DynamicTerminal.totalLine - (data.index + data.line - 1)
      if (data.rendered) {
        // console.log(data, index + data.line - 1)
        // console.log(`Again render => ID: ${data.id} => INDEX: ${index + data.line - 1}`)
        // await wait(3000)
        await DynamicTerminal.writeOnNthLine(
          index + data.line - 1,
          data.message
        )
      } else {
        // console.log(`First render => ID: ${data.id} => INDEX: ${index}`)
        data.rendered = true
        // console.log(`${data.message} => ${index}`)
        await DynamicTerminal.writeOnNthLine(index, data.message)
      }
    }
  }
  public static getProgress(p: number, pad: number = 0) {
    p = Math.min(100, p)
    const columns = process.stdout.columns - 9 - pad
    const pr = Math.floor((columns / 100) * p)
    const v = `▮`.repeat(pr)
    const s = ' '.repeat(Math.max(0, columns - pr))
    return `▮${v}${s}▮  ${p.toString().padStart(2, '0')}%`
  }
  // 清空日志缓存并换行
  public static end() {
    DynamicTerminal.totalLine = -1
    DynamicTerminal.cache.clear()
    process.stdout.write('\n')
  }
}
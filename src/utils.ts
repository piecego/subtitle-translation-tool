import chalk from 'chalk'
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const formatColorValue = (v: number): string => {
  return v < 16 ? '0' + v.toString(16) : v.toString(16)
}

export function randomColor(hex: string) {
  let red = Math.floor(Math.random() * 256)
  let green = Math.floor(Math.random() * 256)
  let blue = Math.floor(Math.random() * 256)
  if (hex.length == 4) hex.replace(/(\w)/g, '$1$1')
  const mix = hex
    .slice(1)
    .split('')
    .reduce((p, v, i) => {
      i % 2 === 0 ? p.push(v) : (p[p.length - 1] += v)
      return p
    }, [] as string[])
    .map(v => parseInt(v, 16))
  red = Math.floor((red + mix[0]) / 2)
  green = Math.floor((green + mix[1]) / 2)
  blue = Math.floor((blue + mix[2]) / 2)
  return `#${formatColorValue(red)}${formatColorValue(green)}${formatColorValue(
    blue
  )}`
}

export const createLogger = (name: string, color: string = randomColor('#ffffff')) => {
  const prefix = chalk.hex(color)(name)
  const info = chalk.blue(' ▷ 信息 ')
  const error = chalk.red(' ✖ 错误 ')
  const warn = chalk.hex('#cc4e25')(' ⇨ 警告 ')
  const success = chalk.green(' ✓ 成功 ')
  const debug = chalk.hex('#a01ecc')(' ⇨ 调试 ')
  const trace = chalk.gray(' ⇨ 捕获 ')
  const fatal = chalk.gray(' ✖ 失败 ')
  return {
    info: (...message: string[]) => {
      console.log(`${info} - ${prefix} - ${message.join(' - ')}`)
    },
    error: (...message: string[]) => {
      console.log(`${error} - ${prefix} - ${chalk.red(message.join(' - '))}`)
    },
    success: (...message: string[]) => {
      console.log(
        `${success} - ${prefix} - ${chalk.green(message.join(' - '))}`
      )
    },
    debug: (...message: string[]) => {
      console.log(
        `${debug} - ${prefix} - ${chalk.hex('#a01ecc')(message.join(' - '))}`
      )
    },
    warn: (...message: string[]) => {
      console.log(
        `${warn} - ${prefix} - ${chalk.hex('#cc4e25')(message.join(' - '))}`
      )
    },
    trace: (...message: string[]) => {
      console.log(`${trace} - ${prefix} - ${message.join(' - ')}`)
    },
    fatal: (...message: string[]) => {
      console.log(`${fatal} - ${prefix} - ${chalk.gray(message.join(' - '))}`)
    }
  }
}
export type Logger = ReturnType<typeof createLogger>

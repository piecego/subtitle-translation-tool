import chalk from 'chalk'
import { randomColor } from './color.utils'
export const createLogger = (
  name: string,
  color: string = randomColor('#ffffff')
) => {
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
    getInfo: (...message: string[]) => {
      return `${info} - ${prefix} - ${message.join(' - ')}`
    },
    error: (...message: string[]) => {
      console.log(`${error} - ${prefix} - ${chalk.red(message.join(' - '))}`)
    },
    getError: (...message: string[]) => {
      return `${error} - ${prefix} - ${chalk.red(message.join(' - '))}`
    },
    success: (...message: string[]) => {
      console.log(
        `${success} - ${prefix} - ${chalk.green(message.join(' - '))}`
      )
    },
    getSuccess: (...message: string[]) => {
      return `${success} - ${prefix} - ${chalk.green(message.join(' - '))}`
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
    getWarn: (...message: string[]) => {
      return `${warn} - ${prefix} - ${chalk.hex('#cc4e25')(message.join(' - '))}`
    },
    trace: (...message: string[]) => {
      console.log(`${trace} - ${prefix} - ${message.join(' - ')}`)
    },
    fatal: (...message: string[]) => {
      console.log(`${fatal} - ${prefix} - ${chalk.gray(message.join(' - '))}`)
    },
  }
}
export type Logger = ReturnType<typeof createLogger>

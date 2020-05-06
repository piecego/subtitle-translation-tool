import { wait } from './timer.utils'
import { DynamicTerminal } from './dynamic-terminal.util'
import chalk from 'chalk'

;(async function main() {
  if (process.stdout.columns < 120) {
    process.stdout.write(chalk.red('你的窗口太小了'))
    return void 0
  }
  let stop = false
  await Promise.all(
    Array.from({ length: 4 })
      .map((_, i) => i)
      .map(async (i) => {
        const name = (i + 1).toString().padStart(2, '0')
        const tracker = DynamicTerminal.create(i.toString())
        await tracker.track(`#${i} Program: Test\nInitializing`)
        await wait(Math.floor(300 * Math.random()))
        const now = Date.now()
        if (!stop) {
          let p = 0
          while (p < 100) {
            p += Math.floor(Math.random() * 10)
            await tracker.track(
              chalk.green(
                `#${i} Program: Test \n${DynamicTerminal.getProgress(
                  Math.min(100, p),
                  0
                )}`
              )
            )
            await wait(100)
          }
          p = 0
          while (p < 100) {
            p += Math.floor(Math.random() * 10)
            await tracker.track(
              chalk.yellow(
                `Program: Test-${name}\n${DynamicTerminal.getProgress(
                  Math.min(100, p),
                  0
                )}`
              )
            )
            await wait(30)
          }
        }
        await wait(Math.floor(300 * Math.random()))
        await tracker.track(
          chalk.white(
            `#${i} Program: Test-${name} Completed\nTime: ${Date.now() - now}ms`
          )
        )
      })
  )
  DynamicTerminal.end()
  console.log('喵喵喵')
})()

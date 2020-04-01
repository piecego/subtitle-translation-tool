import { wait } from './utils/timer.utils'
import {
  progress,
  singleOutput,
  clear,
  move,
  Multiline,
} from './utils/single-line-log.utils'
import chalk from 'chalk'
import stringWidth from 'string-width'
import set = Reflect.set
;(async function main() {
  if (process.stdout.columns < 120) {
    process.stdout.write(chalk.red('你的窗口太小了'))
    return void 0
  }
  // process.stdout.on('resize', () => {
  //   console.log('变化')
  // })
  // let out = process.stdout
  // let numOfLinesToClear = 0
  // out.write('1.\n') // prints `1` and new line
  // ++numOfLinesToClear
  // out.write('2.\n')
  // ++numOfLinesToClear
  // out.write('386!=>>>>25\n')
  // ++numOfLinesToClear
  // out.write('end\n')
  // ++numOfLinesToClear
  // // process.stdout.moveCursor(3, -1)
  // // process.stdout.cursorTo(3)
  // setTimeout(function () {
  //   // process.stdout.write('猫咪')
  //   // process.stdout.moveCursor(0,-1)
  //   process.stdout.moveCursor(0, -numOfLinesToClear) //move the cursor to first line
  //   setTimeout(() => {
  //     process.stdout.clearLine(0)
  //     out.write('4') // prints `3`
  //     out.write('\n5') // prints new line and `4`
  //     out.write('\n6\n7')
  //   }, 2000)
  //   // process.stdout.write('\n\n')
  //   // out.cursorTo(0) // moves the cursor at the beginning of line
  //   // out.write('\n5') // prints new line and `4`
  //   // console.log()
  // }, 1000)
  // console.log('???')
  // output('第一行\n第二行\n第三行\n第四行')
  // const row = parseInt(process.argv.slice(2)[0])
  // if (!isNaN(row)) {
  //   clear(row)
  // }
  // process.stdout.write('脚本\n你好世界')
  // await wait(3000)
  // process.stdout.cursorTo(4)
  // await wait(3000)
  // process.stdout.write('人')
  // await wait(3000)
  // process.stdout.clearLine(1)
  // await wait(3000)
  // process.exit()
  // await Multiline.writeOnNthLine(1, '测\n试')
  // process.exit()
  let stop = false
  await Promise.all(
    Array.from({ length: 12 })
      .map((_, i) => i)
      .map(async (i) => {
        const name = (i + 1).toString().padStart(2, '0')
        await Multiline.track(`Program: Test-${name}\nInitializing`, i.toString())
        await wait(Math.floor(300 * Math.random()))
        const now = Date.now()
        if (!stop) {
          let p = 0
          while (p < 100) {
            p += Math.floor(Math.random() * 10)
            await Multiline.track(
              chalk.blue(`Program: Test-${name}\nLoading: ${progress(Math.min(100, p), 9)}`),
              i.toString()
            )
            await wait(300)
          }
          p = 0
          while (p < 100) {
            p += Math.floor(Math.random() * 10)
            await Multiline.track(
              chalk.yellow(
                `Program: Test-${name}\nProcessing: ${progress(Math.min(100, p), 12)}`
              ),
              i.toString()
            )
            await wait(30)
          }
        }
        await wait(Math.floor(300 * Math.random()))
        await Multiline.track(
          chalk.green(`Program: Test-${name}\nCompleted, Time: ${Date.now() - now}ms`),
          i.toString()
        )
      })
  )
})()

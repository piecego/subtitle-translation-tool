#!/usr/bin/env node

import yargs from 'yargs'
import dotenv from 'dotenv'
import { TextOptions } from './commands/text'
import { FileOptions } from './commands/file'

dotenv.config()
const command = yargs
  .scriptName('trans')
  .usage('$0 <command> [value] [--option]')
  .command<TextOptions>(
    'text [value]',
    'translation text',
    yargs => {
      yargs.options({
        mode: {
          type: 'string',
          choices: ['api', 'browser'],
          description: 'translation mode',
          default: 'api'
        },
        language: {
          type: 'string',
          description: 'Target language',
          default: 'zh-CN'
        }
      })
      return yargs
    },
    async args => {
      const { default: text } = await import('./commands/text')
      await text(args)
      process.exit()
    }
  )
  .command<FileOptions>(
    'file [path]',
    'translation file',
    yargs => {
      yargs.options({
        mode: {
          type: 'string',
          choices: ['api', 'browser'],
          description: 'translation mode',
          default: 'browser'
        },
        language: {
          type: 'string',
          description: 'target language',
          default: 'zh-CN'
        },
        ext: {
          type: 'string',
          description: 'Match file extension',
          default: '.srt'
        },
        force: {
          type: 'boolean',
          alias: 'F',
          description: 'Force overwritten translated files'
        },
        clear: {
          type: 'boolean',
          alias: 'C',
          description: 'Clean translated files'
        },
        keywords: {
          type: 'string',
          description: 'No translate these words'
        },
        worker: {
          type: 'number',
          default: 3,
          description: 'Number of workers used'
        },
        headless: {
          type: 'boolean',
          default: true,
          description: 'Whether to run browser in headless mode'
        }
      })
      return yargs
    },
    async args => {
      const { FileTranslation } = await import('./commands/file')
      const file = new FileTranslation(args)
      await file.translate()
      process.exit()
    }
  )
  .command({
    command: 'test',
    describe: 'test app',
    handler: () => {
      const MOVE_LEFT = Buffer.from('1b5b3130303044', 'hex').toString()
      const MOVE_UP = Buffer.from('1b5b3141', 'hex').toString()
      const CLEAR_LINE = Buffer.from('1b5b304b', 'hex').toString()
      function clear() {
        process.stdout.write(`${MOVE_LEFT}${CLEAR_LINE}${MOVE_UP}`)
      }
      for (let i = 0; i <= 8; i++) {
        setTimeout(() => {
          console.log('line: ', i)
          setTimeout(() => {
            clear()
          }, 100)
        }, i * 1000)
      }
    }
  })
  .wrap(Math.min(120, process.stdout.columns))
  .strict()
if (process.argv.length <= 2) {
  command.showHelp()
} else {
  command.parse()
}

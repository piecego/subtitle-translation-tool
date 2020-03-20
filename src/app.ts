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
  .wrap(Math.min(120, process.stdout.columns))
  .strict()
if (process.argv.length <= 2) {
  command.showHelp()
} else {
  command.parse()
}

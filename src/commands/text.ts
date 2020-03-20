import { createLogger } from '../utils'
import { Arguments } from 'yargs'
import write from '../helpers/write'

export interface TextOptions {
  mode: 'api' | 'browser'
  language: string
  value?: string
}

const logger = createLogger('TextTranslation')

export default async function text(opts: Arguments<TextOptions>) {
  if (!opts.value) {
    logger.error('[value] cannot be empty, use --help view help info')
    return void 0
  }
  await write.init({
    language: opts.language,
    mode: opts.mode,
    worker: 1
  })
  logger.info('input', opts.value)
  logger.info('output', await write.translate(opts.value))
}

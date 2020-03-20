import { Arguments } from 'yargs'
import { join, parse, sep } from 'path'
import fs from 'fs-extra'
import split from 'split2'
import Pumpify from 'pumpify'
import through from 'through2'
import write from '../helpers/write'
import { createLogger, Logger } from '../utils'
import trash from 'trash'

function readStream(
  input: string,
  output: string,
  keyMaps: Map<string, string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(input)
      .pipe(new Pumpify(split(), through.obj(write.write(keyMaps))))
      .on('error', reject)
      .pipe(
        fs
          .createWriteStream(output)
          .on('close', resolve)
          .on('error', reject)
      )
  })
}

const logger = createLogger('FileTranslation')

export interface FileOptions {
  language: string
  mode: 'api' | 'browser'
  force: boolean
  clear: boolean
  path?: string
  ext: string
  keywords: string
  worker: number
  headless?: boolean
}

const keywords: string[] = []

export class FileTranslation {
  private readonly keywordsMap: Map<string, string>
  constructor(private opts: Arguments<FileOptions>) {
    if (opts.keywords) {
      const keys = opts.keywords.split(/,，/g)
      keywords.push(...keys)
    }
    this.keywordsMap = new Map<string, string>(
      keywords.map((v, i) => [i.toString(), v])
    )
  }
  async translate() {
    if (!this.opts.path) {
      logger.error('[path] cannot be empty, use --help view help info')
      return void 0
    }
    await write.init({
      language: this.opts.language,
      mode: this.opts.mode,
      worker: this.opts.worker,
      headless: this.opts.headless,
      split: line => {
        if (/[.。]$/gm.test(line)) {
          return [line]
        }
        if (/[?？]/gm.test(line)) {
          return line.split(/[?？]/g).map((v, i) => i === 0 ? v + '?' : v)
        }
        if (/[;；]/gm.test(line)) {
          return line.split(/[;；]/g).map((v, i) => i === 0 ? v + ';' : v)
        }
        return []
      }
    })
    await this.read(this.opts.path)
  }
  async readFile(file: string, tab = 0, logger: Logger) {
    const info = parse(file)
    if (info.ext !== this.opts.ext) return void 0
    const output = `${info.dir}${sep}${info.name}.${this.opts.language}${info.ext}`
    logger.info(
      `${' '.repeat(tab)}|${'-'.repeat(3)}File: "${info.name}${info.ext}"`
    )
    const indent = tab + 2
    if (await fs.pathExists(output)) {
      logger.info(
        `${' '.repeat(indent)}|${'-'.repeat(4)}包含字幕的翻译${
          this.opts.language
        }文件`
      )
      if (this.opts.clear) {
        logger.info(
          `${' '.repeat(indent)}|${'-'.repeat(4)}清理该字幕的翻译文件"`
        )
        await trash(output)
        logger.success(`${' '.repeat(indent)}|${'-'.repeat(4)}已移动到回收站"`)
        return void 0
      }
      if (!this.opts.force) {
        logger.warn(`${' '.repeat(indent)}|${'-'.repeat(4)}跳过该文件"`)
        return void 0
      } else {
        logger.warn(`${' '.repeat(indent)}|${'-'.repeat(4)}强制覆盖"`)
      }
    }
    if (this.opts.clear) return void 0
    logger.info(`${' '.repeat(indent)}|${'-'.repeat(4)}翻译中`)
    try {
      await readStream(file, output, this.keywordsMap)
      logger.success(`${' '.repeat(indent)}|${'-'.repeat(4)}翻译完成`)
    } catch (e) {
      switch (e) {
        case 1003:
          logger.error(`${' '.repeat(indent)}|${'-'.repeat(4)}翻译超时`)
          break
        case 1002:
          logger.error(`${' '.repeat(indent)}|${'-'.repeat(4)}无法获取翻译结果`)
          break
        case 1001:
          logger.error(`${' '.repeat(indent)}|${'-'.repeat(4)}翻译内容为空`)
          break
        case 1000:
          logger.error(`${' '.repeat(indent)}|${'-'.repeat(4)}运行超载`)
          break
        default:
          logger.error(`${' '.repeat(indent)}|${'-'.repeat(4)}翻译失败`)
          console.error('Error', e)
      }
    }
  }
  async readDir(dir: string, tab = 0, logger: Logger) {
    let files = (await fs.readdir(dir)).filter(
      f => !f.includes(this.opts.language)
    )
    logger.info(
      `${' '.repeat(tab)}|${'-'.repeat(3)}Directory: "${parse(dir).base}"`
    )
    const max = this.opts.worker
    for (let i = 0; i <= Math.ceil(files.length / max); i++) {
      await Promise.all(
        files
          .slice(i * max, i * max + max)
          .map(file => this.read(join(dir, file), tab + 2))
      )
    }
  }
  async read(input: string, tab = 0) {
    if (!(await fs.pathExists(input))) {
      throw new Error('File or directory does not exist')
    }
    const stats = await fs.stat(input)
    if (stats.isDirectory()) {
      await this.readDir(input, tab, logger)
    }
    if (stats.isFile()) {
      await this.readFile(input, tab, createLogger('FileReader     '))
    }
  }
}

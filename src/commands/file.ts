import { Arguments } from 'yargs'
import { join, parse, sep } from 'path'
import fs from 'fs-extra'
import split from 'split2'
import Pumpify from 'pumpify'
import through from 'through2'
import write from '../helpers/write'
import { createLogger, Logger } from '../utils/logger.util'
import { wait } from '../utils/timer.utils'
import trash from 'trash'
import { DynamicTerminal } from '../utils/dynamic-terminal.util'

function readStream(
  input: string,
  output: string,
  keyMaps: Map<string, string>,
  progress: (percentage: number) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const { size } = await fs.stat(input)
    let total = 0
    fs.createReadStream(input)
      .pipe(
        new Pumpify(
          split(),
          through.obj(
            write.write(keyMaps, (len) => {
              total += len
              progress((total / size) * 100)
            })
          )
        )
      )
      .on('error', reject)
      .pipe(
        fs
          .createWriteStream(output)
          .on('close', () => {
            progress(100)
            resolve()
          })
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
    if (this.opts.worker === 0) {
      return void 0
    }
    logger.info(`初始化中`)
    await write.init({
      language: this.opts.language,
      mode: this.opts.mode,
      worker: this.opts.worker,
      headless: this.opts.headless,
      split: (line) => {
        if (/[.。]$/gm.test(line)) {
          return [line]
        }
        if (/[?？]/gm.test(line)) {
          return line.split(/[?？]/g).map((v, i) => (i === 0 ? v + '?' : v))
        }
        if (/[;；]/gm.test(line)) {
          return line.split(/[;；]/g).map((v, i) => (i === 0 ? v + ';' : v))
        }
        return []
      },
    })
    await this.read(this.opts.path)
  }
  async readFile(file: string, tab = 0, logger: Logger) {
    const info = parse(file)
    if (info.ext !== this.opts.ext) return void 0
    const output = `${info.dir}${sep}${info.name}.${this.opts.language}${info.ext}`
    const title = `${' '.repeat(tab)}|${'-'.repeat(3)}File: "${info.name}${
      info.ext
    }"`
    const dto = DynamicTerminal.create(info.name)
    // line 1
    await dto.track(logger.getInfo(title))
    const indent = tab + 2
    if (await fs.pathExists(output)) {
      // line 2
      await dto.push(
        logger.getInfo(
          `${' '.repeat(indent)}|${'-'.repeat(4)}包含字幕的翻译${
            this.opts.language
          }文件`
        )
      )
      if (this.opts.clear) {
        // line 3
        await dto.push(
          logger.getInfo(
            `${' '.repeat(indent)}|${'-'.repeat(4)}清理该字幕的翻译文件"`
          )
        )
        await trash(output)
        // line 4
        await dto.push(
          logger.getSuccess(
            `${' '.repeat(indent)}|${'-'.repeat(4)}已移动到回收站"`
          )
        )
        return void 0
      }
      if (!this.opts.force) {
        // line 3
        await dto.splice(0, dto.length, logger.getWarn(title + '  [跳过]'))
        return void 0
      } else {
        // line 3
        await dto.push(
          logger.getWarn(`${' '.repeat(indent)}|${'-'.repeat(4)}强制覆盖"`)
        )
      }
    }
    if (this.opts.clear) return void 0
    // line 4
    await dto.push(
      logger.getInfo(`${' '.repeat(indent)}|${'-'.repeat(4)}翻译中 0%`)
    )
    try {
      await readStream(file, output, this.keywordsMap, (percentage) => {
        // line 4
        dto.pop(
          logger.getInfo(
            `${' '.repeat(indent)}|${'-'.repeat(4)}翻译中 ${percentage.toFixed(
              2
            )}%`
          )
        )
      })
      await wait(160)
      await dto.splice(0, dto.length, logger.getSuccess(title + '  [完成]'))
    } catch (e) {
      await fs.remove(output)
      await dto.splice(0, dto.length)
      switch (e) {
        case 1003:
          await dto.track(
            logger.getError(`${title}  [翻译超时]`)
          )
          break
        case 1000:
          await dto.track(
            logger.getError(`${title}  [运行超载]`)
          )
          await this.readFile(file, tab, logger)
          break
        case 1002:
          await dto.track(
            logger.getError(`${title}  [无法获取翻译结果]`)
          )
          break
        case 1001:
          await dto.track(
            logger.getError(`${title}  [翻译内容为空]`)
          )
          break
        default:
          await dto.track(
            logger.getError(`${title}  [翻译失败]`)
          )
      }
    }
  }
  async readDir(dir: string, tab = 0, logger: Logger) {
    let files = (await fs.readdir(dir))
      .filter((f) => !f.includes(this.opts.language))
      .sort((a, b) => {
        let aid = Number(a.match(/^\d+(?:\.?\d+)?/)?.[0]) || a
        let bid = Number(b.match(/^\d+(?:\.?\d+)?/)?.[0]) || b
        return aid > bid ? 1 : aid < bid ? -1 : 0
      })
    logger.info(
      `${' '.repeat(tab)}|${'-'.repeat(3)}Directory: "${parse(dir).base}"`
    )
    const max = this.opts.worker
    for (let i = 0; i < Math.ceil(files.length / max); i++) {
      await Promise.all(
        files
          .slice(i * max, i * max + max)
          .map((file) => this.read(join(dir, file), tab + 2))
      )
      DynamicTerminal.end()
    }
    logger.success('全部翻译完成')
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

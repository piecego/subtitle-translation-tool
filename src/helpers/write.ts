import { TransformCallback } from 'through2'
import { GoogleTranslationApi } from './google-translation-api'
import { GoogleTranslationBrowser } from './google-translation-browser'

export interface Options {
  language: string
  mode: 'api' | 'browser'
  worker?: number
  split?: (line: string) => string[]
  headless?: boolean
}

class Timeline {
  static parse(timeline: string): number {
    timeline = timeline.trim()
    const ms = Number(timeline.slice(-4).slice(1))
    const [h, m, s] = timeline
      .slice(0, -4)
      .split(':')
      .map(Number)
    return h * 3600000 + m * 60000 + s * 1000 + ms
  }
  static stringify(timestamp: number) {
    const h = Math.floor(timestamp / 3600000)
    const m = Math.floor((timestamp - h * 3600000) / 60000)
    const s = Math.floor((timestamp - h * 3600000 - m * 60000) / 1000)
    const ms = timestamp - h * 3600000 - m * 60000 - s * 1000
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }
}

class Table {
  private keyStack: {
    [name: string]: string
  } = {}
  private valStack: {
    [name: string]: string
  } = {}
  private size: number = 0
  set(key: string, value: string) {
    if (!this.has(key)) {
      this.size++
    }
    this.keyStack[key] = value
    this.valStack[value] = key
  }
  convert(map: Map<string, string>) {
    for (const [key, value] of map.entries()) {
      this.keyStack[key] = value
      this.valStack[value] = key
    }
    return this
  }
  get(key: string) {
    return this.keyStack[key] || ''
  }
  getKeyByValue(value: string) {
    return this.valStack[value]
  }
  has(key: string) {
    return Reflect.has(this.keyStack, key)
  }
  delete(key: string) {
    if (this.has(key)) {
      delete this.valStack[this.keyStack[key]]
      delete this.keyStack[key]
      this.size--
    }
  }
  values() {
    return Object.values(this.keyStack)
  }
  keys() {
    return Object.keys(this.keyStack)
  }
  entries() {
    return Object.entries(this.keyStack)
  }
  clear() {
    this.keyStack = {}
    this.valStack = {}
    this.size = 0
  }
  get length() {
    return this.size
  }
}

const table = new Table()
export class Write {
  private target!: GoogleTranslationApi | GoogleTranslationBrowser
  private initialized!: boolean
  private split!: Required<Options>['split']
  async init(options: Options) {
    if (options.mode === 'api') {
      const env = process.env
      this.target = new GoogleTranslationApi({
        language: options.language,
        projectID: env.PROJECT_ID || '',
        key: env.KEY || ''
      })
    } else {
      this.target = new GoogleTranslationBrowser({
        language: options.language,
        worker: options.worker || 2,
        initPageTimeout: 0,
        responseDispatcher: async response => {
          const url = response.url()
          const text = await response.text()
          const status = response.status()
          if (status !== 200) {
            throw new Error(`Failed getting data from: ${url}`)
          }
          let ret = JSON.parse(text)
          ret = ret[0]
          let data = ''
          for (let i = 0; i < ret.length; i++) {
            if (ret[i][0]) {
              data += ret[i][0]
            }
          }
          return data
        },
        headless: options.headless
        // chromePath: 'C:\\Program Files (x86)\\Google\\Chrome Dev\\Application\\chrome.exe'
      })
    }
    this.split = options.split || (val => [val])
    await this.target.init()
    this.initialized = true
  }
  async translate(input: string) {
    if (!this.initialized)
      throw new Error('Please use the "init" method to initialize')
    return await this.target.translate(input)
  }
  public write(keyMaps: Map<string, string>, progress: (len: number) => void) {
    if (!this.initialized)
      throw new Error('Please use the "init" method to initialize')
    let contextCache = ''
    let count = 0
    let timeStart: number = 0
    let timeEnd: number = 0
    let continuous = false
    const keywords = table.convert(keyMaps)
    return (chunk: Buffer | string, enc: string, cb: TransformCallback) => {
      const line = chunk.toString(enc)
      progress(line.length)
      if (/^\d+\s*$/.test(line)) {
        cb()
        return void 0
      }
      if (/(?:\d{2}:?)+,\d{3}\s+-->\s+(?:\d{2}:?)+,\d{3}/g.test(line)) {
        cb()
        if (continuous) {
          timeEnd = Timeline.parse(line.split('-->')[1])
        } else {
          timeStart = Timeline.parse(line.split('-->')[0])
          timeEnd = Timeline.parse(line.split('-->')[1])
        }
        return void 0
      }
      if (line.trim() === '') {
        cb()
        return void 0
      }
      const context = this.split(line)
      if (context.length > 0) {
        let cache = (contextCache + ' ' + context[0]).trimLeft()
        if (keywords.length > 0) {
          cache = cache.replace(
            new RegExp(
              `(${Array.from(keywords.values()).join('|')})[\\s,.]`,
              'gi'
            ),
            (_, key?: string) => {
              if (!key) return _
              const k = keywords.getKeyByValue(key.toLowerCase())
              return k ? `@${k} ` : _
            }
          )
        }
        this.translate(cache)
          .then(value => {
            value = value.replace(
              /@\u0020\d+/g,
              value => keywords.get(value.slice(2)) || value
            )
            const lines = value
              .split(/[。]/g)
              .filter(v => v.trim())
            // console.log(timeStart, timeEnd)
            const step = Math.ceil((timeEnd - timeStart) / lines.length)
            cb(
              null,
              lines
                .map((v, i) => {
                  const start = timeStart + step * i
                  count++
                  const timeline = `${Timeline.stringify(
                    start
                  )} --> ${Timeline.stringify(start + step)}`
                  return `${count}\n${timeline}\n${v}\n\n`
                })
                .join('')
                .trimLeft()
            )
          })
          .catch(err => {
            cb(err)
          })
        continuous = false
        contextCache = context[1] || ''
        return void 0
      } else {
        contextCache += ' ' + line
        continuous = true
      }
      cb(null)
    }
  }
}
export default new Write()

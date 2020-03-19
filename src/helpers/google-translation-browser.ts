import puppeteer from 'puppeteer'
import { URLSearchParams } from 'url'
import { wait } from '../utils'

interface PageWrap {
  page: puppeteer.Page
  times: number
  browser: puppeteer.Browser
  instanceId: number
}

let instanceId = 1
let repairing = false
let sourceResultsMap: {
  [source: string]: [string, Date]
} = {}

enum Code {
  OVERLOAD = 1000,
  QUERY_MSG_EMPTY,
  SOURCE_ELEMENT_GET_ERROR,
  OVER_TIME
}

export interface Options {
  worker: number
  language: string
  responseDispatcher: (res: puppeteer.Response) => Promise<string>
  proxy?: string
  initPageTimeout: number
  maxTimesInstance: number
  headless?: boolean
  chromePath?: string
}

const defaultOptions: Partial<Options> = {
  worker: 2,
  initPageTimeout: 0,
  maxTimesInstance: 200
}

export class GoogleTranslationBrowser {
  private chromePool: PageWrap[] = []
  private options: Options
  constructor(opts: Partial<Options>) {
    this.options = Object.assign({}, defaultOptions, opts) as Options
  }
  async init(): Promise<boolean> {
    try {
      for (let i = 0; i < this.options.worker; i++) {
        this.chromePool.push(await this.createPuppeteerInstance())
      }
    } catch (e) {
      console.error('[error] when init')
      return false
    }
    return true
  }
  private async createPuppeteerInstance(): Promise<PageWrap> {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
    if (this.options.proxy) {
      args.push(this.options.proxy)
    }
    const browser = await puppeteer.launch({
      args,
      headless: this.options.headless,
      executablePath: this.options.chromePath
    })
    const page = await browser.newPage()
    const pageWrap: PageWrap = {
      page,
      times: 0,
      browser,
      instanceId: instanceId++,
    }
    page.on('response', async response => {
      const url = response.url()
      if (!url.includes('translate.google.cn/translate_a/single')) return true
      const request = response.request()
      let key: string | null
      let params: URLSearchParams
      if (request.method() === 'GET') {
        params = new URLSearchParams(url)
      } else if (request.method() === 'POST') {
        params = new URLSearchParams(request.postData())
      } else {
        return true
      }
      key = params.get('q')
      if (!key) return true
      const ret = await this.options?.responseDispatcher(response)
      sourceResultsMap[key] = [ret, new Date()]
      return true
    })
    await page.goto(`https://translate.google.cn/#en/${this.options.language}`, {
      waitUntil: 'domcontentloaded',
      timeout: this.options.initPageTimeout
    })
    return pageWrap
  }
  private async dynamicRepair() {
    while (this.options.worker > this.chromePool.length) {
      this.chromePool.unshift(await this.createPuppeteerInstance())
    }
  }
  private static async clear(page: puppeteer.Page) {
    try {
      let source = await page.$('#source')
      if (source) {
        if (process.platform === 'darwin') {
          await source.click({ clickCount: 3 })
          await page.keyboard.press('Backspace')
        } else {
          await page.keyboard.down('Control')
          await page.keyboard.press('KeyA')
          await page.keyboard.up('Control')
          await page.keyboard.press('Backspace')
        }
      }
    } catch (e) {
      console.log('[error] when clear')
    }
  }
  async recyclePageObj(pageObj: PageWrap) {
    if (pageObj.times > this.options.maxTimesInstance) {
      await pageObj.browser.close()
      this.chromePool.unshift(await this.createPuppeteerInstance())
    } else {
      this.chromePool.unshift(pageObj)
    }
  }
  async translate(input: string) {
    const pageObj = this.chromePool.pop()
    if (!pageObj) {
      if (!repairing) {
        repairing = true
        await this.dynamicRepair()
        repairing = false
      }
      throw Code.OVERLOAD
    }
    pageObj.times++
    input = input.trim()
    if (process.platform === 'darwin') {
      input = input.replace(/(\n)/g, '')
    }
    if (!input) throw Code.QUERY_MSG_EMPTY
    await pageObj.page.waitFor('#source')
    const source = await pageObj.page.$("#source")
    if (!source) {
      throw Code.SOURCE_ELEMENT_GET_ERROR
    }
    await source.focus()
    await pageObj.page.keyboard.type(input)
    let timer = 0
    while (true) {
      await wait(300)
      if (sourceResultsMap[input]) {
        const result = sourceResultsMap[input][0]
        delete sourceResultsMap[input]
        await GoogleTranslationBrowser.clear(pageObj.page)
        await this.recyclePageObj(pageObj)
        return result
      }
      timer++
      if (timer > 50) {
        throw Code.OVER_TIME
      }
    }
  }
}

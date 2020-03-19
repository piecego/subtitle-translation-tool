import { Translate } from '@google-cloud/translate/build/src/v2'

interface Options {
  language: string
  projectID: string
  key: string
}

export class GoogleTranslationApi {
  private api!: Translate
  private readonly opts: Options
  constructor(options: Options) {
    this.opts = options
  }
  async init() {
    this.api = new Translate({
      projectId: this.opts.projectID,
      key: this.opts.key
    })
  }
  async translate(input: string) {
    const [response] = await this.api.translate(input, this.opts.language)
    return response
  }
}

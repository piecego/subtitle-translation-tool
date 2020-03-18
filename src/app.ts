#!/usr/bin/env node

import { join, resolve, parse, sep } from 'path'
import fs from 'fs-extra'
import split from 'split2'
import Pumpify from 'pumpify'
import through, { TransformCallback } from 'through2'
import { Translate } from '@google-cloud/translate/build/src/v2'
import yargs  from 'yargs'
import dotenv from 'dotenv'

interface Arguments {
  [x: string]: any;
  input: string
  language: string
}

const argv: Arguments = yargs.option({
  input: {
    alias: 'I',
    type: 'string',
    description: '文件地址'
  },
  language: {
    alias: 'LA',
    type: 'string',
    description: '目标语言',
    default: 'zh-CN'
  }
}).demandOption(['input'], '必须输入input参数才能使用本工具').argv
dotenv.config()

const env = process.env

// const translate = new Translate({
//   projectId: env['PROJECT_ID'],
//   key: env['KEY']
// })

async function translation(input: string) {
  if (len + input.length > 25000000) {
    console.warn('Insufficient balance')
    process.exit()
  } else {
    len += input.length
    return input
  }
}

let len = 0

function write() {
  let contextCache = ''
  let count = 0
  let timeline = ''
  let continuous = false
  return (chunk: Buffer | string, enc: string, cb: TransformCallback) => {
    const line = chunk.toString(enc)
    if (/^\d+\s*$/.test(line)) {
      cb()
      if (!continuous) count++
      return void 0
    }
    if (/(?:\d{2}:?)+,\d{3}\s+-->\s+(?:\d{2}:?)+,\d{3}/g.test(line)) {
      cb()
      if (continuous) {
        timeline = timeline
          .split('-->')
          .slice(0, 1)
          .concat(line.split('-->')[1])
          .join('-->')
      } else {
        timeline = line
      }
      return void 0
    }
    if (line.trim() === '') {
      cb()
      return void 0
    }
    contextCache += ' ' + line
    if (line.endsWith('.')) {
      const cache = contextCache.trimLeft()
      // cb(null, `${count}\n${timeline}\n${cache}\n\n`)
      translation(cache).then(value => {
          cb(null, `${count}\n${timeline}\n${value}\n\n`)
      }).catch(err => {
          console.warn('Translation failure')
          console.error(err)
          cb(null, `${count}\n${timeline}\n${cache}\n`)
      })
      continuous = false
      contextCache = ''
      return void 0
    } else {
      continuous = true
    }
    cb(null)
  }
}

function readStream(input: string, output: string, cb: () => void) {
  return fs.createReadStream(input)
    .pipe(new Pumpify(split(), through.obj(write())))
    .pipe(fs.createWriteStream(output).on('end', cb))
}

async function readFile(file: string, tab = 0) {
  const stats = await fs.stat(file)
  if (!stats.isFile()) throw new Error(`"${file}" not is file`)
  const info = parse(file)
  const output = `${info.dir}${sep}${info.name}.zh-CN${info.ext}`
  if (info.name.includes(argv.language)) {
    console.log(`${' '.repeat(tab)}Ignore "${info.name}${info.ext}"`)
    return void 0
  }
  console.log(`${' '.repeat(tab)}Read "${info.name}${info.ext}"`)
  readStream(file, output, () => {
    console.log(`${' '.repeat(tab)}Written "${info.name}${info.ext}"`)
  })
}
async function readDir(dir: string, tab = 0) {
  const files = await fs.readdir(dir)
  console.log(`${' '.repeat(tab)}Read Dir ${parse(dir).ext}`)
  for (const file of files) {
    const path = join(dir, file)
    const stats = await fs.stat(path)
    if (stats.isDirectory()) {
      await readDir(path, tab + 2)
      continue
    }
    if (!stats.isFile()) continue
    if (!file.endsWith('.srt')) {
      if (file.includes(argv.language)) {
        console.log(`${' '.repeat(tab)}Clean ${file}`)
        await fs.remove(path)
      }
      continue
    }
    await readFile(path, tab + 2)
  }
}

async function app() {
  const input = resolve(argv.input)
  const stats = await fs.stat(input)
  if (stats.isFile()) {
    await readFile(input)
  } else if (stats.isDirectory()) {
    await readDir(input)
  }
  console.log(`Total ${len} char`)
}

app().catch(e => {
  console.warn(e.message)
  console.error(e)
})



const formatColorValue = (v: number): string => {
  return v < 16 ? '0' + v.toString(16) : v.toString(16)
}

export function randomColor(hex: string) {
  let red = Math.floor(Math.random() * 256)
  let green = Math.floor(Math.random() * 256)
  let blue = Math.floor(Math.random() * 256)
  if (hex.length == 4) hex.replace(/(\w)/g, '$1$1')
  const mix = hex
    .slice(1)
    .split('')
    .reduce((p, v, i) => {
      i % 2 === 0 ? p.push(v) : (p[p.length - 1] += v)
      return p
    }, [] as string[])
    .map(v => parseInt(v, 16))
  red = Math.floor((red + mix[0]) / 2)
  green = Math.floor((green + mix[1]) / 2)
  blue = Math.floor((blue + mix[2]) / 2)
  return `#${formatColorValue(red)}${formatColorValue(green)}${formatColorValue(
    blue
  )}`
}

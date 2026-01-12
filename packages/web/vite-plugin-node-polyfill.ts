import { Plugin } from 'vite'

/**
 * Vite 插件：为 Node.js 模块提供浏览器 polyfill
 */
export function nodePolyfillPlugin(): Plugin {
  return {
    name: 'node-polyfill',
    enforce: 'pre',
    resolveId(id) {
      // 拦截 Node.js 模块的导入
      if (id === 'fs' || id === 'fs/promises') {
        return { id: `virtual:${id}`, external: false }
      }
      return null
    },
    load(id) {
      if (id === 'virtual:fs') {
        return {
          code: `
export const constants = {
  O_RDONLY: 0,
  O_WRONLY: 1,
  O_RDWR: 2,
  O_CREAT: 64,
  O_EXCL: 128,
  O_NOCTTY: 256,
  O_TRUNC: 512,
  O_APPEND: 1024,
  O_DIRECTORY: 65536,
}

export function existsSync(path) {
  console.warn('[fs polyfill] existsSync is not supported in browser')
  return false
}

export function readFileSync(path) {
  console.warn('[fs polyfill] readFileSync is not supported in browser')
  return ''
}

export function writeFileSync(path, data) {
  console.warn('[fs polyfill] writeFileSync is not supported in browser')
}

export function mkdirSync(path) {
  console.warn('[fs polyfill] mkdirSync is not supported in browser')
}

export function readdirSync(path) {
  console.warn('[fs polyfill] readdirSync is not supported in browser')
  return []
}

export function statSync(path) {
  console.warn('[fs polyfill] statSync is not supported in browser')
  return {
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
  }
}

export const promises = {
  readFile: async () => '',
  writeFile: async () => {},
  mkdir: async () => {},
  readdir: async () => [],
  stat: async () => ({
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
  }),
}

export default {
  constants,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  promises,
}
`,
        }
      }

      if (id === 'virtual:fs/promises') {
        return {
          code: `
export const readFile = async () => {
  console.warn('[fs/promises polyfill] readFile is not supported in browser')
  return ''
}

export const writeFile = async () => {
  console.warn('[fs/promises polyfill] writeFile is not supported in browser')
}

export const mkdir = async () => {
  console.warn('[fs/promises polyfill] mkdir is not supported in browser')
}

export const readdir = async () => {
  console.warn('[fs/promises polyfill] readdir is not supported in browser')
  return []
}

export const stat = async () => {
  console.warn('[fs/promises polyfill] stat is not supported in browser')
  return {
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
  }
}

export default {
  readFile,
  writeFile,
  mkdir,
  readdir,
  stat,
}
`,
        }
      }

      return null
    },
  }
}

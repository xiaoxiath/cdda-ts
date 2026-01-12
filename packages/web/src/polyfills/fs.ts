/**
 * Node.js fs 模块的浏览器 polyfill
 *
 * 注意：这是一个简单的 polyfill，仅用于让构建通过
 * 在浏览器环境中，文件系统操作不会正常工作
 */

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

export function existsSync(path: string): boolean {
  console.warn('[fs polyfill] existsSync is not supported in browser environment:', path)
  return false
}

export function readFileSync(path: string, encoding?: string): string {
  console.warn('[fs polyfill] readFileSync is not supported in browser environment:', path)
  return ''
}

export function writeFileSync(path: string, data: string): void {
  console.warn('[fs polyfill] writeFileSync is not supported in browser environment:', path)
}

export function mkdirSync(path: string, options?: { recursive: boolean }): void {
  console.warn('[fs polyfill] mkdirSync is not supported in browser environment:', path)
}

export function readdirSync(path: string): string[] {
  console.warn('[fs polyfill] readdirSync is not supported in browser environment:', path)
  return []
}

export function statSync(path: string): any {
  console.warn('[fs polyfill] statSync is not supported in browser environment:', path)
  return {
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
    mtime: new Date(),
  }
}

// 导出 promises API
import * as fsPromises from './fs-promises'
export const promises = fsPromises

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

/**
 * Node.js fs/promises 模块的浏览器 polyfill
 *
 * 注意：这是一个简单的 polyfill，仅用于让构建通过
 * 在浏览器环境中，文件系统操作不会正常工作
 */

export async function readFile(path: string): Promise<string> {
  console.warn('[fs/promises polyfill] readFile is not supported in browser environment:', path)
  return ''
}

export async function writeFile(path: string, data: string): Promise<void> {
  console.warn('[fs/promises polyfill] writeFile is not supported in browser environment:', path)
}

export async function mkdir(path: string, options?: { recursive: boolean }): Promise<void> {
  console.warn('[fs/promises polyfill] mkdir is not supported in browser environment:', path)
}

export async function readdir(path: string): Promise<string[]> {
  console.warn('[fs/promises polyfill] readdir is not supported in browser environment:', path)
  return []
}

export async function stat(path: string): Promise<any> {
  console.warn('[fs/promises polyfill] stat is not supported in browser environment:', path)
  return {
    isFile: () => false,
    isDirectory: () => false,
    size: 0,
    mtime: new Date(),
  }
}

export default {
  readFile,
  writeFile,
  mkdir,
  readdir,
  stat,
}

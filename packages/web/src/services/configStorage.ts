/**
 * 游戏配置存储服务 - 使用 IndexedDB
 */

export interface GameConfig {
  // 显示设置
  resolutionIndex: number
  displayMode: 'ascii' | 'tile'
  sidebarCollapsed: boolean

  // 其他可扩展的配置
  [key: string]: any
}

const CONFIG_STORE_NAME = 'gameConfig'
const DB_NAME = 'cataclym-web'
const DB_VERSION = 1

class ConfigStorage {
  private db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(CONFIG_STORE_NAME)) {
          db.createObjectStore(CONFIG_STORE_NAME)
        }
      }
    })
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInit(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
  }

  /**
   * 保存配置
   */
  async save(config: Partial<GameConfig>): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CONFIG_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CONFIG_STORE_NAME)

      // 读取现有配置并合并
      const getRequest = store.get('config')
      getRequest.onsuccess = () => {
        const existingConfig = getRequest.result || {}
        const mergedConfig = { ...existingConfig, ...config }

        const putRequest = store.put(mergedConfig, 'config')
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(new Error('Failed to save config'))
      }

      getRequest.onerror = () => reject(new Error('Failed to read existing config'))
    })
  }

  /**
   * 读取配置
   */
  async load(): Promise<Partial<GameConfig>> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CONFIG_STORE_NAME], 'readonly')
      const store = transaction.objectStore(CONFIG_STORE_NAME)
      const request = store.get('config')

      request.onsuccess = () => {
        resolve(request.result || {})
      }

      request.onerror = () => reject(new Error('Failed to load config'))
    })
  }

  /**
   * 清空配置
   */
  async clear(): Promise<void> {
    await this.ensureInit()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CONFIG_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CONFIG_STORE_NAME)
      const request = store.delete('config')

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to clear config'))
    })
  }
}

// 导出单例
export const configStorage = new ConfigStorage()

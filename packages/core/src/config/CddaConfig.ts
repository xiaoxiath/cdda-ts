/**
 * Cataclysm-DDA 数据路径配置
 *
 * 从 cdda.config.json 读取配置，支持从任意位置运行
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * 配置接口
 */
export interface CddaConfig {
  /** 数据根路径 */
  dataPath: string;
  /** 各个子路径 */
  paths: {
    /** JSON 数据目录 */
    json: string;
    /** Mapgen 目录 */
    mapgen: string;
    /** Mapgen 调色板目录 */
    mapgenPalettes: string;
    /** 家具和地形目录 */
    furnitureAndTerrain: string;
    /** NPC 目录 */
    npcs: string;
    /** 陷阱文件 */
    traps: string;
  };
}

/**
 * 配置文件原始格式
 */
interface ConfigFile {
  dataPath?: string;
  paths?: {
    json?: string;
    mapgen?: string;
    mapgenPalettes?: string;
    furnitureAndTerrain?: string;
    npcs?: string;
    traps?: string;
  };
}

/**
 * 默认配置（相对于项目根目录）
 */
const DEFAULT_CONFIG: CddaConfig = {
  dataPath: './Cataclysm-DDA/data',
  paths: {
    json: './Cataclysm-DDA/data/json',
    mapgen: './Cataclysm-DDA/data/json/mapgen',
    mapgenPalettes: './Cataclysm-DDA/data/json/mapgen_palettes',
    furnitureAndTerrain: './Cataclysm-DDA/data/json/furniture_and_terrain',
    npcs: './Cataclysm-DDA/data/json/npcs',
    traps: './Cataclysm-DDA/data/json/traps.json',
  },
};

/**
 * 查找项目根目录
 *
 * 从当前文件向上查找，直到找到 package.json 或 pnpm-workspace.yaml
 */
function findProjectRoot(startPath: string): string {
  let currentPath = startPath;

  // 最多向上查找 10 层
  for (let i = 0; i < 10; i++) {
    const packageJsonPath = join(currentPath, 'package.json');
    const workspacePath = join(currentPath, 'pnpm-workspace.yaml');

    if (existsSync(packageJsonPath) || existsSync(workspacePath)) {
      // 检查是否是 monorepo 的根目录（有 packages/ 子目录）
      if (existsSync(join(currentPath, 'packages'))) {
        return currentPath;
      }
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      // 已到达文件系统根目录
      break;
    }
    currentPath = parentPath;
  }

  // 未找到，返回当前目录
  return startPath;
}

/**
 * 加载配置文件
 */
function loadConfigFile(projectRoot: string): ConfigFile | null {
  const configPath = join(projectRoot, 'cdda.config.json');

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ConfigFile;
  } catch {
    return null;
  }
}

/**
 * 解析相对路径为绝对路径
 */
function resolvePath(relativePath: string, basePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath; // 已经是绝对路径
  }
  return resolve(basePath, relativePath);
}

/**
 * 缓存的配置实例
 */
let cachedConfig: CddaConfig | null = null;

/**
 * 获取 Cataclysm-DDA 配置
 *
 * @param overridePath 可选的覆盖路径，用于测试
 * @returns 配置对象
 */
export function getCddaConfig(overridePath?: string): CddaConfig {
  if (cachedConfig && !overridePath) {
    return cachedConfig;
  }

  // 获取当前模块的路径
  const currentModulePath = dirname(
    // 在 CommonJS 环境中
    typeof __dirname !== 'undefined'
      ? __dirname
      : // 在 ES Module 环境中
        dirname(fileURLToPath(import.meta.url))
  );

  // 查找项目根目录
  const projectRoot = overridePath || findProjectRoot(currentModulePath);

  // 加载配置文件
  const configFile = loadConfigFile(projectRoot);

  // 合并默认配置和文件配置
  const config: CddaConfig = {
    dataPath: resolvePath(
      configFile?.dataPath || DEFAULT_CONFIG.dataPath,
      projectRoot
    ),
    paths: {
      json: resolvePath(
        configFile?.paths?.json || DEFAULT_CONFIG.paths.json,
        projectRoot
      ),
      mapgen: resolvePath(
        configFile?.paths?.mapgen || DEFAULT_CONFIG.paths.mapgen,
        projectRoot
      ),
      mapgenPalettes: resolvePath(
        configFile?.paths?.mapgenPalettes ||
          DEFAULT_CONFIG.paths.mapgenPalettes,
        projectRoot
      ),
      furnitureAndTerrain: resolvePath(
        configFile?.paths?.furnitureAndTerrain ||
          DEFAULT_CONFIG.paths.furnitureAndTerrain,
        projectRoot
      ),
      npcs: resolvePath(
        configFile?.paths?.npcs || DEFAULT_CONFIG.paths.npcs,
        projectRoot
      ),
      traps: resolvePath(
        configFile?.paths?.traps || DEFAULT_CONFIG.paths.traps,
        projectRoot
      ),
    },
  };

  if (!overridePath) {
    cachedConfig = config;
  }

  return config;
}

/**
 * 清除配置缓存
 *
 * 用于测试或重新加载配置
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * 获取 JSON 数据路径
 */
export function getDataPath(): string {
  return getCddaConfig().dataPath;
}

/**
 * 获取 JSON 数据目录路径
 */
export function getJsonPath(): string {
  return getCddaConfig().paths.json;
}

/**
 * 获取 Mapgen 路径
 */
export function getMapgenPath(): string {
  return getCddaConfig().paths.mapgen;
}

/**
 * 获取 Mapgen 调色板路径
 */
export function getMapgenPalettesPath(): string {
  return getCddaConfig().paths.mapgenPalettes;
}

/**
 * 获取家具和地形路径
 */
export function getFurnitureAndTerrainPath(): string {
  return getCddaConfig().paths.furnitureAndTerrain;
}

/**
 * 获取 NPC 路径
 */
export function getNpcsPath(): string {
  return getCddaConfig().paths.npcs;
}

/**
 * 获取陷阱文件路径
 */
export function getTrapsPath(): string {
  return getCddaConfig().paths.traps;
}

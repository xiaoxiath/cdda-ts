/**
 * 自动化验证所有 mapgen 数据的加载和渲染
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { CataclysmMapGenParser, CataclysmMapGenLoader } from './src/mapgen/CataclysmMapGenParser';
import { PaletteResolver } from './src/mapgen/PaletteResolver';
import { CataclysmMapGenGenerator } from './src/mapgen/CataclysmMapGenGenerator';
import { TerrainLoader } from './src/terrain/TerrainLoader';
import { FurnitureLoader } from './src/furniture/FurnitureLoader';
import { TrapLoader } from './src/trap/TrapLoader';
import { GameMap } from './src/map/GameMap';
import { getMapgenPath, getJsonPath, getMapgenPalettesPath } from './src/config/CddaConfig';

interface ValidationResult {
  name: string;
  id: string;
  file: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    hasFurniture: boolean;
    furnitureCount: number;
    hasTerrain: boolean;
    terrainCount: number;
    hasNested: boolean;
    hasItems: boolean;
    hasMonsters: boolean;
  };
}

interface ValidationReport {
  total: number;
  success: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
}

/**
 * Mapgen 验证器
 */
class MapgenValidator {
  private readonly terrainLoader: TerrainLoader;
  private readonly furnitureLoader: FurnitureLoader;
  private readonly trapLoader: TrapLoader;
  private readonly mapgenLoader: CataclysmMapGenLoader;
  private readonly paletteResolver: PaletteResolver;

  constructor() {
    this.terrainLoader = new TerrainLoader();
    this.furnitureLoader = new FurnitureLoader();
    this.trapLoader = new TrapLoader();
    this.mapgenLoader = new CataclysmMapGenLoader();
    this.paletteResolver = new PaletteResolver(this.mapgenLoader);
  }

  /**
   * 初始化数据加载器
   */
  async initialize(): Promise<void> {
    console.log('正在加载数据...\n');

    // 加载地形数据
    const furnitureTerrainDir = getJsonPath() + '/furniture_and_terrain';
    const terrainFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('terrain-') && f.endsWith('.json'));

    console.log(`  加载地形数据...`);
    for (const file of terrainFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        await this.terrainLoader.loadFromJson(Array.isArray(json) ? json : [json]);
      } catch (e) {
        // ignore
      }
    }
    console.log(`    ✅ 加载了 ${this.terrainLoader.getData().size()} 个地形定义`);

    // 加载家具数据
    const furnitureFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('furniture-') && f.endsWith('.json'));

    console.log(`  加载家具数据...`);
    for (const file of furnitureFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        await this.furnitureLoader.loadFromJson(Array.isArray(json) ? json : [json]);
      } catch (e) {
        // ignore
      }
    }
    console.log(`    ✅ 加载了 ${this.furnitureLoader.getData().size()} 个家具定义`);

    // 加载陷阱数据
    const trapPath = join(getJsonPath(), 'traps.json');
    if (existsSync(trapPath)) {
      try {
        const trapContent = readFileSync(trapPath, 'utf-8');
        const trapJson = JSON.parse(trapContent);
        await this.trapLoader.loadFromJson(Array.isArray(trapJson) ? trapJson : [trapJson]);
        console.log(`    ✅ 加载了陷阱数据`);
      } catch (e) {
        console.log(`    ⚠️  跳过陷阱数据`);
      }
    }

    // 加载调色板数据
    const palettePath = getMapgenPalettesPath();
    if (existsSync(palettePath)) {
      const paletteFiles = readdirSync(palettePath).filter(f => f.endsWith('.json'));
      console.log(`  加载调色板数据...`);
      for (const file of paletteFiles) {
        try {
          const filePath = join(palettePath, file);
          const content = readFileSync(filePath, 'utf-8');
          const json = JSON.parse(content);
          this.mapgenLoader.loadArray(Array.isArray(json) ? json : [json]);
        } catch (e) {
          // ignore
        }
      }
      console.log(`    ✅ 加载了 ${this.mapgenLoader.paletteCount()} 个调色板定义`);
    }

    console.log('\n✅ 数据加载完成\n');
  }

  /**
   * 加载所有 mapgen 数据
   */
  loadAllMapgens(): Array<{ id: string; name: string; path: string; object: any }> {
    const mapgenPath = getMapgenPath();
    const mapgens: Array<{ id: string; name: string; path: string; object: any }> = [];

    // 递归扫描目录
    const scanDirectory = (dir: string) => {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const json = JSON.parse(content);
            const jsonArray = Array.isArray(json) ? json : [json];

            for (const obj of jsonArray) {
              if (obj.type === 'mapgen') {
                mapgens.push({
                  id: obj.id || `${entry.name}_${mapgens.length}`,
                  name: obj.om_terrain || obj.id || entry.name,
                  path: fullPath,
                  object: obj,
                });
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    };

    if (existsSync(mapgenPath)) {
      scanDirectory(mapgenPath);
    }

    return mapgens;
  }

  /**
   * 验证单个 mapgen
   */
  validate(mapgen: { id: string; name: string; path: string; object: any }): ValidationResult {
    const result: ValidationResult = {
      name: mapgen.name,
      id: mapgen.id,
      file: mapgen.path,
      success: true,
      errors: [],
      warnings: [],
      stats: {
        hasFurniture: false,
        furnitureCount: 0,
        hasTerrain: false,
        terrainCount: 0,
        hasNested: false,
        hasItems: false,
        hasMonsters: false,
      },
    };

    try {
      // 解析 mapgen
      const parsed = CataclysmMapGenParser.parse(mapgen.object);

      // 解析调色板
      const resolved = this.paletteResolver.resolve(parsed);

      // 统计家具和地形
      for (const [char, furniture] of resolved.furniture) {
        if (furniture) {
          result.stats.hasFurniture = true;
          result.stats.furnitureCount++;
        }
      }

      for (const [char, terrain] of resolved.terrain) {
        if (terrain) {
          result.stats.hasTerrain = true;
          result.stats.terrainCount++;
        }
      }

      result.stats.hasNested = (resolved.nested?.size || 0) > 0;
      result.stats.hasItems = (resolved.items?.size || 0) > 0 || resolved.placeItems.length > 0;
      result.stats.hasMonsters = (resolved.monsters?.size || 0) > 0 || resolved.placeMonsters.length > 0;

      // 创建生成器
      const generator = new CataclysmMapGenGenerator(
        resolved,
        {
          terrain: this.terrainLoader,
          furniture: this.furnitureLoader,
          trap: this.trapLoader,
        },
        {
          paletteResolver: this.paletteResolver,
          mapgenLoader: this.mapgenLoader,
        }
      );

      // 生成地图
      const map = new GameMap();
      let generated;
      try {
        generated = generator.generateMultiple({
          seed: 12345,
          position: { x: 0, y: 0, z: 0 },
          map,
          at: (x, y, z) => map.getTile(x, y, z),
        });
      } catch (e) {
        result.success = false;
        result.errors.push(`生成失败: ${e instanceof Error ? e.message : String(e)}`);
        return result;
      }

      // 检查 generated 对象
      if (!generated) {
        result.success = false;
        result.errors.push('生成结果为 null/undefined');
        return result;
      }

      if (!generated.submaps || !Array.isArray(generated.submaps)) {
        result.success = false;
        result.errors.push(`generated.submaps 不是数组: ${typeof generated.submaps}`);
        return result;
      }

      // 验证生成的 submap
      let actualFurnitureCount = 0;
      let actualTerrainCount = 0;
      let hasErrors = false;

      for (let i = 0; i < generated.submaps.length; i++) {
        const submapResult = generated.submaps[i];
        const submap = submapResult?.submap;

        // 检查 submap 是否存在
        if (!submap) {
          result.errors.push(`Submap [${i}] 是 undefined (gridX=${submapResult?.position?.gridX}, gridY=${submapResult?.position?.gridY})`);
          hasErrors = true;
          continue;
        }

        // 检查是否有 size 属性
        if (typeof submap.size !== 'number') {
          result.errors.push(`Submap [${i}] 的 size 不是数字: ${submap.size}`);
          hasErrors = true;
          continue;
        }

        for (let y = 0; y < submap.size; y++) {
          for (let x = 0; x < submap.size; x++) {
            try {
              const tile = submap.getTile(x, y);

              if (tile.terrain !== 0) {
                actualTerrainCount++;
              }

              if (tile.furniture !== null && tile.furniture !== 0) {
                actualFurnitureCount++;

                // 验证家具是否存在
                const furniture = this.furnitureLoader.getData().get(tile.furniture);
                if (!furniture) {
                  result.errors.push(`家具 ID ${tile.furniture} 不存在 (${x},${y})`);
                  hasErrors = true;
                }
              }
            } catch (e) {
              result.errors.push(`访问瓦片 (${x},${y}) 失败: ${e instanceof Error ? e.message : String(e)}`);
              hasErrors = true;
            }
          }
        }
      }

      // 检查是否有家具但实际没有生成
      if (result.stats.hasFurniture && actualFurnitureCount === 0) {
        result.warnings.push('定义了家具但没有生成任何家具');
      }

      if (hasErrors) {
        result.success = false;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * 运行验证
   */
  async run(): Promise<ValidationReport> {
    await this.initialize();

    console.log('正在加载 mapgen 数据...\n');
    const mapgens = this.loadAllMapgens();
    console.log(`找到 ${mapgens.length} 个 mapgen 定义\n`);

    console.log('开始验证...\n');

    const results: ValidationResult[] = [];
    let successCount = 0;
    let failCount = 0;
    let warningCount = 0;

    for (let i = 0; i < mapgens.length; i++) {
      const mapgen = mapgens[i];
      const result = this.validate(mapgen);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      warningCount += result.warnings.length;

      // 显示进度
      if ((i + 1) % 100 === 0 || i === mapgens.length - 1) {
        console.log(`进度: ${i + 1}/${mapgens.length} (${Math.floor((i + 1) / mapgens.length * 100)}%)`);
      }
    }

    console.log('\n');

    return {
      total: mapgens.length,
      success: successCount,
      failed: failCount,
      warnings: warningCount,
      results,
    };
  }
}

/**
 * 格式化报告
 */
function formatReport(report: ValidationReport): void {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         Mapgen 验证报告                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`总计: ${report.total}`);
  console.log(`✅ 成功: ${report.success} (${Math.floor(report.success / report.total * 100)}%)`);
  console.log(`❌ 失败: ${report.failed} (${Math.floor(report.failed / report.total * 100)}%)`);
  console.log(`⚠️  警告: ${report.warnings}\n`);

  // 显示失败的 mapgen
  if (report.failed > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('失败的 Mapgen:');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const result of report.results.filter(r => !r.success)) {
      console.log(`❌ ${result.name} (${result.id})`);
      console.log(`   文件: ${result.file}`);
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
      console.log('');
    }
  }

  // 显示有警告的 mapgen
  const withWarnings = report.results.filter(r => r.warnings.length > 0 && r.success);
  if (withWarnings.length > 0) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('有警告的 Mapgen:');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const result of withWarnings.slice(0, 20)) {
      console.log(`⚠️  ${result.name}`);
      for (const warning of result.warnings) {
        console.log(`   - ${warning}`);
      }
    }

    if (withWarnings.length > 20) {
      console.log(`   ... 还有 ${withWarnings.length - 20} 个有警告的 mapgen`);
    }
    console.log('');
  }

  // 统计信息
  const withFurniture = report.results.filter(r => r.stats.hasFurniture).length;
  const withTerrain = report.results.filter(r => r.stats.hasTerrain).length;
  const withNested = report.results.filter(r => r.stats.hasNested).length;
  const withItems = report.results.filter(r => r.stats.hasItems).length;
  const withMonsters = report.results.filter(r => r.stats.hasMonsters).length;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('统计信息:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`包含家具: ${withFurniture} (${Math.floor(withFurniture / report.total * 100)}%)`);
  console.log(`包含地形: ${withTerrain} (${Math.floor(withTerrain / report.total * 100)}%)`);
  console.log(`包含嵌套: ${withNested} (${Math.floor(withNested / report.total * 100)}%)`);
  console.log(`包含物品: ${withItems} (${Math.floor(withItems / report.total * 100)}%)`);
  console.log(`包含怪物: ${withMonsters} (${Math.floor(withMonsters / report.total * 100)}%)`);
}

/**
 * 主函数
 */
async function main() {
  const validator = new MapgenValidator();
  const report = await validator.run();
  formatReport(report);

  // 返回退出码
  process.exit(report.failed > 0 ? 1 : 0);
}

main().catch(console.error);

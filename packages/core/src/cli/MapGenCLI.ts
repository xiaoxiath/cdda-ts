/**
 * MapGen CLI Tool - MapGen 加载工具
 *
 * 交互式工具，用于加载和调试 mapgen 数据
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { GameMap } from '../map/GameMap';
import { Submap, SUBMAP_SIZE } from '../map/Submap';
import { Tripoint } from '../coordinates/Tripoint';
import { CataclysmMapGenParser } from '../mapgen/CataclysmMapGenParser';
import { CataclysmMapGenGenerator } from '../mapgen/CataclysmMapGenGenerator';
import { MapGenContext } from '../mapgen/MapGenFunction';
import { TerrainLoader } from '../terrain/TerrainLoader';
import { FurnitureLoader } from '../furniture/FurnitureLoader';
import { TrapLoader } from '../trap/TrapLoader';
import { SimpleRenderer } from '../cli/SimpleRenderer';
import { Avatar } from '../creature/Avatar';
import { GameState, GameLoop } from '../game';
import { SimpleInputHandler } from './SimpleInputHandler';
import { createInterface } from 'readline';

/**
 * MapGen 选项
 */
interface MapGenOption {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly object: any;
}

/**
 * MapGen CLI 工具
 */
export class MapGenCLI {
  private mapgenDataPath: string;
  private dataPath: string;
  private rl: ReturnType<typeof createInterface>;
  private terrainLoader: TerrainLoader;
  private furnitureLoader: FurnitureLoader;
  private trapLoader: TrapLoader;

  constructor(
    mapgenDataPath: string = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/mapgen',
    dataPath: string = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json'
  ) {
    this.mapgenDataPath = mapgenDataPath;
    this.dataPath = dataPath;
    this.terrainLoader = new TerrainLoader();
    this.furnitureLoader = new FurnitureLoader();
    this.trapLoader = new TrapLoader();
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * 初始化数据加载器
   */
  private async initializeLoaders(): Promise<void> {
    console.log('📦 正在从 Cataclysm-DDA 加载数据...\n');

    // 加载地形数据（从 furniture_and_terrain 目录）
    const furnitureTerrainDir = join(this.dataPath, 'furniture_and_terrain');
    const terrainFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('terrain-') && f.endsWith('.json'));

    console.log('  加载地形数据...');
    let totalTerrainDefs = 0;
    for (const file of terrainFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];
        await this.terrainLoader.loadFromJson(jsonArray);
        totalTerrainDefs += jsonArray.length;
      } catch (error) {
        console.log(`    ⚠️  跳过 ${file}: ${error}`);
      }
    }
    console.log(`  ✅ 从 ${terrainFiles.length} 个文件加载了 ${totalTerrainDefs} 个地形定义`);

    // 加载家具数据（从 furniture_and_terrain 目录）
    const furnitureFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('furniture-') && f.endsWith('.json'));

    console.log('  加载家具数据...');
    let totalFurnitureDefs = 0;
    for (const file of furnitureFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];
        await this.furnitureLoader.loadFromJson(jsonArray);
        totalFurnitureDefs += jsonArray.length;
      } catch (error) {
        console.log(`    ⚠️  跳过 ${file}: ${error}`);
      }
    }
    console.log(`  ✅ 从 ${furnitureFiles.length} 个文件加载了 ${totalFurnitureDefs} 个家具定义`);

    // 加载陷阱数据
    const trapPath = join(this.dataPath, 'traps.json');
    if (existsSync(trapPath)) {
      console.log('  加载陷阱数据...');
      const trapContent = readFileSync(trapPath, 'utf-8');
      const trapJson = JSON.parse(trapContent);
      const trapArray = Array.isArray(trapJson) ? trapJson : [trapJson];
      await this.trapLoader.loadFromJson(trapArray);
      console.log(`  ✅ 加载了 ${trapArray.length} 个陷阱定义`);
    } else {
      console.log(`  ⚠️  陷阱文件不存在: ${trapPath}`);
    }

    console.log('\n✅ 数据加载完成\n');
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA MapGen 调试工具                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      // 初始化数据加载器
      await this.initializeLoaders();

      // 加载所有 mapgen 数据
      const mapgens = await this.loadAllMapGens();

      if (mapgens.length === 0) {
        console.log('❌ 没有找到任何 mapgen 数据');
        console.log(`   路径: ${this.mapgenDataPath}`);
        await this.waitForEnter();
        return;
      }

      // 显示菜单
      await this.showMainMenu(mapgens);
    } catch (error) {
      console.error('❌ 错误:', error);
    } finally {
      this.rl.close();
    }
  }

  /**
   * 加载所有 mapgen 数据
   */
  private async loadAllMapGens(): Promise<MapGenOption[]> {
    const mapgens: MapGenOption[] = [];

    console.log('📂 正在扫描 mapgen 数据...');

    if (!existsSync(this.mapgenDataPath)) {
      console.log(`❌ 路径不存在: ${this.mapgenDataPath}`);
      return mapgens;
    }

    const files = readdirSync(this.mapgenDataPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`✅ 找到 ${jsonFiles.length} 个 JSON 文件`);

    for (const file of jsonFiles) {
      try {
        const filePath = join(this.mapgenDataPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // 提取所有 mapgen 对象
        const jsonArray = Array.isArray(data) ? data : [data];

        for (const obj of jsonArray) {
          if (obj.type === 'mapgen' || obj.omm || obj.object || obj.method) {
            const id = obj.id || obj.omm || `${file}_${mapgens.length}`;
            const name = obj.name || obj.id || obj.omm || file;

            mapgens.push({
              id,
              name,
              path: filePath,
              object: obj,
            });
          }
        }
      } catch (error) {
        console.log(`⚠️  跳过文件 ${file}: ${error}`);
      }
    }

    console.log(`✅ 加载了 ${mapgens.length} 个 mapgen 定义\n`);
    return mapgens;
  }

  /**
   * 显示主菜单
   */
  private async showMainMenu(mapgens: MapGenOption[]): Promise<void> {
    while (true) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('主菜单:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('1. 列出所有 mapgen');
      console.log('2. 搜索 mapgen');
      console.log('3. 随机选择一个 mapgen');
      console.log('4. 按索引选择 mapgen');
      console.log('0. 退出');
      console.log('═══════════════════════════════════════════════════════════');

      const choice = await this.question('请选择操作 [0-4]: ');

      switch (choice.trim()) {
        case '1':
          await this.listMapGens(mapgens);
          break;
        case '2':
          await this.searchMapGens(mapgens);
          break;
        case '3':
          await this.selectRandomMapGen(mapgens);
          break;
        case '4':
          await this.selectByIndex(mapgens);
          break;
        case '0':
          console.log('\n👋 再见！');
          return;
        default:
          console.log('\n❌ 无效的选择\n');
      }
    }
  }

  /**
   * 列出所有 mapgen
   */
  private async listMapGens(mapgens: MapGenOption[]): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`所有 Mapgen (${mapgens.length} 个):`);
    console.log('═══════════════════════════════════════════════════════════\n');

    const pageSize = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(mapgens.length / pageSize);

    while (true) {
      const startIdx = currentPage * pageSize;
      const endIdx = Math.min(startIdx + pageSize, mapgens.length);

      console.log(`第 ${currentPage + 1}/${totalPages} 页:\n`);

      for (let i = startIdx; i < endIdx; i++) {
        const mg = mapgens[i];
        console.log(`[${i.toString().padStart(3, ' ')}] ${mg.name}`);
        console.log(`      ID: ${mg.id}`);
        console.log(`      文件: ${mg.path.split('/').pop()}`);
        console.log('');
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('操作: [n]下一页 [p]上一页 [编号]查看详情 [0]返回');
      console.log('═══════════════════════════════════════════════════════════');

      const input = (await this.question('\n请选择: ')).trim().toLowerCase();

      if (input === 'n') {
        if (currentPage < totalPages - 1) currentPage++;
      } else if (input === 'p') {
        if (currentPage > 0) currentPage--;
      } else if (input === '0') {
        break;
      } else {
        const idx = parseInt(input);
        if (!isNaN(idx) && idx >= 0 && idx < mapgens.length) {
          await this.viewMapGen(mapgens[idx]);
        } else {
          console.log('\n❌ 无效的编号\n');
        }
      }
    }
  }

  /**
   * 搜索 mapgen
   */
  private async searchMapGens(mapgens: MapGenOption[]): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('搜索 Mapgen');
    console.log('═══════════════════════════════════════════════════════════');

    const keyword = await this.question('\n请输入搜索关键词: ');

    const results = mapgens.filter(mg =>
      mg.name.toLowerCase().includes(keyword.toLowerCase()) ||
      mg.id.toLowerCase().includes(keyword.toLowerCase())
    );

    console.log(`\n找到 ${results.length} 个匹配结果:\n`);

    if (results.length === 0) {
      console.log('没有找到匹配的 mapgen\n');
      await this.waitForEnter();
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const mg = results[i];
      console.log(`[${i}] ${mg.name} (ID: ${mg.id})`);
    }

    const input = await this.question('\n请输入编号查看详情 [0-${results.length - 1}] (或按 0 返回): ');
    const idx = parseInt(input);

    if (!isNaN(idx) && idx >= 0 && idx < results.length) {
      await this.viewMapGen(results[idx]);
    }
  }

  /**
   * 随机选择 mapgen
   */
  private async selectRandomMapGen(mapgens: MapGenOption[]): Promise<void> {
    const idx = Math.floor(Math.random() * mapgens.length);
    console.log(`\n🎲 随机选择了: ${mapgens[idx].name}\n`);
    await this.viewMapGen(mapgens[idx]);
  }

  /**
   * 按索引选择 mapgen
   */
  private async selectByIndex(mapgens: MapGenOption[]): Promise<void> {
    const input = await this.question(`\n请输入索引 [0-${mapgens.length - 1}]: `);
    const idx = parseInt(input);

    if (isNaN(idx) || idx < 0 || idx >= mapgens.length) {
      console.log('\n❌ 无效的索引\n');
      await this.waitForEnter();
      return;
    }

    await this.viewMapGen(mapgens[idx]);
  }

  /**
   * 查看 mapgen 详情并生成地图
   */
  private async viewMapGen(mapgen: MapGenOption): Promise<void> {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║ Mapgen 详情                                                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`名称: ${mapgen.name}`);
    console.log(`ID: ${mapgen.id}`);
    console.log(`文件: ${mapgen.path}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('原始数据:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(JSON.stringify(mapgen.object, null, 2));
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('操作:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. 生成地图');
    console.log('2. 生成多个样本');
    console.log('0. 返回');
    console.log('═══════════════════════════════════════════════════════════');

    const choice = await this.question('\n请选择: ');

    if (choice === '1') {
      await this.generateAndDisplayMap(mapgen);
    } else if (choice === '2') {
      await this.generateMultipleSamples(mapgen);
    }
  }

  /**
   * 生成并显示地图
   */
  private async generateAndDisplayMap(mapgen: MapGenOption): Promise<void> {
    console.log('\n🔄 正在生成地图...\n');

    try {
      // 解析 mapgen（使用静态方法）
      const parsed = CataclysmMapGenParser.parse(mapgen.object);
      console.log('✅ 解析成功');
      console.log(`   OM Terrain: ${parsed.omTerrain || 'N/A'}`);
      console.log(`   尺寸: ${parsed.width}x${parsed.height}`);

      // 创建生成器实例
      const generator = new CataclysmMapGenGenerator(parsed, {
        terrain: this.terrainLoader,
        furniture: this.furnitureLoader,
        trap: this.trapLoader,
      });

      // 生成地图
      const map = new GameMap();
      const context: MapGenContext = {
        seed: Date.now(),
        position: new Tripoint({ x: 0, y: 0, z: 0 }),
        map,
        params: {},
        depth: 0,
      };

      const result = generator.generate(context);
      console.log('✅ 生成成功');

      // 显示生成的子地图
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('生成的地图:');
      console.log('═══════════════════════════════════════════════════════════\n');
      this.displaySubmap(result);

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('操作: [0]返回 [r]重新生成 [s]保存');
      console.log('═══════════════════════════════════════════════════════════');

      const choice = (await this.question('\n请选择: ')).toLowerCase();

      if (choice === 'r') {
        await this.generateAndDisplayMap(mapgen);
      } else if (choice === 's') {
        console.log('\n⚠️  保存功能待实现');
        await this.waitForEnter();
      }
    } catch (error) {
      console.error('\n❌ 生成失败:', error);
      console.error(error);
      await this.waitForEnter();
    }
  }

  /**
   * 生成多个样本
   */
  private async generateMultipleSamples(mapgen: MapGenOption): Promise<void> {
    const countInput = await this.question('\n请输入生成数量 [1-10]: ');
    const count = Math.min(10, Math.max(1, parseInt(countInput) || 3));

    console.log(`\n🔄 正在生成 ${count} 个样本...\n`);

    try {
      // 解析 mapgen
      const parsed = CataclysmMapGenParser.parse(mapgen.object);

      // 创建生成器实例
      const generator = new CataclysmMapGenGenerator(parsed, {
        terrain: this.terrainLoader,
        furniture: this.furnitureLoader,
        trap: this.trapLoader,
      });

      for (let i = 0; i < count; i++) {
        console.log(`\n─────────────────────────────────────────────────────────`);
        console.log(`样本 ${i + 1}/${count}`);
        console.log(`─────────────────────────────────────────────────────────\n`);

        const map = new GameMap();
        const context: MapGenContext = {
          seed: Date.now() + i * 1000,
          position: new Tripoint({ x: 0, y: 0, z: 0 }),
          map,
          params: {},
          depth: 0,
        };

        const result = generator.generate(context);
        this.displaySubmap(result);
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      await this.waitForEnter();
    } catch (error) {
      console.error('\n❌ 生成失败:', error);
      console.error(error);
      await this.waitForEnter();
    }
  }

  /**
   * 显示子地图
   */
  private displaySubmap(submap: Submap): void {
    for (let y = 0; y < SUBMAP_SIZE; y++) {
      let line = '';
      for (let x = 0; x < SUBMAP_SIZE; x++) {
        const terrain = submap.getTerrain(x, y);
        line += this.getTerrainChar(terrain, x, y, submap);
      }
      console.log(line);
    }
  }

  /**
   * 获取地形字符
   */
  private getTerrainChar(terrainId: number, x: number, y: number, submap: Submap): string {
    // 首先检查是否有家具
    const tile = submap.getTile(x, y);
    if (tile && tile.furniture !== 0 && tile.furniture !== null) {
      const furniture = this.furnitureLoader.getData().get(tile.furniture);
      if (furniture) {
        return furniture.symbol;
      }
    }

    // 然后检查地形
    const terrain = this.terrainLoader.getData().get(terrainId);
    if (terrain) {
      return terrain.symbol;
    }

    // 回退到简单的映射
    const chars: Record<number, string> = {
      0: '.', // 默认地板
      1: '#', // 默认墙
    };
    return chars[terrainId] || '?';
  }

  /**
   * 提问用户
   */
  private question(query: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(query, (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * 等待用户按 Enter
   */
  private async waitForEnter(): Promise<void> {
    await this.question('\n按 Enter 继续...');
  }
}

/**
 * 主函数
 */
async function main() {
  const cli = new MapGenCLI();
  await cli.run();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

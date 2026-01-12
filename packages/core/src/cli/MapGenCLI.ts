/**
 * MapGen CLI Tool - MapGen 加载工具
 *
 * 交互式工具，用于加载和调试 mapgen 数据
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';
import { GameMap } from '../map/GameMap';
import { Submap, SUBMAP_SIZE } from '../map/Submap';
import { Tripoint } from '../coordinates/Tripoint';
import { CataclysmMapGenParser, CataclysmMapGenLoader } from '../mapgen/CataclysmMapGenParser';
import { CataclysmMapGenGenerator } from '../mapgen/CataclysmMapGenGenerator';
import { PaletteResolver } from '../mapgen/PaletteResolver';
import { MapGenContext } from '../mapgen/MapGenFunction';
import { TerrainLoader } from '../terrain/TerrainLoader';
import { FurnitureLoader } from '../furniture/FurnitureLoader';
import { TrapLoader } from '../trap/TrapLoader';
import { getMapgenPath, getJsonPath, getMapgenPalettesPath } from '../config/CddaConfig';

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
  private readonly mapgenDataPath: string;
  private readonly dataPath: string;
  private readonly palettePath: string;
  private readonly terrainLoader: TerrainLoader;
  private readonly furnitureLoader: FurnitureLoader;
  private readonly trapLoader: TrapLoader;
  private readonly mapgenLoader: CataclysmMapGenLoader;
  private readonly paletteResolver: PaletteResolver;

  constructor(
    mapgenDataPath?: string,
    dataPath?: string
  ) {
    this.mapgenDataPath = mapgenDataPath ?? getMapgenPath();
    this.dataPath = dataPath ?? getJsonPath();
    this.palettePath = getMapgenPalettesPath();
    this.terrainLoader = new TerrainLoader();
    this.furnitureLoader = new FurnitureLoader();
    this.trapLoader = new TrapLoader();
    this.mapgenLoader = new CataclysmMapGenLoader();
    this.paletteResolver = new PaletteResolver(this.mapgenLoader);
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

    // 加载调色板数据
    await this.loadPalettes();

    console.log('\n✅ 数据加载完成\n');
  }

  /**
   * 加载调色板数据
   */
  private async loadPalettes(): Promise<void> {
    console.log('  加载调色板数据...');

    if (!existsSync(this.palettePath)) {
      console.log(`  ⚠️  调色板目录不存在: ${this.palettePath}`);
      return;
    }

    const paletteFiles = readdirSync(this.palettePath).filter(f => f.endsWith('.json'));
    let totalPalettes = 0;

    for (const file of paletteFiles) {
      try {
        const filePath = join(this.palettePath, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];

        // 加载调色板（使用 mapgenLoader 的 loadArray 方法）
        const beforeCount = this.mapgenLoader.paletteCount();
        this.mapgenLoader.loadArray(jsonArray);
        const afterCount = this.mapgenLoader.paletteCount();
        totalPalettes += (afterCount - beforeCount);
      } catch (error) {
        console.log(`    ⚠️  跳过 ${file}: ${error}`);
      }
    }

    console.log(`  ✅ 从 ${paletteFiles.length} 个文件加载了 ${totalPalettes} 个调色板定义`);
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA MapGen 调试工具                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // 初始化数据加载器
    await this.initializeLoaders();

    // 加载所有 mapgen 数据
    const mapgens = await this.loadAllMapGens();

    if (mapgens.length === 0) {
      console.log('❌ 没有找到任何 mapgen 数据');
      console.log(`   路径: ${this.mapgenDataPath}`);
      return;
    }

    // 主菜单
    await this.mainMenu(mapgens);
  }

  /**
   * 递归扫描目录中的所有 JSON 文件
   */
  private scanJsonFilesRecursively(dir: string, basePath: string = ''): string[] {
    const jsonFiles: string[] = [];

    if (!existsSync(dir)) {
      return jsonFiles;
    }

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = basePath ? join(basePath, entry.name) : entry.name;

      if (entry.isDirectory()) {
        // 递归扫描子目录
        jsonFiles.push(...this.scanJsonFilesRecursively(fullPath, relativePath));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        jsonFiles.push(relativePath);
      }
    }

    return jsonFiles;
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

    // 递归扫描所有子目录
    const jsonFiles = this.scanJsonFilesRecursively(this.mapgenDataPath);
    console.log(`✅ 找到 ${jsonFiles.length} 个 JSON 文件`);

    for (const relativePath of jsonFiles) {
      try {
        const filePath = join(this.mapgenDataPath, relativePath);
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // 提取所有对象
        const jsonArray = Array.isArray(data) ? data : [data];

        for (const obj of jsonArray) {
          // 处理调色板定义
          if (obj.type === 'palette') {
            // 将调色板加载到 mapgenLoader 中
            this.mapgenLoader.loadArray([obj]);
          }
          // 处理 mapgen 定义
          else if (obj.type === 'mapgen' || obj.omm || obj.object || obj.method) {
            const id = obj.id || obj.omm || `${relativePath}_${mapgens.length}`;
            const name = obj.name || obj.id || obj.omm || relativePath;

            const mapgenOption = {
              id,
              name,
              path: filePath,
              object: obj,
            };

            mapgens.push(mapgenOption);

            // 同时加载到 mapgenLoader 中，以便嵌套 mapgen 可以找到它们
            this.mapgenLoader.load(obj);
          }
        }
      } catch (error) {
        console.log(`⚠️  跳过文件 ${relativePath}: ${error}`);
      }
    }

    console.log(`✅ 加载了 ${mapgens.length} 个 mapgen 定义`);
    console.log(`✅ mapgenLoader 中有 ${this.mapgenLoader.size()} 个 mapgen`);
    console.log(`✅ mapgenLoader 中有 ${this.mapgenLoader.paletteCount()} 个调色板\n`);
    return mapgens;
  }

  /**
   * 显示主菜单
   */
  private showMainMenu(): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('主菜单:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. 列出所有 mapgen');
    console.log('2. 搜索 mapgen');
    console.log('3. 随机选择一个 mapgen');
    console.log('4. 按索引选择 mapgen');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 主菜单
   */
  private async mainMenu(mapgens: MapGenOption[]): Promise<void> {
    const rl = this.createReadline();

    while (true) {
      this.showMainMenu();
      const choice = await this.prompt(rl, '请选择操作 [0-4]: ');

      switch (choice.trim()) {
        case '1':
          await this.listMapGens(mapgens, rl);
          break;
        case '2':
          await this.searchMapGens(mapgens, rl);
          break;
        case '3':
          await this.selectRandomMapGen(mapgens, rl);
          break;
        case '4':
          await this.selectByIndex(mapgens, rl);
          break;
        case '0':
          console.log('\n👋 再见！');
          rl.close();
          return;
        default:
          console.log('\n❌ 无效的选择\n');
      }
    }
  }

  /**
   * 列出所有 mapgen
   */
  private async listMapGens(mapgens: MapGenOption[], rl: ReadlineInterface): Promise<void> {
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

      const input = (await this.prompt(rl, '\n请选择: ')).trim().toLowerCase();

      if (input === 'n') {
        if (currentPage < totalPages - 1) currentPage++;
      } else if (input === 'p') {
        if (currentPage > 0) currentPage--;
      } else if (input === '0') {
        break;
      } else {
        const idx = parseInt(input);
        if (!isNaN(idx) && idx >= 0 && idx < mapgens.length) {
          await this.viewMapGen(mapgens[idx], rl);
        } else {
          console.log('\n❌ 无效的编号\n');
        }
      }
    }
  }

  /**
   * 搜索 mapgen
   */
  private async searchMapGens(mapgens: MapGenOption[], rl: ReadlineInterface): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('搜索 Mapgen');
    console.log('═══════════════════════════════════════════════════════════');

    const keyword = await this.prompt(rl, '\n请输入搜索关键词: ');

    const results = mapgens.filter(mg =>
      mg.name.toLowerCase().includes(keyword.toLowerCase()) ||
      mg.id.toLowerCase().includes(keyword.toLowerCase())
    );

    console.log(`\n找到 ${results.length} 个匹配结果:\n`);

    if (results.length === 0) {
      console.log('没有找到匹配的 mapgen\n');
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const mg = results[i];
      console.log(`[${i}] ${mg.name} (ID: ${mg.id})`);
    }

    const input = await this.prompt(rl, '\n请输入编号查看详情 [0-${results.length - 1}] (或按 0 返回): ');
    const idx = parseInt(input);

    if (!isNaN(idx) && idx >= 0 && idx < results.length) {
      await this.viewMapGen(results[idx], rl);
    }
  }

  /**
   * 随机选择 mapgen
   */
  private async selectRandomMapGen(mapgens: MapGenOption[], rl: ReadlineInterface): Promise<void> {
    const idx = Math.floor(Math.random() * mapgens.length);
    console.log(`\n🎲 随机选择了: ${mapgens[idx].name}\n`);
    await this.viewMapGen(mapgens[idx], rl);
  }

  /**
   * 按索引选择 mapgen
   */
  private async selectByIndex(mapgens: MapGenOption[], rl: ReadlineInterface): Promise<void> {
    const input = await this.prompt(rl, `\n请输入索引 [0-${mapgens.length - 1}]: `);
    const idx = parseInt(input);

    if (isNaN(idx) || idx < 0 || idx >= mapgens.length) {
      console.log('\n❌ 无效的索引\n');
      return;
    }

    await this.viewMapGen(mapgens[idx], rl);
  }

  /**
   * 查看 mapgen 详情并生成地图
   */
  private async viewMapGen(mapgen: MapGenOption, rl: ReadlineInterface): Promise<void> {
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

    const choice = await this.prompt(rl, '\n请选择: ');

    if (choice === '1') {
      await this.generateAndDisplayMap(mapgen, rl);
    } else if (choice === '2') {
      await this.generateMultipleSamples(mapgen, rl);
    }
  }

  /**
   * 生成并显示地图
   */
  private async generateAndDisplayMap(mapgen: MapGenOption, rl: ReadlineInterface): Promise<void> {
    console.log('\n🔄 正在生成地图...\n');

    try {
      // 解析 mapgen（使用静态方法）
      const parsed = CataclysmMapGenParser.parse(mapgen.object);
      console.log('✅ 解析成功');
      console.log(`   OM Terrain: ${parsed.omTerrain || 'N/A'}`);
      console.log(`   尺寸: ${parsed.width}x${parsed.height}`);

      // 创建生成器实例（传入 paletteResolver 和 mapgenLoader）
      const generator = new CataclysmMapGenGenerator(
        parsed,
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
      const context: MapGenContext = {
        seed: Date.now(),
        position: new Tripoint({ x: 0, y: 0, z: 0 }),
        map,
        params: {},
        depth: 0,
      };

      // 使用 generateMultiple 获取所有 submap
      const multiResult = generator.generateMultiple(context);
      console.log('✅ 生成成功');
      console.log(`   Submap 网格: ${multiResult.submapGridWidth}x${multiResult.submapGridHeight}`);

      // 显示生成的地图
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('生成的地图:');
      console.log('═══════════════════════════════════════════════════════════\n');
      this.displayMultiSubmap(multiResult);

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('操作: [0]返回 [r]重新生成 [s]保存');
      console.log('═══════════════════════════════════════════════════════════');

      const choice = (await this.prompt(rl, '\n请选择: ')).toLowerCase();

      if (choice === 'r') {
        await this.generateAndDisplayMap(mapgen, rl);
      } else if (choice === 's') {
        console.log('\n⚠️  保存功能待实现');
      }
    } catch (error) {
      console.error('\n❌ 生成失败:', error);
      console.error(error);
    }
  }

  /**
   * 显示多个 submap（组合成完整地图）
   */
  private displayMultiSubmap(multiResult: { submaps: Array<{ submap: Submap; position: any }>; submapGridWidth: number; submapGridHeight: number }): void {
    const { submaps, submapGridWidth, submapGridHeight } = multiResult;

    // 遍历每一行的 submap
    for (let gridY = 0; gridY < submapGridHeight; gridY++) {
      // 每个 submap 有 SUBMAP_SIZE 行
      for (let rowInSubmap = 0; rowInSubmap < SUBMAP_SIZE; rowInSubmap++) {
        let line = '';

        // 遍历这一行的所有 submap
        for (let gridX = 0; gridX < submapGridWidth; gridX++) {
          const submapIndex = gridY * submapGridWidth + gridX;
          const submapResult = submaps[submapIndex];

          if (submapResult) {
            const submap = submapResult.submap;

            // 获取这个 submap 的当前行
            for (let x = 0; x < SUBMAP_SIZE; x++) {
              const terrain = submap.getTerrain(x, rowInSubmap);
              line += this.getTerrainChar(terrain, x, rowInSubmap, submap);
            }
          } else {
            // 如果没有 submap，填充空格
            line += ' '.repeat(SUBMAP_SIZE);
          }
        }

        console.log(line);
      }

      // 在 submap 行之间添加分隔线（可选）
      if (gridY < submapGridHeight - 1) {
        // console.log(''); // 空行分隔
      }
    }
  }

  /**
   * 生成多个样本
   */
  private async generateMultipleSamples(mapgen: MapGenOption, rl: ReadlineInterface): Promise<void> {
    const countInput = await this.prompt(rl, '\n请输入生成数量 [1-10]: ');
    const count = Math.min(10, Math.max(1, parseInt(countInput) || 3));

    console.log(`\n🔄 正在生成 ${count} 个样本...\n`);

    try {
      // 解析 mapgen
      const parsed = CataclysmMapGenParser.parse(mapgen.object);

      // 创建生成器实例（传入 paletteResolver 和 mapgenLoader）
      const generator = new CataclysmMapGenGenerator(
        parsed,
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

        // 使用 generateMultiple 获取所有 submap
        const multiResult = generator.generateMultiple(context);
        this.displayMultiSubmap(multiResult);
      }

      console.log('\n═══════════════════════════════════════════════════════════');
    } catch (error) {
      console.error('\n❌ 生成失败:', error);
      console.error(error);
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
      // 处理伪地形（符号是空格的占位地形）
      let symbol = terrain.symbol;
      if (symbol === ' ' || symbol === '\t' || symbol === '') {
        // 根据地形 id 或 name 来决定显示字符
        if (terrain.idString?.startsWith('t_region_')) {
          // 区域地形使用点号显示
          symbol = '.';
        } else if (terrain.name === 'pseudo terrain') {
          // 伪地形显示为点号
          symbol = '.';
        } else {
          // 其他空格符号显示为空格（表示真正的空）
          symbol = ' ';
        }
      }
      return symbol;
    }

    // 回退到简单的映射
    const chars: Record<number, string> = {
      0: ' ', // t_null 显示为空格
      1: '#', // 默认墙
    };
    return chars[terrainId] || ' ';
  }

  /**
   * 创建 readline 接口
   */
  private createReadline(): ReadlineInterface {
    return createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * 提示用户输入
   */
  private prompt(rl: ReadlineInterface, question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, (answer: string) => {
        resolve(answer);
      });
    });
  }
}

/**
 * 主函数
 */
async function main() {
  const cli = new MapGenCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

/**
 * Integration CLI Tool
 *
 * 集成验证工具 - 测试所有系统协同工作
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';
import { TerrainLoader } from '../terrain/TerrainLoader';
import { FurnitureLoader } from '../furniture/FurnitureLoader';
import { TrapLoader } from '../trap/TrapLoader';
import { CataclysmMapGenLoader } from '../mapgen/CataclysmMapGenParser';
import { PaletteResolver } from '../mapgen/PaletteResolver';
import { CataclysmMapGenParser } from '../mapgen/CataclysmMapGenParser';
import { CataclysmMapGenGenerator } from '../mapgen/CataclysmMapGenGenerator';
import { GameMap } from '../map/GameMap';
import { Tripoint } from '../coordinates/Tripoint';
import { getJsonPath } from '../config/CddaConfig';

export interface ValidationResult {
  system: string;
  passed: boolean;
  details: string;
  issues: string[];
  stats: Record<string, number>;
}

export interface IntegrationReport {
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ValidationResult[];
}

export class IntegrationCLI {
  private readonly dataPath: string;
  private readonly terrainLoader: TerrainLoader;
  private readonly furnitureLoader: FurnitureLoader;
  private readonly trapLoader: TrapLoader;
  private readonly mapgenLoader: CataclysmMapGenLoader;
  private readonly paletteResolver: PaletteResolver;

  constructor(dataPath?: string) {
    this.dataPath = dataPath ?? getJsonPath();
    this.terrainLoader = new TerrainLoader();
    this.furnitureLoader = new FurnitureLoader();
    this.trapLoader = new TrapLoader();
    this.mapgenLoader = new CataclysmMapGenLoader();
    this.paletteResolver = new PaletteResolver(this.mapgenLoader, { debug: false });
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA 集成验证工具                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // 主菜单
    await this.mainMenu();
  }

  /**
   * 主菜单
   */
  private async mainMenu(): Promise<void> {
    const rl = this.createReadline();

    while (true) {
      this.showMainMenu();
      const choice = await this.prompt(rl, '请选择操作 [0-6]: ');

      switch (choice.trim()) {
        case '1':
          await this.loadAllData();
          break;
        case '2':
          await this.validateAllSystems();
          break;
        case '3':
          await this.checkCrossReferences();
          break;
        case '4':
          await this.testMapGeneration();
          break;
        case '5':
          await this.generateReport();
          break;
        case '6':
          await this.runFullIntegrationTest();
          break;
        case '0':
          console.log('\n👋 再见！');
          rl.close();
          return;
        default:
          console.log('\n❌ 无效选择，请重试\n');
      }
    }
  }

  /**
   * 显示主菜单
   */
  private showMainMenu(): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('主菜单:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. 加载所有系统数据');
    console.log('2. 验证所有系统');
    console.log('3. 检查跨系统引用');
    console.log('4. 测试地图生成');
    console.log('5. 生成验证报告');
    console.log('6. 运行完整集成测试');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 加载所有系统数据
   */
  private async loadAllData(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('加载所有系统数据:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const startTime = Date.now();

    // Load Terrain
    console.log('📦 加载地形数据...');
    await this.loadTerrainData();

    // Load Furniture
    console.log('📦 加载家具数据...');
    await this.loadFurnitureData();

    // Load Trap
    console.log('📦 加载陷阱数据...');
    await this.loadTrapData();

    // Load MapGen
    console.log('📦 加载地图生成数据...');
    await this.loadMapGenData();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ 所有数据加载完成！');
    console.log(`   用时: ${elapsed}秒\n`);

    this.showSystemStats();
  }

  /**
   * 显示系统统计
   */
  private showSystemStats(): void {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('系统统计:');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`  地形定义: ${this.terrainLoader.getAll().length}`);
    console.log(`  家具定义: ${this.furnitureLoader.getAll().length}`);
    console.log(`  陷阱定义: ${this.trapLoader.getAll().length}`);
    console.log(`  地图生成定义: ${this.mapgenLoader.size()}`);
    console.log(`  调色板定义: ${this.mapgenLoader.paletteCount()}\n`);
  }

  /**
   * 加载地形数据
   */
  private async loadTerrainData(): Promise<void> {
    const furnitureTerrainDir = join(this.dataPath, 'furniture_and_terrain');
    const terrainFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('terrain-') && f.endsWith('.json'));

    let loaded = 0;
    let errors = 0;

    for (const file of terrainFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];
        await this.terrainLoader.loadFromJson(jsonArray);
        loaded += jsonArray.length;
      } catch (error) {
        errors++;
      }
    }

    console.log(`  ✅ 地形: 从 ${terrainFiles.length} 个文件加载了 ${loaded} 个定义${errors > 0 ? ` (${errors} 个错误)` : ''}`);
  }

  /**
   * 加载家具数据
   */
  private async loadFurnitureData(): Promise<void> {
    const furnitureTerrainDir = join(this.dataPath, 'furniture_and_terrain');
    const furnitureFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('furniture-') && f.endsWith('.json'));

    let loaded = 0;
    let errors = 0;

    for (const file of furnitureFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];
        await this.furnitureLoader.loadFromJson(jsonArray);
        loaded += jsonArray.length;
      } catch (error) {
        errors++;
      }
    }

    console.log(`  ✅ 家具: 从 ${furnitureFiles.length} 个文件加载了 ${loaded} 个定义${errors > 0 ? ` (${errors} 个错误)` : ''}`);
  }

  /**
   * 加载陷阱数据
   */
  private async loadTrapData(): Promise<void> {
    const trapPath = join(this.dataPath, 'traps.json');

    try {
      const content = readFileSync(trapPath, 'utf-8');
      const json = JSON.parse(content);
      const jsonArray = Array.isArray(json) ? json : [json];
      await this.trapLoader.loadFromJson(jsonArray);
      console.log(`  ✅ 陷阱: 加载了 ${jsonArray.length} 个定义`);
    } catch (error) {
      console.log(`  ❌ 陷阱加载失败: ${(error as Error).message}`);
    }
  }

  /**
   * 加载地图生成数据
   */
  private async loadMapGenData(): Promise<void> {
    const paletteDir = join(this.dataPath, 'mapgen_palettes');
    const paletteFiles = readdirSync(paletteDir).filter(f => f.endsWith('.json'));

    let loadedPalettes = 0;
    for (const file of paletteFiles) {
      try {
        const filePath = join(paletteDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];
        this.mapgenLoader.loadArray(jsonArray);
        loadedPalettes += jsonArray.length;
      } catch (error) {
        // Skip errors
      }
    }

    console.log(`  ✅ 调色板: 从 ${paletteFiles.length} 个文件加载了 ${loadedPalettes} 个定义`);
  }

  /**
   * 验证所有系统
   */
  private async validateAllSystems(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('验证所有系统:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const results: ValidationResult[] = [];

    // Validate Terrain
    results.push(this.validateTerrain());

    // Validate Furniture
    results.push(this.validateFurniture());

    // Validate Trap
    results.push(this.validateTrap());

    // Display results
    let passed = 0;
    let failed = 0;

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.system}: ${result.details}`);
      if (result.issues.length > 0) {
        console.log(`   发现 ${result.issues.length} 个问题`);
        result.issues.slice(0, 3).forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
      console.log('');

      if (result.passed) passed++;
      else failed++;
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`验证完成: ${passed} 通过, ${failed} 失败\n`);
  }

  /**
   * 验证地形系统
   */
  private validateTerrain(): ValidationResult {
    const allTerrains = this.terrainLoader.getAll();
    const issues: string[] = [];

    let checked = 0;
    for (const terrain of allTerrains) {
      checked++;

      if (!terrain.name || terrain.name === '') {
        issues.push(`ID: ${terrain.idString} - 缺少名称`);
      }
      if (!terrain.symbol || terrain.symbol === '') {
        issues.push(`ID: ${terrain.idString} - 缺少符号`);
      }
      if (terrain.moveCost < 0) {
        issues.push(`ID: ${terrain.idString} - 无效的移动消耗: ${terrain.moveCost}`);
      }
    }

    return {
      system: '地形系统',
      passed: issues.length === 0,
      details: `检查了 ${checked} 个地形定义`,
      issues,
      stats: { total: checked, issues: issues.length },
    };
  }

  /**
   * 验证家具系统
   */
  private validateFurniture(): ValidationResult {
    const allFurniture = this.furnitureLoader.getAll();
    const issues: string[] = [];

    let checked = 0;
    for (const furniture of allFurniture) {
      checked++;

      if (!furniture.name || furniture.name === '') {
        issues.push(`ID: ${furniture.idString} - 缺少名称`);
      }
      if (!furniture.symbol || furniture.symbol === '') {
        issues.push(`ID: ${furniture.idString} - 缺少符号`);
      }
      if (furniture.moveCost < 0) {
        issues.push(`ID: ${furniture.idString} - 无效的移动消耗: ${furniture.moveCost}`);
      }
    }

    return {
      system: '家具系统',
      passed: issues.length === 0,
      details: `检查了 ${checked} 个家具定义`,
      issues,
      stats: { total: checked, issues: issues.length },
    };
  }

  /**
   * 验证陷阱系统
   */
  private validateTrap(): ValidationResult {
    const allTraps = this.trapLoader.getAll();
    const issues: string[] = [];

    let checked = 0;
    for (const trap of allTraps) {
      checked++;

      if (!trap.name || trap.name === '') {
        issues.push(`ID: ${trap.id} - 缺少名称`);
      }
      if (!trap.symbol || trap.symbol === '') {
        issues.push(`ID: ${trap.id} - 缺少符号`);
      }
      if (trap.visibility < 0 || trap.visibility > 10) {
        issues.push(`ID: ${trap.id} - 无效的可见性: ${trap.visibility}`);
      }
    }

    return {
      system: '陷阱系统',
      passed: issues.length === 0,
      details: `检查了 ${checked} 个陷阱定义`,
      issues,
      stats: { total: checked, issues: issues.length },
    };
  }

  /**
   * 检查跨系统引用
   */
  private async checkCrossReferences(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('检查跨系统引用:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const issues: string[] = [];

    // 检查地形和家具的符号冲突
    console.log('  检查地形和家具的符号冲突...');

    const terrainSymbols = new Map<string, string[]>();
    this.terrainLoader.getAll().forEach(t => {
      if (!terrainSymbols.has(t.symbol)) {
        terrainSymbols.set(t.symbol, []);
      }
      const symbols = terrainSymbols.get(t.symbol);
      if (symbols && t.idString) {
        symbols.push(t.idString);
      }
    });

    const furnitureSymbols = new Map<string, string[]>();
    this.furnitureLoader.getAll().forEach(f => {
      if (!furnitureSymbols.has(f.symbol)) {
        furnitureSymbols.set(f.symbol, []);
      }
      const symbols = furnitureSymbols.get(f.symbol);
      if (symbols && f.idString) {
        symbols.push(f.idString);
      }
    });

    // 找出冲突的符号
    const conflicts: string[] = [];
    terrainSymbols.forEach((ids, symbol) => {
      if (furnitureSymbols.has(symbol)) {
        const furnitureIds = furnitureSymbols.get(symbol);
        if (furnitureIds) {
          conflicts.push(`符号 '${symbol}' 同时被地形 (${ids.join(', ')}) 和家具 (${furnitureIds.join(', ')}) 使用`);
        }
      }
    });

    if (conflicts.length > 0) {
      console.log(`  ⚠️  发现 ${conflicts.length} 个符号冲突`);
      conflicts.slice(0, 5).forEach(c => console.log(`     - ${c}`));
    } else {
      console.log('  ✅ 没有发现符号冲突');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 测试地图生成
   */
  private async testMapGeneration(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('测试地图生成:');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Load a test mapgen
    const mapgenPath = join(this.dataPath, 'mapgen', 'house', 'bungalow01.json');

    try {
      const mapgenContent = readFileSync(mapgenPath, 'utf-8');
      const mapgenData = JSON.parse(mapgenContent);
      const houseMapgen = Array.isArray(mapgenData) ? mapgenData[0] : mapgenData;

      console.log(`  测试 mapgen: ${houseMapgen.om_terrain || houseMapgen.omm}`);

      // Parse
      const parsed = CataclysmMapGenParser.parse(houseMapgen);
      console.log(`  解析成功: ${parsed.width}x${parsed.height}`);

      // Resolve palettes
      const resolved = this.paletteResolver.resolve(parsed);
      console.log(`  调色板解析完成:`);
      console.log(`    地形映射: ${resolved.terrain.size}`);
      console.log(`    家具映射: ${resolved.furniture.size}`);

      // Create generator
      const generator = new CataclysmMapGenGenerator(resolved, {
        terrain: this.terrainLoader,
        furniture: this.furnitureLoader,
        trap: this.trapLoader,
      });

      // Generate map
      const map = new GameMap();
      const context = {
        seed: Date.now(),
        position: new Tripoint({ x: 0, y: 0, z: 0 }),
        map,
        params: {},
        depth: 0,
      };

      const submap = generator.generate(context);

      console.log(`  ✅ 地图生成成功！`);
      console.log(`    Submap 尺寸: ${submap.size}x${submap.size}`);

      // Check for missing symbols
      const missingSymbols = new Set<string>();
      for (let y = 0; y < Math.min(3, parsed.height); y++) {
        const row = parsed.rows[y];
        for (const char of row) {
          const terrainId = submap.getTerrain(0, y);
          if (!this.terrainLoader.getData().get(terrainId)) {
            missingSymbols.add(char);
          }
        }
      }

      if (missingSymbols.size > 0) {
        console.log(`  ⚠️  未映射的符号: ${Array.from(missingSymbols).join(', ')}`);
      } else {
        console.log(`  ✅ 所有符号都已正确映射！`);
      }

    } catch (error) {
      console.log(`  ❌ 地图生成失败: ${(error as Error).message}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 生成验证报告
   */
  private async generateReport(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('集成验证报告:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const now = new Date();
    console.log(`  生成时间: ${now.toLocaleString('zh-CN')}\n`);

    console.log('  系统数据量:');
    console.log(`    地形: ${this.terrainLoader.getAll().length} 个定义`);
    console.log(`    家具: ${this.furnitureLoader.getAll().length} 个定义`);
    console.log(`    陷阱: ${this.trapLoader.getAll().length} 个定义`);
    console.log(`    地图生成: ${this.mapgenLoader.size()} 个定义`);
    console.log(`    调色板: ${this.mapgenLoader.paletteCount()} 个定义\n`);

    // 验证所有系统
    const results: ValidationResult[] = [];
    results.push(this.validateTerrain());
    results.push(this.validateFurniture());
    results.push(this.validateTrap());

    let totalIssues = 0;
    results.forEach(r => totalIssues += r.issues.length);

    console.log(`  验证结果:`);
    console.log(`    总问题数: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log(`    状态: ✅ 所有系统验证通过！`);
    } else {
      console.log(`    状态: ⚠️  发现 ${totalIssues} 个问题`);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 运行完整集成测试
   */
  private async runFullIntegrationTest(): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  运行完整集成测试...                                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    try {
      // Step 1: Load all data
      console.log('📦 步骤 1/5: 加载所有系统数据...');
      await this.loadAllData();

      // Step 2: Validate all systems
      console.log('\n🔍 步骤 2/5: 验证所有系统...');
      await this.validateAllSystems();

      // Step 3: Check cross-references
      console.log('\n🔗 步骤 3/5: 检查跨系统引用...');
      await this.checkCrossReferences();

      // Step 4: Test map generation
      console.log('\n🗺️  步骤 4/5: 测试地图生成...');
      await this.testMapGeneration();

      // Step 5: Generate report
      console.log('\n📊 步骤 5/5: 生成验证报告...');
      await this.generateReport();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ 集成测试完成！总用时: ${elapsed}秒\n`);

    } catch (error) {
      console.log(`\n❌ 集成测试失败: ${(error as Error).message}\n`);
    }
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
  const cli = new IntegrationCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

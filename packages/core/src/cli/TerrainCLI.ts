/**
 * Terrain CLI Tool
 *
 * 调试和验证地形系统
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';
import { TerrainLoader } from '../terrain/TerrainLoader';
import { TerrainParser, TerrainJson } from '../terrain/TerrainParser';

export class TerrainCLI {
  private readonly loader: TerrainLoader;
  private readonly parser: TerrainParser;
  private readonly dataPath: string;

  constructor(dataPath: string = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json') {
    this.loader = new TerrainLoader();
    this.parser = new TerrainParser();
    this.dataPath = dataPath;
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA Terrain 调试工具                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // 加载数据
    await this.initializeLoader();

    // 主菜单
    await this.mainMenu();
  }

  /**
   * 初始化数据加载器
   */
  private async initializeLoader(): Promise<void> {
    console.log('📦 正在从 Cataclysm-DDA 加载地形数据...\n');

    // Clear any previous data
    this.loader.clear();

    const furnitureTerrainDir = join(this.dataPath, 'furniture_and_terrain');
    const terrainFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('terrain-') && f.endsWith('.json'));

    console.log('  加载地形数据...');
    let totalTerrainDefs = 0;
    let skippedAbstract = 0;

    for (const file of terrainFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];

        // Count abstract terrains
        const abstractCount = jsonArray.filter((obj: any) => obj.abstract).length;
        skippedAbstract += abstractCount;

        await this.loader.loadFromJson(jsonArray);
        totalTerrainDefs += jsonArray.length;
      } catch (error) {
        console.log(`    ⚠️  跳过 ${file}: ${(error as Error).message}`);
      }
    }

    console.log(`  ✅ 从 ${terrainFiles.length} 个文件加载了 ${totalTerrainDefs} 个地形定义`);
    console.log(`  ℹ️  跳过了 ${skippedAbstract} 个抽象地形模板\n`);
    console.log('✅ 数据加载完成\n');
  }

  /**
   * 主菜单
   */
  private async mainMenu(): Promise<void> {
    const rl = this.createReadline();

    while (true) {
      this.showMainMenu();
      const choice = await this.prompt(rl, '请选择操作 [0-7]: ');

      switch (choice.trim()) {
        case '1':
          await this.showStats();
          break;
        case '2':
          await this.searchTerrain();
          break;
        case '3':
          await this.listBySymbol();
          break;
        case '4':
          await this.showTerrainDetails();
          break;
        case '5':
          await this.validateTerrain();
          break;
        case '6':
          await this.showCommonTerrains();
          break;
        case '7':
          await this.showFlags();
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
    console.log('1. 显示统计信息');
    console.log('2. 搜索地形');
    console.log('3. 按符号列出地形');
    console.log('4. 查看地形详情');
    console.log('5. 验证地形数据');
    console.log('6. 显示常用地形');
    console.log('7. 显示地形标志');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示统计信息
   */
  private async showStats(): Promise<void> {
    const stats = this.loader.getStats();
    const allTerrains = this.loader.getAll();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('地形统计信息:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  总地形数: ${stats.total}`);
    console.log(`  符号类型数: ${Object.keys(stats.bySymbol).length}`);
    console.log('\n  符号分布 (前 20 个):');

    const sortedSymbols = Object.entries(stats.bySymbol)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    sortedSymbols.forEach(([symbol, count]) => {
      const terrain = allTerrains.find(t => t.symbol === symbol);
      const name = terrain ? terrain.name.substring(0, 30) : 'N/A';
      console.log(`    '${symbol}' (${count} 个): ${name}`);
    });

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 搜索地形
   */
  private async searchTerrain(): Promise<void> {
    const rl = this.createReadline();
    const keyword = await this.prompt(rl, '\n请输入搜索关键词 (名称或ID): ');

    if (!keyword.trim()) {
      console.log('❌ 搜索关键词不能为空\n');
      return;
    }

    const allTerrains = this.loader.getAll();
    const keywordLower = keyword.toLowerCase();

    const results = allTerrains.filter(t =>
      t.name.toLowerCase().includes(keywordLower) ||
      (t.idString && t.idString.toLowerCase().includes(keywordLower)) ||
      t.description.toLowerCase().includes(keywordLower)
    );

    console.log(`\n找到 ${results.length} 个匹配的地形:\n`);

    const pageSize = 10;
    const totalPages = Math.ceil(results.length / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize;
      const end = Math.min(start + pageSize, results.length);
      const pageResults = results.slice(start, end);

      console.log(`第 ${page + 1}/${totalPages} 页:\n`);

      pageResults.forEach((terrain, index) => {
        console.log(`  ${start + index + 1}. ${terrain.symbol} ${terrain.idString}`);
        console.log(`     名称: ${terrain.name}`);
        console.log(`     描述: ${terrain.description.substring(0, 60)}...`);
        console.log(`     移动消耗: ${terrain.moveCost}, 覆盖度: ${terrain.coverage}`);
        console.log('');
      });

      if (page < totalPages - 1) {
        const action = await this.prompt(rl, '按回车继续，输入 q 返回: ');
        if (action.toLowerCase() === 'q') break;
      }
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 按符号列出地形
   */
  private async listBySymbol(): Promise<void> {
    const rl = this.createReadline();
    const symbol = await this.prompt(rl, '\n请输入符号 (如 ., #, |, 等): ');

    if (!symbol.trim()) {
      console.log('❌ 符号不能为空\n');
      return;
    }

    const allTerrains = this.loader.getAll();
    const matches = allTerrains.filter(t => t.symbol === symbol.trim());

    console.log(`\n找到 ${matches.length} 个使用符号 '${symbol}' 的地形:\n`);

    matches.forEach((terrain, index) => {
      console.log(`  ${index + 1}. ${terrain.idString}`);
      console.log(`     名称: ${terrain.name}`);
      console.log(`     颜色: ${terrain.color}, 移动消耗: ${terrain.moveCost}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 查看地形详情
   */
  private async showTerrainDetails(): Promise<void> {
    const rl = this.createReadline();
    const id = await this.prompt(rl, '\n请输入地形 ID: ');

    if (!id.trim()) {
      console.log('❌ ID 不能为空\n');
      return;
    }

    const terrain = this.loader.findByIdString(id.trim());

    if (!terrain) {
      console.log(`❌ 未找到 ID 为 '${id}' 的地形\n`);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('地形详情:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  ID: ${terrain.idString}`);
    console.log(`  数字 ID: ${terrain.id}`);
    console.log(`  名称: ${terrain.name}`);
    console.log(`  描述: ${terrain.description}`);
    console.log(`  符号: ${terrain.symbol}`);
    console.log(`  颜色: ${terrain.color}`);
    console.log(`  移动消耗: ${terrain.moveCost}`);
    console.log(`  覆盖度: ${terrain.coverage}`);
    console.log(`  标志数量: ${terrain.flags.size}`);
    if (terrain.flags.size > 0) {
      console.log(`  标志: ${Array.from(terrain.flags.values()).map(f => f.toString()).slice(0, 5).join(', ')}...`);
    }
    if (terrain.open) {
      console.log(`  打开状态: ${terrain.open}`);
    }
    if (terrain.close) {
      console.log(`  关闭状态: ${terrain.close}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 验证地形数据
   */
  private async validateTerrain(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('验证地形数据:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allTerrains = this.loader.getAll();
    const issues: string[] = [];

    let checked = 0;
    for (const terrain of allTerrains) {
      checked++;

      // 检查必填字段
      if (!terrain.name || terrain.name === '') {
        issues.push(`ID: ${terrain.idString} - 缺少名称`);
      }
      if (!terrain.symbol || terrain.symbol === '') {
        issues.push(`ID: ${terrain.idString} - 缺少符号`);
      }
      if (terrain.moveCost < 0) {
        issues.push(`ID: ${terrain.idString} - 无效的移动消耗: ${terrain.moveCost}`);
      }
      if (terrain.coverage < 0 || terrain.coverage > 100) {
        issues.push(`ID: ${terrain.idString} - 无效的覆盖度: ${terrain.coverage}`);
      }
    }

    console.log(`  检查了 ${checked} 个地形`);
    console.log(`  发现 ${issues.length} 个问题\n`);

    if (issues.length > 0) {
      console.log('  问题列表:');
      issues.slice(0, 20).forEach(issue => {
        console.log(`    - ${issue}`);
      });
      if (issues.length > 20) {
        console.log(`    ... 还有 ${issues.length - 20} 个问题`);
      }
    } else {
      console.log('  ✅ 所有地形数据都有效！');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示常用地形
   */
  private async showCommonTerrains(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('常用地形:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const commonIds = [
      't_floor', 't_dirt', 't_grass', 't_wall', 't_door_c',
      't_window_domestic', 't_stairs_down', 't_stairs_up',
      't_water_pool', 't_pavement', 't_sidewalk'
    ];

    console.log('  符号  ID                    名称');
    console.log('  ----  ----                  ----');

    for (const id of commonIds) {
      const terrain = this.loader.findByIdString(id);
      if (terrain && terrain.idString) {
        console.log(`  ${terrain.symbol.padEnd(4)}  ${terrain.idString.padEnd(20)}  ${terrain.name}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示地形标志
   */
  private async showFlags(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('地形标志统计:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allTerrains = this.loader.getAll();
    const flagCounts = new Map<string, number>();

    for (const terrain of allTerrains) {
      terrain.flags.values().forEach(flag => {
        const flagStr = flag.toString();
        flagCounts.set(flagStr, (flagCounts.get(flagStr) || 0) + 1);
      });
    }

    const sortedFlags = Array.from(flagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30);

    console.log(`  标志                                    使用次数`);
    console.log(`  ----                                    -----`);

    sortedFlags.forEach(([flag, count]) => {
      console.log(`  ${flag.padEnd(38)}  ${count}`);
    });

    console.log(`\n  总共 ${flagCounts.size} 个不同的标志`);
    console.log('═══════════════════════════════════════════════════════════\n');
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
  const cli = new TerrainCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

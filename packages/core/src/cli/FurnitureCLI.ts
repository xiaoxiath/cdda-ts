/**
 * Furniture CLI Tool
 *
 * 调试和验证家具系统
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';
import { FurnitureLoader } from '../furniture/FurnitureLoader';
import { FurnitureParser, FurnitureJson } from '../furniture/FurnitureParser';
import { getJsonPath } from '../config/CddaConfig';

export class FurnitureCLI {
  private readonly loader: FurnitureLoader;
  private readonly parser: FurnitureParser;
  private readonly dataPath: string;

  constructor(dataPath?: string) {
    this.loader = new FurnitureLoader();
    this.parser = new FurnitureParser();
    this.dataPath = dataPath ?? getJsonPath();
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA Furniture 调试工具                      ║');
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
    console.log('📦 正在从 Cataclysm-DDA 加载家具数据...\n');

    // Clear any previous data
    this.loader.clear();

    const furnitureTerrainDir = join(this.dataPath, 'furniture_and_terrain');
    const furnitureFiles = readdirSync(furnitureTerrainDir).filter(f => f.startsWith('furniture-') && f.endsWith('.json'));

    console.log('  加载家具数据...');
    let totalFurnitureDefs = 0;
    let skippedErrors = 0;

    for (const file of furnitureFiles) {
      try {
        const filePath = join(furnitureTerrainDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);
        const jsonArray = Array.isArray(json) ? json : [json];

        await this.loader.loadFromJson(jsonArray);
        totalFurnitureDefs += jsonArray.length;
      } catch (error) {
        skippedErrors++;
      }
    }

    console.log(`  ✅ 从 ${furnitureFiles.length} 个文件加载了 ${totalFurnitureDefs} 个家具定义`);
    if (skippedErrors > 0) {
      console.log(`  ℹ️  跳过了 ${skippedErrors} 个有错误的文件\n`);
    }
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
          await this.searchFurniture();
          break;
        case '3':
          await this.listBySymbol();
          break;
        case '4':
          await this.showFurnitureDetails();
          break;
        case '5':
          await this.validateFurniture();
          break;
        case '6':
          await this.showCommonFurniture();
          break;
        case '7':
          await this.showProperties();
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
    console.log('2. 搜索家具');
    console.log('3. 按符号列出家具');
    console.log('4. 查看家具详情');
    console.log('5. 验证家具数据');
    console.log('6. 显示常用家具');
    console.log('7. 显示家具属性');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示统计信息
   */
  private async showStats(): Promise<void> {
    const allFurniture = this.loader.getAll();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('家具统计信息:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  总家具数: ${allFurniture.length}`);

    // 统计符号分布
    const bySymbol: Record<string, number> = {};
    allFurniture.forEach(f => {
      bySymbol[f.symbol] = (bySymbol[f.symbol] || 0) + 1;
    });
    console.log(`  符号类型数: ${Object.keys(bySymbol).length}`);
    console.log('\n  符号分布 (前 20 个):');

    const sortedSymbols = Object.entries(bySymbol)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    sortedSymbols.forEach(([symbol, count]) => {
      const furniture = allFurniture.find(f => f.symbol === symbol);
      const name = furniture ? furniture.name.substring(0, 30) : 'N/A';
      console.log(`    '${symbol}' (${count} 个): ${name}`);
    });

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 搜索家具
   */
  private async searchFurniture(): Promise<void> {
    const rl = this.createReadline();
    const keyword = await this.prompt(rl, '\n请输入搜索关键词 (名称或ID): ');

    if (!keyword.trim()) {
      console.log('❌ 搜索关键词不能为空\n');
      return;
    }

    const allFurniture = this.loader.getAll();
    const keywordLower = keyword.toLowerCase();

    const results = allFurniture.filter(f =>
      f.name.toLowerCase().includes(keywordLower) ||
      (f.idString && f.idString.toLowerCase().includes(keywordLower)) ||
      f.description.toLowerCase().includes(keywordLower)
    );

    console.log(`\n找到 ${results.length} 个匹配的家具:\n`);

    const pageSize = 10;
    const totalPages = Math.ceil(results.length / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize;
      const end = Math.min(start + pageSize, results.length);
      const pageResults = results.slice(start, end);

      console.log(`第 ${page + 1}/${totalPages} 页:\n`);

      pageResults.forEach((furniture, index) => {
        console.log(`  ${start + index + 1}. ${furniture.symbol} ${furniture.idString}`);
        console.log(`     名称: ${furniture.name}`);
        console.log(`     描述: ${furniture.description.substring(0, 60)}...`);
        console.log(`     移动消耗修正: ${furniture.moveCostMod}, 覆盖度: ${furniture.coverage}`);
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
   * 按符号列出家具
   */
  private async listBySymbol(): Promise<void> {
    const rl = this.createReadline();
    const symbol = await this.prompt(rl, '\n请输入符号 (如 +, =, _, 等): ');

    if (!symbol.trim()) {
      console.log('❌ 符号不能为空\n');
      return;
    }

    const allFurniture = this.loader.getAll();
    const matches = allFurniture.filter(f => f.symbol === symbol.trim());

    console.log(`\n找到 ${matches.length} 个使用符号 '${symbol}' 的家具:\n`);

    matches.forEach((furniture, index) => {
      console.log(`  ${index + 1}. ${furniture.idString}`);
      console.log(`     名称: ${furniture.name}`);
      console.log(`     颜色: ${furniture.color}, 移动消耗修正: ${furniture.moveCostMod}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 查看家具详情
   */
  private async showFurnitureDetails(): Promise<void> {
    const rl = this.createReadline();
    const id = await this.prompt(rl, '\n请输入家具 ID: ');

    if (!id.trim()) {
      console.log('❌ ID 不能为空\n');
      return;
    }

    const furniture = this.loader.findByIdString(id.trim());

    if (!furniture) {
      console.log(`❌ 未找到 ID 为 '${id}' 的家具\n`);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('家具详情:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  ID: ${furniture.idString}`);
    console.log(`  数字 ID: ${furniture.id}`);
    console.log(`  名称: ${furniture.name}`);
    console.log(`  描述: ${furniture.description}`);
    console.log(`  符号: ${furniture.symbol}`);
    console.log(`  颜色: ${furniture.color}`);
    console.log(`  移动消耗修正: ${furniture.moveCostMod}`);
    console.log(`  移动消耗: ${furniture.moveCost}`);
    console.log(`  覆盖度: ${furniture.coverage}`);
    console.log(`  舒适度: ${furniture.comfort}`);
    console.log(`  地板床铺保暖: ${furniture.floorBeddingWarmth}`);
    console.log(`  所需力量: ${furniture.requiredStr}`);
    console.log(`  质量: ${furniture.mass ?? 'N/A'}`);
    console.log(`  体积: ${furniture.volume ?? 'N/A'}`);
    console.log(`  容量: ${furniture.kegCapacity ?? 'N/A'}`);
    console.log(`  最大体积: ${furniture.maxVolume ?? 'N/A'}`);
    console.log(`  标志数量: ${furniture.flags.size}`);
    if (furniture.flags.size > 0) {
      const flags = Array.from(furniture.flags.values()).map(f => f.toString()).slice(0, 5);
      console.log(`  标志: ${flags.join(', ')}...`);
    }
    if (furniture.open) {
      console.log(`  打开状态: ${furniture.open}`);
    }
    if (furniture.close) {
      console.log(`  关闭状态: ${furniture.close}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 验证家具数据
   */
  private async validateFurniture(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('验证家具数据:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allFurniture = this.loader.getAll();
    const issues: string[] = [];

    let checked = 0;
    for (const furniture of allFurniture) {
      checked++;

      // 检查必填字段
      if (!furniture.name || furniture.name === '') {
        issues.push(`ID: ${furniture.idString} - 缺少名称`);
      }
      if (!furniture.symbol || furniture.symbol === '') {
        issues.push(`ID: ${furniture.idString} - 缺少符号`);
      }
      if (furniture.moveCost < 0) {
        issues.push(`ID: ${furniture.idString} - 无效的移动消耗: ${furniture.moveCost}`);
      }
      if (furniture.coverage < 0) {
        issues.push(`ID: ${furniture.idString} - 无效的覆盖度: ${furniture.coverage}`);
      }
      if (furniture.comfort < 0) {
        issues.push(`ID: ${furniture.idString} - 无效的舒适度: ${furniture.comfort}`);
      }
      // Note: required_str can be -1 to mean "immovable", which is valid
      if (furniture.requiredStr < -1) {
        issues.push(`ID: ${furniture.idString} - 无效的所需力量: ${furniture.requiredStr}`);
      }
    }

    console.log(`  检查了 ${checked} 个家具`);
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
      console.log('  ✅ 所有家具数据都有效！');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示常用家具
   */
  private async showCommonFurniture(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('常用家具:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const commonIds = [
      'f_chair', 'f_table', 'f_bed', 'f_dresser', 'f_cabinet',
      'f_sofa', 'f_locker', 'f_rack', 'fdesk', 'f_shelf',
      'f_stool', 'f_bench', 'f_armchair', 'f_fireplace', 'f_fridge'
    ];

    console.log('  符号  ID                    名称');
    console.log('  ----  ----                  ----');

    for (const id of commonIds) {
      const furniture = this.loader.findByIdString(id);
      if (furniture && furniture.idString) {
        console.log(`  ${furniture.symbol.padEnd(4)}  ${furniture.idString.padEnd(20)}  ${furniture.name}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示家具属性统计
   */
  private async showProperties(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('家具属性统计:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allFurniture = this.loader.getAll();

    // 舒适度分布
    const comfortLevels = new Map<string, number>();
    allFurniture.forEach(f => {
      const level = f.comfort === 0 ? '0 (无)' : f.comfort > 0 ? `${f.comfort}` : '负值';
      comfortLevels.set(level, (comfortLevels.get(level) || 0) + 1);
    });

    console.log('  舒适度分布:');
    const sortedComfort = Array.from(comfortLevels.entries()).sort(([, a], [, b]) => b - a).slice(0, 10);
    sortedComfort.forEach(([level, count]) => {
      console.log(`    ${level.padEnd(10)}: ${count} 个`);
    });

    // 质量分布
    const withMass = allFurniture.filter(f => f.mass !== undefined && f.mass !== null);
    console.log(`\n  有质量定义: ${withMass.length} 个家具`);

    // 体积分布
    const withVolume = allFurniture.filter(f => f.volume !== undefined && f.volume !== null);
    console.log(`  有体积定义: ${withVolume.length} 个家具`);

    // 标志统计
    const flagCounts = new Map<string, number>();
    allFurniture.forEach(f => {
      f.flags.values().forEach(flag => {
        const flagStr = flag.toString();
        flagCounts.set(flagStr, (flagCounts.get(flagStr) || 0) + 1);
      });
    });

    const sortedFlags = Array.from(flagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);

    console.log('\n  前 15 个常用标志:');
    sortedFlags.forEach(([flag, count]) => {
      console.log(`    ${flag.padEnd(40)}: ${count}`);
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
  const cli = new FurnitureCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

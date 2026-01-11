/**
 * Trap CLI Tool
 *
 * 调试和验证陷阱系统
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';
import { TrapLoader } from '../trap/TrapLoader';
import { TrapParser, TrapJson } from '../trap/TrapParser';

export class TrapCLI {
  private readonly loader: TrapLoader;
  private readonly parser: TrapParser;
  private readonly dataPath: string;

  constructor(dataPath: string = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json') {
    this.loader = new TrapLoader();
    this.parser = new TrapParser();
    this.dataPath = dataPath;
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA Trap 调试工具                         ║');
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
    console.log('📦 正在从 Cataclysm-DDA 加载陷阱数据...\n');

    // Clear any previous data
    this.loader.clear();

    const trapPath = join(this.dataPath, 'traps.json');

    try {
      console.log('  加载陷阱数据...');
      const trapContent = readFileSync(trapPath, 'utf-8');
      const trapJson = JSON.parse(trapContent);
      const trapArray = Array.isArray(trapJson) ? trapJson : [trapJson];

      await this.loader.loadFromJson(trapArray);
      console.log(`  ✅ 加载了 ${trapArray.length} 个陷阱定义\n`);
    } catch (error) {
      console.log(`  ❌ 加载失败: ${(error as Error).message}\n`);
      throw error;
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
      const choice = await this.prompt(rl, '请选择操作 [0-6]: ');

      switch (choice.trim()) {
        case '1':
          await this.showStats();
          break;
        case '2':
          await this.searchTrap();
          break;
        case '3':
          await this.showTrapDetails();
          break;
        case '4':
          await this.validateTrap();
          break;
        case '5':
          await this.showActionDistribution();
          break;
        case '6':
          await this.showFlagDistribution();
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
    console.log('2. 搜索陷阱');
    console.log('3. 查看陷阱详情');
    console.log('4. 验证陷阱数据');
    console.log('5. 显示陷阱动作分布');
    console.log('6. 显示陷阱标志分布');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示统计信息
   */
  private async showStats(): Promise<void> {
    const allTraps = this.loader.getAll();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('陷阱统计信息:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  总陷阱数: ${allTraps.length}`);

    // 统计符号分布
    const bySymbol: Record<string, number> = {};
    allTraps.forEach(t => {
      bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + 1;
    });
    console.log(`  符号类型数: ${Object.keys(bySymbol).length}`);
    console.log('\n  符号分布:');

    Object.entries(bySymbol).forEach(([symbol, count]) => {
      const trap = allTraps.find(t => t.symbol === symbol);
      const name = trap ? trap.name.substring(0, 30) : 'N/A';
      console.log(`    '${symbol}' (${count} 个): ${name}`);
    });

    // 统计可见性分布
    const visibilityGroups = new Map<string, number>();
    allTraps.forEach(t => {
      const range = t.visibility < 3 ? '易见' : t.visibility < 6 ? '中等' : '难见';
      visibilityGroups.set(range, (visibilityGroups.get(range) || 0) + 1);
    });

    console.log('\n  可见性分布:');
    visibilityGroups.forEach((count, range) => {
      console.log(`    ${range}: ${count} 个`);
    });

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 搜索陷阱
   */
  private async searchTrap(): Promise<void> {
    const rl = this.createReadline();
    const keyword = await this.prompt(rl, '\n请输入搜索关键词 (名称或ID): ');

    if (!keyword.trim()) {
      console.log('❌ 搜索关键词不能为空\n');
      return;
    }

    const allTraps = this.loader.getAll();
    const keywordLower = keyword.toLowerCase();

    const results = allTraps.filter(t =>
      t.name.toLowerCase().includes(keywordLower) ||
      t.id.toLowerCase().includes(keywordLower) ||
      t.description.toLowerCase().includes(keywordLower)
    );

    console.log(`\n找到 ${results.length} 个匹配的陷阱:\n`);

    const pageSize = 10;
    const totalPages = Math.ceil(results.length / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize;
      const end = Math.min(start + pageSize, results.length);
      const pageResults = results.slice(start, end);

      console.log(`第 ${page + 1}/${totalPages} 页:\n`);

      pageResults.forEach((trap, index) => {
        console.log(`  ${start + index + 1}. ${trap.symbol} ${trap.id}`);
        console.log(`     名称: ${trap.name}`);
        console.log(`     描述: ${trap.description.substring(0, 60)}...`);
        console.log(`     可见性: ${trap.visibility}, 难度: ${trap.difficulty}, 回避度: ${trap.avoidance}`);
        console.log(`     动作: ${trap.action}`);
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
   * 查看陷阱详情
   */
  private async showTrapDetails(): Promise<void> {
    const rl = this.createReadline();
    const id = await this.prompt(rl, '\n请输入陷阱 ID: ');

    if (!id.trim()) {
      console.log('❌ ID 不能为空\n');
      return;
    }

    const trap = this.loader.getData().get(id.trim());

    if (!trap) {
      console.log(`❌ 未找到 ID 为 '${id}' 的陷阱\n`);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('陷阱详情:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  ID: ${trap.id}`);
    console.log(`  名称: ${trap.name}`);
    console.log(`  描述: ${trap.description}`);
    console.log(`  符号: ${trap.symbol}`);
    console.log(`  颜色: ${trap.color}`);
    console.log(`  可见性: ${trap.visibility}`);
    console.log(`  回避度: ${trap.avoidance}`);
    console.log(`  难度: ${trap.difficulty}`);
    console.log(`  陷阱半径: ${trap.trapRadius}`);
    console.log(`  触发权重: ${trap.triggerWeight}`);
    console.log(`  温和: ${trap.benign ? '是' : '否'}`);
    console.log(`  总是隐形: ${trap.alwaysInvisible ? '是' : '否'}`);
    console.log(`  动作: ${trap.action}`);
    console.log(`  标志数量: ${trap.flags.size}`);
    if (trap.flags.size > 0) {
      console.log(`  标志: ${Array.from(trap.flags.values()).map(f => f.toString()).join(', ')}`);
    }
    if (trap.complexity > 0) {
      console.log(`  复杂度: ${trap.complexity}`);
    }
    if (trap.fun > 0) {
      console.log(`  娱乐值: ${trap.fun}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 验证陷阱数据
   */
  private async validateTrap(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('验证陷阱数据:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allTraps = this.loader.getAll();
    const issues: string[] = [];

    let checked = 0;
    for (const trap of allTraps) {
      checked++;

      // 检查必填字段
      // Note: Invisible/internal traps may have empty names
      if (!trap.name || trap.name === '') {
        if (!trap.alwaysInvisible) {
          issues.push(`ID: ${trap.id} - 缺少名称`);
        }
      }
      if (!trap.symbol || trap.symbol === '') {
        issues.push(`ID: ${trap.id} - 缺少符号`);
      }
      // Note: visibility can be -1 (invisible) or higher values for special traps
      if (trap.visibility < -1) {
        issues.push(`ID: ${trap.id} - 无效的可见性: ${trap.visibility}`);
      }
      // Note: difficulty and avoidance can vary widely in CDDA
      // -1 to 10 is common, but some traps have values up to 20 or more
      if (trap.difficulty < -1) {
        issues.push(`ID: ${trap.id} - 无效的难度: ${trap.difficulty}`);
      }
      if (trap.avoidance < -1) {
        issues.push(`ID: ${trap.id} - 无效的回避度: ${trap.avoidance}`);
      }
      if (trap.triggerWeight < 0 || trap.triggerWeight > 1000) {
        issues.push(`ID: ${trap.id} - 无效的触发权重: ${trap.triggerWeight}`);
      }
    }

    console.log(`  检查了 ${checked} 个陷阱`);
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
      console.log('  ✅ 所有陷阱数据都有效！');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示陷阱动作分布
   */
  private async showActionDistribution(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('陷阱动作分布:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allTraps = this.loader.getAll();
    const actionCounts = new Map<string, number>();

    allTraps.forEach(trap => {
      const action = trap.action;
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    });

    console.log(`  总动作类型数: ${actionCounts.size}\n`);
    console.log('  动作分布 (按使用次数排序):');

    const sortedActions = Array.from(actionCounts.entries())
      .sort(([, a], [, b]) => b - a);

    sortedActions.forEach(([action, count]) => {
      const traps = allTraps.filter(t => t.action === action);
      const examples = traps.slice(0, 2).map(t => t.name);
      console.log(`    ${action.padEnd(20)}: ${count} 个 (例如: ${examples.join(', ')})`);
    });

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示陷阱标志分布
   */
  private async showFlagDistribution(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('陷阱标志统计:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allTraps = this.loader.getAll();
    const flagCounts = new Map<string, number>();

    allTraps.forEach(trap => {
      trap.flags.values().forEach(flag => {
        const flagStr = flag.toString();
        flagCounts.set(flagStr, (flagCounts.get(flagStr) || 0) + 1);
      });
    });

    const sortedFlags = Array.from(flagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30);

    console.log(`  总共 ${flagCounts.size} 个不同的标志\n`);

    console.log('  前 30 个常用标志:');
    sortedFlags.forEach(([flag, count]) => {
      console.log(`    ${flag.padEnd(40)}: ${count}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════\n');
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
  const cli = new TrapCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

/**
 * NPC CLI Tool
 *
 * 调试和验证 NPC 系统
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createInterface, Interface as ReadlineInterface } from 'readline';

export interface NPCClassJson {
  type: string;
  id: string;
  name: { str: string };
  job_description?: string;
  common?: boolean;
  bonus_str?: number | object;
  bonus_dex?: number | object;
  bonus_int?: number | object;
  bonus_per?: number | object;
  bonus_aggression?: number | object;
  skills?: Array<{ skill: string; level?: object; bonus?: number | object }>;
  traits?: Array<any>;
  [key: string]: unknown;
}

export class NPCCLI {
  private readonly dataPath: string;
  private readonly npcClasses: Map<string, NPCClassJson> = new Map();

  constructor(dataPath: string = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json') {
    this.dataPath = dataPath;
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA NPC 调试工具                         ║');
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
    console.log('📦 正在从 Cataclysm-DDA 加载 NPC 数据...\n');

    const classesPath = join(this.dataPath, 'npcs', 'classes.json');

    try {
      console.log('  加载 NPC 类数据...');
      const content = readFileSync(classesPath, 'utf-8');
      const json = JSON.parse(content);
      const jsonArray = Array.isArray(json) ? json : [json];

      let loadedCount = 0;
      for (const item of jsonArray) {
        if (item.type === 'npc_class') {
          this.npcClasses.set(item.id, item as NPCClassJson);
          loadedCount++;
        }
      }

      console.log(`  ✅ 加载了 ${loadedCount} 个 NPC 类定义\n`);
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
          await this.searchNPCClass();
          break;
        case '3':
          await this.showNPCClassDetails();
          break;
        case '4':
          await this.validateNPCData();
          break;
        case '5':
          await this.showAttitudeDistribution();
          break;
        case '6':
          await this.showCommonClasses();
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
    console.log('2. 搜索 NPC 类');
    console.log('3. 查看 NPC 类详情');
    console.log('4. 验证 NPC 数据');
    console.log('5. 显示态度分布');
    console.log('6. 显示常用 NPC 类');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示统计信息
   */
  private async showStats(): Promise<void> {
    const allClasses = Array.from(this.npcClasses.values());

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('NPC 类统计信息:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  总 NPC 类数: ${allClasses.length}`);

    // 统计 common 类
    const commonClasses = allClasses.filter(c => c.common !== false);
    console.log(`  常见类: ${commonClasses.length}`);
    console.log(`  罕见类: ${allClasses.length - commonClasses.length}`);

    // 统计有技能的类
    const withSkills = allClasses.filter(c => c.skills && c.skills.length > 0);
    console.log(`  有技能定义: ${withSkills.length}`);

    // 统计有特征（traits）的类
    const withTraits = allClasses.filter(c => c.traits && c.traits.length > 0);
    console.log(`  有特征定义: ${withTraits.length}`);

    // 统计有属性加成的类
    const withStats = allClasses.filter(c =>
      c.bonus_str !== undefined ||
      c.bonus_dex !== undefined ||
      c.bonus_int !== undefined ||
      c.bonus_per !== undefined
    );
    console.log(`  有属性加成: ${withStats.length}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 搜索 NPC 类
   */
  private async searchNPCClass(): Promise<void> {
    const rl = this.createReadline();
    const keyword = await this.prompt(rl, '\n请输入搜索关键词 (ID或名称): ');

    if (!keyword.trim()) {
      console.log('❌ 搜索关键词不能为空\n');
      return;
    }

    const allClasses = Array.from(this.npcClasses.values());
    const keywordLower = keyword.toLowerCase();

    const results = allClasses.filter(c => {
      const name = c.name?.str || '';
      return c.id.toLowerCase().includes(keywordLower) ||
             name.toLowerCase().includes(keywordLower) ||
             (c.job_description && c.job_description.toLowerCase().includes(keywordLower));
    });

    console.log(`\n找到 ${results.length} 个匹配的 NPC 类:\n`);

    const pageSize = 10;
    const totalPages = Math.ceil(results.length / pageSize);

    for (let page = 0; page < totalPages; page++) {
      const start = page * pageSize;
      const end = Math.min(start + pageSize, results.length);
      const pageResults = results.slice(start, end);

      console.log(`第 ${page + 1}/${totalPages} 页:\n`);

      pageResults.forEach((npcClass, index) => {
        console.log(`  ${start + index + 1}. ${npcClass.id}`);
        console.log(`     名称: ${npcClass.name?.str || 'N/A'}`);
        console.log(`     描述: ${npcClass.job_description || 'N/A'}`);
        console.log(`     常见: ${npcClass.common !== false ? '是' : '否'}`);
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
   * 查看 NPC 类详情
   */
  private async showNPCClassDetails(): Promise<void> {
    const rl = this.createReadline();
    const id = await this.prompt(rl, '\n请输入 NPC 类 ID: ');

    if (!id.trim()) {
      console.log('❌ ID 不能为空\n');
      return;
    }

    const npcClass = this.npcClasses.get(id.trim());

    if (!npcClass) {
      console.log(`❌ 未找到 ID 为 '${id}' 的 NPC 类\n`);
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('NPC 类详情:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  ID: ${npcClass.id}`);
    console.log(`  名称: ${npcClass.name?.str || 'N/A'}`);
    console.log(`  描述: ${npcClass.job_description || 'N/A'}`);
    console.log(`  常见: ${npcClass.common !== false ? '是' : '否'}`);

    // 显示属性加成
    console.log('\n  属性加成:');
    console.log(`    力量: ${this.formatBonus(npcClass.bonus_str)}`);
    console.log(`    敏捷: ${this.formatBonus(npcClass.bonus_dex)}`);
    console.log(`    智力: ${this.formatBonus(npcClass.bonus_int)}`);
    console.log(`    感知: ${this.formatBonus(npcClass.bonus_per)}`);
    console.log(`    攻击性: ${this.formatBonus(npcClass.bonus_aggression)}`);

    // 显示技能
    if (npcClass.skills && npcClass.skills.length > 0) {
      console.log(`\n  技能数: ${npcClass.skills.length}`);
      npcClass.skills.slice(0, 10).forEach((skill, index) => {
        const levelStr = skill.level ? JSON.stringify(skill.level) : 'N/A';
        const bonusStr = skill.bonus !== undefined ? `, 加成: ${JSON.stringify(skill.bonus)}` : '';
        console.log(`    ${index + 1}. ${skill.skill}${bonusStr ? ` (等级: ${levelStr}${bonusStr})` : ''}`);
      });
      if (npcClass.skills.length > 10) {
        console.log(`    ... 还有 ${npcClass.skills.length - 10} 个技能`);
      }
    }

    // 显示特征组
    if (npcClass.traits && npcClass.traits.length > 0) {
      console.log(`\n  特征组数: ${npcClass.traits.length}`);
      npcClass.traits.slice(0, 5).forEach((trait, index) => {
        console.log(`    ${index + 1}. ${JSON.stringify(trait).substring(0, 60)}`);
      });
      if (npcClass.traits.length > 5) {
        console.log(`    ... 还有 ${npcClass.traits.length - 5} 个特征组`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 验证 NPC 数据
   */
  private async validateNPCData(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('验证 NPC 数据:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allClasses = Array.from(this.npcClasses.values());
    const issues: string[] = [];

    let checked = 0;
    for (const npcClass of allClasses) {
      checked++;

      // 检查必填字段
      if (!npcClass.id || npcClass.id === '') {
        issues.push(`缺少 ID`);
      }
      if (!npcClass.name || !npcClass.name.str) {
        issues.push(`ID: ${npcClass.id} - 缺少名称`);
      }
      if (npcClass.type !== 'npc_class') {
        issues.push(`ID: ${npcClass.id} - 类型不是 npc_class`);
      }
    }

    console.log(`  检查了 ${checked} 个 NPC 类`);
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
      console.log('  ✅ 所有 NPC 类数据都有效！');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示态度分布
   */
  private async showAttitudeDistribution(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('NPC 态度分析:');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('  态度范围说明:');
    console.log('    0-3: 敌对 (Hostile)');
    console.log('    4-6: 中立 (Neutral)');
    console.log('    7-10: 友好 (Friendly)');

    // 统计攻击性加成分布
    const allClasses = Array.from(this.npcClasses.values());
    const aggressionStats = {
      hasBonus: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    allClasses.forEach(npcClass => {
      if (npcClass.bonus_aggression !== undefined) {
        aggressionStats.hasBonus++;
        const bonus = this.parseBonus(npcClass.bonus_aggression);
        if (bonus > 0) {
          aggressionStats.positive++;
        } else if (bonus < 0) {
          aggressionStats.negative++;
        } else {
          aggressionStats.neutral++;
        }
      }
    });

    console.log(`\n  攻击性加成分布:`);
    console.log(`    有攻击性定义: ${aggressionStats.hasBonus}`);
    console.log(`    正向 (更攻击): ${aggressionStats.positive}`);
    console.log(`    负向 (更和平): ${aggressionStats.negative}`);
    console.log(`    中性: ${aggressionStats.neutral}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示常用 NPC 类
   */
  private async showCommonClasses(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('常用 NPC 类:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const commonIds = [
      'NC_SHOPKEEP',
      'NC_DOCTOR',
      'NC_VETERINARIAN',
      'NC_HUNTER',
      'NC_SOLDIER',
      'NC_THUG',
      'NC_COWBOY',
      'NC_BARTENDER',
      'NC_TRADER',
      'NC_SCRapper',
    ];

    console.log('  ID                        名称                      描述');
    console.log('  ----                      ----                      ----');

    for (const id of commonIds) {
      const npcClass = this.npcClasses.get(id);
      if (npcClass) {
        const name = npcClass.name?.str || 'N/A';
        const desc = (npcClass.job_description || 'N/A').substring(0, 30);
        console.log(`  ${id.padEnd(24)}  ${name.padEnd(24)}  ${desc}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 格式化加成值
   */
  private formatBonus(bonus: number | object | undefined): string {
    if (bonus === undefined) {
      return 'N/A';
    }
    if (typeof bonus === 'number') {
      return bonus.toString();
    }
    return JSON.stringify(bonus);
  }

  /**
   * 解析加成值（用于统计）
   */
  private parseBonus(bonus: number | object): number {
    if (typeof bonus === 'number') {
      return bonus;
    }
    // 对于复杂的 dice/rng 表达式，尝试估算
    const str = JSON.stringify(bonus);
    const rngMatch = str.match(/rng"?':?\s*\[\s*(-?\d+)/);
    if (rngMatch) {
      return parseFloat(rngMatch[1]);
    }
    return 0;
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
  const cli = new NPCCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

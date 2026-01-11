/**
 * Creature CLI Tool
 *
 * 调试和验证生物系统
 */

import { createInterface, Interface as ReadlineInterface } from 'readline';
import { Tripoint } from '../coordinates/Tripoint';
import { BodyPartId, BodyPartType, CreatureSize, CreatureType, CharacterStats } from '../creature/types';
import { NPC } from '../creature/NPC';
import { NPCClassLoader, NPCManager } from '../creature/NPCClassLoader';

export class CreatureCLI {
  private readonly npcLoader: NPCClassLoader;
  private readonly npcManager: NPCManager;

  constructor() {
    this.npcLoader = new NPCClassLoader();
    this.npcManager = new NPCManager();
  }

  /**
   * 启动 CLI
   */
  async run(): Promise<void> {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       Cataclysm-DDA Creature 调试工具                     ║');
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
      const choice = await this.prompt(rl, '请选择操作 [0-8]: ');

      switch (choice.trim()) {
        case '1':
          await this.showBodyPartInfo();
          break;
        case '2':
          await this.showCreatureTypes();
          break;
        case '3':
          await this.showNPCClasses();
          break;
        case '4':
          await this.createTestCreature();
          break;
        case '5':
          await this.validateStats();
          break;
        case '6':
          await this.showSizeInfo();
          break;
        case '7':
          await this.testHealthSystem();
          break;
        case '8':
          await this.showAllNPCs();
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
    console.log('1. 显示身体部位信息');
    console.log('2. 显示生物类型');
    console.log('3. 显示 NPC 类');
    console.log('4. 创建测试生物');
    console.log('5. 验证属性系统');
    console.log('6. 显示生物大小信息');
    console.log('7. 测试健康系统');
    console.log('8. 显示所有 NPC');
    console.log('0. 退出');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示身体部位信息
   */
  private async showBodyPartInfo(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('身体部位信息:');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('  身体部位 ID (BodyPartId):');
    console.log('  ──────────────────────────────────────────────────────');

    const bodyPartNames: Record<BodyPartId, string> = {
      [BodyPartId.TORSO]: '躯干 (TORSO)',
      [BodyPartId.HEAD]: '头 (HEAD)',
      [BodyPartId.EYES]: '眼 (EYES)',
      [BodyPartId.MOUTH]: '嘴 (MOUTH)',
      [BodyPartId.ARM_L]: '左臂 (ARM_L)',
      [BodyPartId.ARM_R]: '右臂 (ARM_R)',
      [BodyPartId.HAND_L]: '左手 (HAND_L)',
      [BodyPartId.HAND_R]: '右手 (HAND_R)',
      [BodyPartId.LEG_L]: '左腿 (LEG_L)',
      [BodyPartId.LEG_R]: '右腿 (LEG_R)',
      [BodyPartId.FOOT_L]: '左脚 (FOOT_L)',
      [BodyPartId.FOOT_R]: '右脚 (FOOT_R)',
    };

    Object.entries(bodyPartNames).forEach(([id, name]) => {
      console.log(`    ${id.padEnd(2)} = ${name}`);
    });

    console.log('\n  身体部位类型 (BodyPartType):');
    console.log('  ──────────────────────────────────────────────────────');

    const bodyPartTypes: Record<BodyPartType, string> = {
      [BodyPartType.HEAD]: '头部 - 盔甲位置，重要部位',
      [BodyPartType.TORSO]: '躯干 - 质量中心',
      [BodyPartType.SENSOR]: '传感器 - 提供视野',
      [BodyPartType.MOUTH]: '嘴 - 进食和尖叫',
      [BodyPartType.ARM]: '手臂 - 可操作对象',
      [BodyPartType.HAND]: '手 - 操作对象',
      [BodyPartType.LEG]: '腿 - 提供动力',
      [BodyPartType.FOOT]: '脚 - 平衡',
      [BodyPartType.WING]: '翅膀 - 减少坠落伤害',
      [BodyPartType.TAIL]: '尾巴 - 平衡或操作',
      [BodyPartType.OTHER]: '其他 - 角等通用肢体',
    };

    Object.entries(bodyPartTypes).forEach(([id, description]) => {
      console.log(`    ${id.padEnd(2)} = ${description}`);
    });

    console.log(`\n  总身体部位数: ${Object.keys(BodyPartId).length / 2}`);
    console.log(`  总身体部位类型数: ${Object.keys(BodyPartType).length / 2}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示生物类型
   */
  private async showCreatureTypes(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('生物类型 (CreatureType):');
    console.log('═══════════════════════════════════════════════════════════\n');

    const creatureTypes: Record<string, string> = {
      'MONSTER': '怪物 (MONSTER) - 游戏中的怪物生物',
      'CHARACTER': '角色 (CHARACTER) - 基础角色类型',
      'AVATAR': '玩家 (AVATAR) - 玩家控制的角色',
      'NPC': 'NPC (NPC) - 非玩家角色',
    };

    Object.entries(creatureTypes).forEach(([type, description]) => {
      console.log(`  ${type.padEnd(12)} = ${description}`);
    });

    console.log(`\n  总类型数: ${Object.keys(creatureTypes).length}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示 NPC 类
   */
  private async showNPCClasses(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('NPC 类定义:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const classIds = [
      'NC_SOLDIER',
      'NC_THUG',
      'NC_SURVIVOR',
      'NC_MERCHANT',
      'NC_DOCTOR',
      'NC_FARMER',
      'NC_APIS',
    ];

    console.log(`  已注册 NPC 类数: ${classIds.length}\n`);

    for (const classId of classIds) {
      const npcClass = this.npcLoader.getClass(classId);
      if (npcClass) {
        console.log(`  ${classId}:`);
        console.log(`    名称: ${npcClass.name}`);
        console.log(`    描述: ${npcClass.description || 'N/A'}`);
        if (npcClass.defaultStats) {
          console.log(`    属性: 力量=${npcClass.defaultStats.str}, ` +
                     `敏捷=${npcClass.defaultStats.dex}, ` +
                     `智力=${npcClass.defaultStats.int}, ` +
                     `感知=${npcClass.defaultStats.per}`);
        }
        console.log(`    HP 乘数: ${npcClass.hpMultiplier || 1.0}`);
        if (npcClass.skills) {
          const skillEntries = Object.entries(npcClass.skills);
          console.log(`    技能数: ${skillEntries.length}`);
          skillEntries.slice(0, 3).forEach(([skill, level]) => {
            console.log(`      - ${skill}: ${level}`);
          });
        }
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 创建测试生物
   */
  private async createTestCreature(): Promise<void> {
    const rl = this.createReadline();
    const classId = await this.prompt(rl, '\n请输入 NPC 类 ID (如 NC_SOLDIER): ');

    const npcClass = this.npcLoader.getClass(classId.trim());

    if (!npcClass) {
      console.log(`❌ 未找到 NPC 类 '${classId}'\n`);
      return;
    }

    console.log(`\n创建 ${npcClass.name} 类型的 NPC...`);

    // 创建测试 NPC
    const position = new Tripoint({ x: 0, y: 0, z: 0 });
    const npcData = {
      id: 'test_npc_' + Date.now(),
      classId: classId.trim(),
      attitude: 5,
      faction: 'test_faction',
    };

    const npc = this.npcLoader.createNPC(npcData, position, '测试 NPC');

    if (!npc) {
      console.log('❌ 创建 NPC 失败\n');
      return;
    }

    // 添加到管理器
    this.npcManager.addNPC(npc);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('NPC 详情:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  ID: ${npc.id}`);
    console.log(`  名称: ${npc.name}`);
    console.log(`  大小: ${CreatureSize[npc.size]}`);
    console.log(`  位置: ${npc.position.toString()}`);
    console.log(`  NPC 类: ${npc.npcClass.id} (${npc.npcClass.name})`);
    console.log(`  态度: ${npc.attitude} (${npc.isFriendly() ? '友好' : npc.isHostile() ? '敌对' : '中立'})`);
    console.log(`  派系: ${npc.faction}`);
    console.log(`  重量: ${npc.getWeight()}g (${npc.getWeight() / 1000}kg)`);

    console.log('\n  属性:');
    const stats = npc.getStats();
    console.log(`    力量: ${stats.str}`);
    console.log(`    敏捷: ${stats.dex}`);
    console.log(`    智力: ${stats.int}`);
    console.log(`    感知: ${stats.per}`);

    console.log('\n  类型检查:');
    console.log(`    isMonster(): ${npc.isMonster()}`);
    console.log(`    isAvatar(): ${npc.isAvatar()}`);
    console.log(`    isNPC(): ${npc.isNPC()}`);

    console.log('\n  状态:');
    console.log(`    isDead(): ${npc.isDead()}`);
    console.log(`    isDowned(): ${npc.isDowned()}`);
    console.log(`    健康状态: ${npc.getHealthStatus()}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 验证属性系统
   */
  private async validateStats(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('属性系统验证:');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('  属性范围:');
    console.log('    力量 (str): 1-20 (普通=8)');
    console.log('    敏捷 (dex): 1-20 (普通=8)');
    console.log('    智力 (int): 1-20 (普通=8)');
    console.log('    感知 (per): 1-20 (普通=8)');

    console.log('\n  验证所有 NPC 类的属性...');

    const classIds = ['NC_SOLDIER', 'NC_THUG', 'NC_SURVIVOR', 'NC_MERCHANT', 'NC_DOCTOR', 'NC_FARMER', 'NC_APIS'];
    const issues: string[] = [];

    for (const classId of classIds) {
      const npcClass = this.npcLoader.getClass(classId);
      if (npcClass && npcClass.defaultStats) {
        const stats = npcClass.defaultStats;

        // 验证属性范围
        if (stats.str < 1 || stats.str > 20) {
          issues.push(`${classId}: 力量=${stats.str} 超出范围`);
        }
        if (stats.dex < 1 || stats.dex > 20) {
          issues.push(`${classId}: 敏捷=${stats.dex} 超出范围`);
        }
        if (stats.int < 1 || stats.int > 20) {
          issues.push(`${classId}: 智力=${stats.int} 超出范围`);
        }
        if (stats.per < 1 || stats.per > 20) {
          issues.push(`${classId}: 感知=${stats.per} 超出范围`);
        }
      }
    }

    console.log(`\n  检查了 ${classIds.length} 个 NPC 类`);
    console.log(`  发现 ${issues.length} 个问题\n`);

    if (issues.length > 0) {
      console.log('  问题列表:');
      issues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
    } else {
      console.log('  ✅ 所有 NPC 类的属性都在有效范围内！');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示生物大小信息
   */
  private async showSizeInfo(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('生物大小信息:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sizeInfo: Record<CreatureSize, { name: string; examples: string }> = {
      [CreatureSize.TINY]: { name: '极小', examples: '松鼠、猫、老鼠' },
      [CreatureSize.SMALL]: { name: '小', examples: '拉布拉多、人类儿童、狗' },
      [CreatureSize.MEDIUM]: { name: '中等', examples: '人类成人、狼' },
      [CreatureSize.LARGE]: { name: '大', examples: '熊、老虎、马' },
      [CreatureSize.HUGE]: { name: '巨大', examples: '牛、驼鹿、修格斯' },
    };

    Object.entries(sizeInfo).forEach(([size, info]) => {
      console.log(`  ${size.padEnd(8)} = ${info.name.padEnd(6)} (例如: ${info.examples})`);
    });

    console.log(`\n  总大小类别数: ${Object.keys(CreatureSize).length / 2}`);

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 测试健康系统
   */
  private async testHealthSystem(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('健康系统测试:');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 创建一个测试 NPC
    const position = new Tripoint({ x: 0, y: 0, z: 0 });
    const npcData = {
      id: 'test_health_npc',
      classId: 'NC_SURVIVOR',
      attitude: 5,
      faction: 'test',
    };

    const npc = this.npcLoader.createNPC(npcData, position, '测试 NPC');
    if (!npc) {
      console.log('❌ 创建测试 NPC 失败\n');
      return;
    }

    console.log('  测试 1: 正常状态');
    console.log(`    isDead(): ${npc.isDead()}`);
    console.log(`    isDowned(): ${npc.isDowned()}`);
    console.log(`    getHealthStatus(): ${npc.getHealthStatus()}`);

    console.log('\n  测试 2: 身体部位检查');
    console.log('    获取各个身体部位的 HP:');

    const bodyParts = [
      BodyPartId.HEAD,
      BodyPartId.TORSO,
      BodyPartId.ARM_L,
      BodyPartId.ARM_R,
      BodyPartId.LEG_L,
      BodyPartId.LEG_R,
    ];

    bodyParts.forEach(part => {
      const hp = npc.getHP(part);
      const hpMax = npc.getHPMax(part);
      const partName = BodyPartId[part];
      console.log(`      ${partName.padEnd(8)}: HP=${hp ?? 'N/A'}/${hpMax ?? 'N/A'}`);
    });

    console.log('\n  测试 3: 死亡条件');
    console.log('    NPC 在以下情况下死亡:');
    console.log('      - 头部 HP <= 0');
    console.log('      - 躯干 HP <= 0');
    console.log('    当前状态: 未实现具体 HP 系统 (返回 undefined)');

    console.log('\n  测试 4: 倒地条件');
    console.log('    NPC 在以下情况下倒地:');
    console.log('      - 双腿 HP 都 <= 0');
    console.log('    当前状态: isDowned() = ' + npc.isDowned());

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }

  /**
   * 显示所有 NPC
   */
  private async showAllNPCs(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('所有已创建的 NPC:');
    console.log('═══════════════════════════════════════════════════════════\n');

    const npcs = this.npcManager.getAllNPCs();

    if (npcs.length === 0) {
      console.log('  当前没有创建任何 NPC');
      console.log('  请先使用"创建测试生物"功能创建 NPC\n');
    } else {
      console.log(`  总 NPC 数: ${npcs.length}\n`);

      npcs.forEach((npc, index) => {
        console.log(`  ${index + 1}. ${npc.name} (${npc.id})`);
        console.log(`     NPC 类: ${npc.npcClass.name}`);
        console.log(`     态度: ${npc.attitude} (${npc.isFriendly() ? '友好' : npc.isHostile() ? '敌对' : '中立'})`);
        console.log(`     位置: ${npc.position.toString()}`);
        console.log('');
      });
    }

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
  const cli = new CreatureCLI();
  try {
    await cli.run();
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

main();

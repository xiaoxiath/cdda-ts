#!/usr/bin/env node

/**
 * 场系统使用示例
 *
 * 演示如何加载和使用场数据
 */

import { FieldTypeLoader } from './FieldTypeLoader';
import { FieldEntry } from './FieldEntry';

async function main() {
  console.log('=== Cataclysm-DDA Web - 场系统示例 ===\n');

  // 1. 创建加载器
  const loader = new FieldTypeLoader();

  // 2. 加载测试数据
  console.log('正在加载场类型数据...');
  const testData = await import('./__tests__/test-data.json');
  await loader.loadFromJson(testData.default);

  const data = loader.getData();
  console.log(`✓ 加载了 ${data.size()} 个场类型\n`);

  // 3. 显示统计信息
  const stats = loader.getStats();
  console.log('=== 场类型统计 ===');
  console.log(`总数: ${stats.total}`);
  console.log('按相态分组:');
  Object.entries(stats.byPhase)
    .sort(([, a], [, b]) => b - a)
    .forEach(([phase, count]) => {
      console.log(`  ${phase}: ${count}`);
    });
  console.log();

  console.log('分类统计:');
  console.log(`  火: ${stats.fire}`);
  console.log(`  烟雾: ${stats.smoke}`);
  console.log(`  有毒: ${stats.toxic}`);
  console.log(`  危险: ${stats.dangerous}`);
  console.log(`  发光: ${stats.lightEmitters}`);
  console.log();

  // 4. 演示场类型查询
  console.log('=== 场类型查询示例 ===');

  const fire = data.get('fd_fire');
  if (fire) {
    console.log('火:');
    console.log(`  名称: ${fire.name}`);
    console.log(`  描述: ${fire.description}`);
    console.log(`  相态: ${fire.getPhase()}`);
    console.log(`  最大强度: ${fire.getMaxIntensity()}`);
    console.log(`  半衰期: ${fire.halfLife} 回合`);
    console.log(`  加速衰减: ${fire.shouldAccelerateDecay() ? '是' : '否'}`);
    console.log(`  透明: ${fire.isTransparent() ? '是' : '否'}`);
    console.log(`  危险等级: ${fire.getDangerLevel()}`);
    console.log(`  可传播: ${fire.canSpread() ? '是' : '否'}`);
    console.log(`  可燃烧: ${fire.canIgnite() ? '是' : '否'}`);
    console.log(`  发光: ${fire.emitsLight() ? '是' : '否'} (${fire.getLightModifier()})`);
    console.log();
  }

  const blood = data.get('fd_blood');
  if (blood) {
    console.log('血:');
    console.log(`  名称: ${blood.name}`);
    console.log(`  相态: ${blood.getPhase()}`);
    console.log(`  最大强度: ${blood.getMaxIntensity()}`);
    console.log(`  半衰期: ${blood.halfLife} 回合`);
    console.log(`  加速衰减: ${blood.shouldAccelerateDecay() ? '是' : '否'}`);
    console.log(`  是血迹: ${blood.flags.has('BLOODY') ? '是' : '否'}`);
    console.log();
  }

  // 5. 演示强度等级
  console.log('=== 强度等级示例 ===');

  if (fire) {
    console.log('火焰强度等级:');
    for (let i = 1; i <= fire.getMaxIntensity(); i++) {
      const name = fire.getIntensityName(i);
      const symbol = fire.getIntensitySymbol(i);
      const color = fire.getIntensityColor(i);

      console.log(`  强度 ${i}: ${name} (${color} "${symbol}")`);
    }
    console.log();
  }

  // 6. 场实例创建和管理
  console.log('=== 场实例管理 ===');

  const fireEntry = data.createEntry('fd_fire', 2);
  if (fireEntry) {
    console.log('创建火焰场实例:');
    console.log(`  类型: ${fireEntry.type}`);
    console.log(`  强度: ${fireEntry.intensity}`);
    console.log(`  年龄: ${fireEntry.age}`);
    console.log(`  衰减时间: ${fireEntry.decayTime}`);
    console.log(`  存活: ${fireEntry.checkAlive() ? '是' : '否'}`);
    console.log();

    // 更新场实例
    console.log('模拟更新:');
    let current = fireEntry;
    for (let i = 1; i <= 5; i++) {
      current = data.updateEntry(current);
      console.log(`  回合 ${i}: 年龄=${current.age}, 强度=${current.intensity}, 存活=${current.checkAlive() ? '是' : '否'}`);
    }
    console.log();
  }

  // 7. 场的衰减
  console.log('=== 场的衰减 ===');

  const bloodEntry = data.createEntry('fd_blood', 3);
  if (bloodEntry && blood) {
    console.log('血迹衰减过程:');
    console.log(`  初始强度: ${bloodEntry.intensity}`);
    console.log(`  半衰期: ${blood.halfLife} 回合`);
    console.log(`  衰减时间: ${bloodEntry.decayTime} 回合`);
    console.log();

    let current = bloodEntry;
    let age = 0;

    while (current.checkAlive() && age < 500) {
      current = data.updateEntry(current);
      age++;

      if (age % 50 === 0 || current.intensity !== bloodEntry.intensity) {
        const progress = current.getAgeProgress();
        console.log(`  回合 ${age}: 强度=${current.intensity}, 进度=${(progress * 100).toFixed(1)}%`);

        if (current.intensity !== bloodEntry.intensity) {
          console.log(`    -> 强度衰减!`);
        }
      }

      if (current.intensity < bloodEntry.intensity) {
        bloodEntry.setIntensity(current.intensity);
      }
    }
    console.log();
  }

  // 8. 场的显示信息
  console.log('=== 场的显示 ===');

  const displayFields = ['fd_fire', 'fd_smoke', 'fd_blood', 'fd_acid', 'fd_web'];
  displayFields.forEach(fieldId => {
    const fieldType = data.get(fieldId);
    const entry = data.createEntry(fieldId, 2);

    if (fieldType && entry) {
      const info = data.getEntryDisplayInfo(entry);
      console.log(`${fieldType.name}:`);
      console.log(`  符号: ${info?.symbol} (${info?.color})`);
      console.log(`  名称: ${info?.name}`);
      console.log(`  优先级: ${info?.priority}`);
    }
  });
  console.log();

  // 9. 场的优先级
  console.log('=== 场的优先级（用于重叠场） ===');

  const entries = [
    data.createEntry('fd_smoke', 2),
    data.createEntry('fd_fire', 1),
    data.createEntry('fd_toxic_cloud', 1),
    data.createEntry('fd_acid', 1),
  ].filter((e): e is FieldEntry => e !== undefined);

  console.log('重叠场（按优先级排序）:');
  entries.forEach((entry) => {
    const info = data.getEntryDisplayInfo(entry);
    console.log(`  ${entry.type}: 优先级=${info?.priority}, 强度=${entry.intensity}`);
  });

  const merged = data.mergeEntries(entries);
  console.log(`\n合并结果: ${merged?.type} (优先级最高的场)`);
  console.log();

  // 10. 危险场列表
  console.log('=== 危险场列表 ===');

  const dangerous = data.sortByDangerLevel().slice(0, 10);
  dangerous.forEach((field) => {
    const danger = field.getDangerLevel();
    const entry = field.createEntry(1);
    const info = entry ? data.getEntryDisplayInfo(entry) : null;

    console.log(`${field.name}:`);
    console.log(`  危险等级: ${danger}`);
    console.log(`  显示: ${info?.symbol} (${info?.color})`);
    console.log(`  半衰期: ${field.halfLife} 回合`);
    console.log();
  });

  // 11. 游戏机制示例
  console.log('=== 游戏机制示例 ===');

  console.log('伤害计算:');
  const acid = data.get('fd_acid');
  if (acid) {
    console.log(`  酸场危险等级: ${acid.getDangerLevel()}`);
    console.log(`  对玩家造成伤害: ${acid.getDangerLevel()} 点`);

    const acidEntry = data.createEntry('fd_acid', 3);
    if (acidEntry) {
      const info = data.getEntryDisplayInfo(acidEntry);
      console.log(`  强度 3 酸场: ${info?.name}`);
      console.log(`  伤害: ${acid.getDangerLevel() * acidEntry.intensity} 点`);
    }
  }
  console.log();

  console.log('视野阻挡:');
  const web = data.get('fd_web');
  if (web) {
    console.log(`  网阻挡视线: ${web.blocksVision() ? '是' : '否'}`);
    console.log(`  网透明: ${web.isTransparent() ? '是' : '否'}`);
    console.log(`  网粘滞: ${web.isSticky() ? '是' : '否'}`);
  }
  console.log();

  console.log('传播机制:');
  if (fire) {
    console.log(`  火焰传播概率: ${fire.fireSpreadChance}%`);
    console.log(`  火焰点燃概率: ${fire.fireIgnitionChance}%`);

    const spreadRoll = Math.random() * 100;
    console.log(`  传播检定: ${spreadRoll.toFixed(2)} < ${fire.fireSpreadChance} ? ${spreadRoll < fire.fireSpreadChance ? '传播!' : '不传播'}`);
  }
  console.log();

  // 12. 简单的地图示例
  console.log('=== 地图渲染示例 ===');

  const mapData = [
    ['.', '.', '.', '.', '.'],
    ['.', 'F', 'S', '.', '.'],
    ['.', '.', '.', 'B', '.'],
    ['.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.'],
  ];

  // 符号映射
  const symbolMap: Record<string, string> = {
    'F': 'fd_fire',
    'S': 'fd_smoke',
    'B': 'fd_blood',
  };

  console.log('简单的 5x5 地图:');
  for (const row of mapData) {
    let line = '';

    for (const cell of row) {
      if (cell === '.') {
        line += '. ';
      } else {
        const fieldId = symbolMap[cell];
        if (fieldId) {
          const entry = data.createEntry(fieldId, 2);
          const info = entry ? data.getEntryDisplayInfo(entry) : null;

          line += `${info?.symbol || '?'} `;
        }
      }
    }

    console.log(line);
  }
  console.log('图例:');
  console.log('  F = fire (火焰)');
  console.log('  S = smoke (烟雾)');
  console.log('  B = blood (血)');
  console.log();

  console.log('=== 示例完成 ===');
}

// 运行示例
main().catch((error) => {
  console.error('错误:', error);
  process.exit(1);
});

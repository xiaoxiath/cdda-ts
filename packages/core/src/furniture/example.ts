#!/usr/bin/env node

/**
 * 家具系统使用示例
 *
 * 演示如何加载和使用家具数据
 */

import { FurnitureLoader } from './FurnitureLoader';
import { FurnitureFlag } from './types';

async function main() {
  console.log('=== Cataclysm-DDA Web - 家具系统示例 ===\n');

  // 1. 创建加载器
  const loader = new FurnitureLoader();

  // 2. 加载测试数据
  console.log('正在加载家具数据...');
  const testData = await import('./__tests__/test-data.json');
  await loader.loadFromJson(testData.default);

  const data = loader.getData();
  console.log(`✓ 加载了 ${data.size()} 个家具\n`);

  // 3. 显示统计信息
  const stats = loader.getStats();
  console.log('=== 家具统计 ===');
  console.log(`总数: ${stats.total}`);
  console.log('按符号分组:');
  Object.entries(stats.bySymbol)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([symbol, count]) => {
      console.log(`  ${symbol}: ${count}`);
    });
  console.log();

  console.log('分类统计:');
  console.log(`  工作台: ${stats.workbenches}`);
  console.log(`  可坐: ${stats.sittable}`);
  console.log(`  容器: ${stats.containers}`);
  console.log(`  植物: ${stats.plants}`);
  console.log(`  发光: ${stats.lightEmitters}`);
  console.log();

  // 4. 演示家具查询
  console.log('=== 家具查询示例 ===');

  const chair = data.findByName('chair');
  if (chair) {
    console.log('椅子 (chair):');
    console.log(`  符号: ${chair.symbol}`);
    console.log(`  颜色: ${chair.color}`);
    console.log(`  舒适度: ${chair.getComfort()}`);
    console.log(`  可坐: ${chair.isSittable() ? '是' : '否'}`);
    console.log(`  所需力量: ${chair.getRequiredStrength()}`);
    console.log(`  可破坏: ${chair.isBashable() ? '是' : '否'}`);
    if (chair.isBashable()) {
      console.log(`  破坏难度: ${chair.getBashDifficulty()}`);
    }
    console.log();
  }

  const workbench = data.findByName('workbench');
  if (workbench) {
    console.log('工作台 (workbench):');
    console.log(`  符号: ${workbench.symbol}`);
    console.log(`  质量: ${workbench.getMass()}g`);
    console.log(`  是工作台: ${workbench.isWorkbench() ? '是' : '否'}`);
    if (workbench.isWorkbench()) {
      console.log(`  支持全局技能: ${workbench.supportsSkill('all') ? '是' : '否'}`);
      console.log(`  电子技能倍率: ${workbench.getSkillMultiplier('electronics')}x`);
      console.log(`  缝纫技能倍率: ${workbench.getSkillMultiplier('tailor')}x`);
    }
    console.log();
  }

  const bed = data.findByName('bed');
  if (bed) {
    console.log('床 (bed):');
    console.log(`  符号: ${bed.symbol}`);
    console.log(`  舒适度: ${bed.getComfort()}`);
    console.log(`  保暖度: ${bed.floorBeddingWarmth}`);
    console.log(`  可骑/可躺: ${bed.flags.has(FurnitureFlag.MOUNTABLE) ? '是' : '否'}`);
    console.log(`  最大存储: ${bed.maxVolume}ml`);
    console.log();
  }

  // 5. 演示分类查询
  console.log('=== 分类查询示例 ===');

  const workbenches = data.getWorkbenches();
  console.log(`工作台数量: ${workbenches.length}`);
  workbenches.forEach((w) => {
    console.log(`  - ${w.name} (支持技能: ${w.workbench?.items.keySeq().join(', ')})`);
  });
  console.log();

  const sittable = data.getSittable();
  console.log(`可坐家具数量: ${sittable.length}`);
  sittable.slice(0, 5).forEach((f) => {
    console.log(`  - ${f.name} (舒适度: ${f.getComfort()})`);
  });
  console.log();

  // 6. 演示舒适度排序
  console.log('=== 舒适度排名 ===');
  const byComfort = data.sortByComfort();
  byComfort.slice(0, 5).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}: ${f.getComfort()} 舒适度`);
  });
  console.log();

  // 7. 演示工作台功能
  console.log('=== 工作台功能 ===');
  workbenches.forEach((wb) => {
    console.log(`${wb.name}:`);
    const info = wb.getWorkbenchInfo();

    if (info?.items) {
      const skills = info.items.keySeq().toArray();
      console.log(`  支持技能: ${skills.join(', ')}`);

      skills.forEach((skill) => {
        const mult = wb.getSkillMultiplier(skill);
        console.log(`    ${skill}: ${mult}x`);
      });
    }

    if (info?.requiresLight) console.log(`  需要光照: 是`);
    if (info?.tile) console.log(`  需要平坦表面: 是`);
    if (info?.requiresPower) console.log(`  需要电源: 是`);
    console.log();
  });

  // 8. 演示容器功能
  console.log('=== 容器功能 ===');
  const containers = data.getContainers();
  containers.forEach((c) => {
    console.log(`${c.name}:`);
    console.log(`  最大容量: ${c.maxVolume}ml`);
    console.log(`  质量: ${c.getMass()}g`);
    console.log(`  可移动力量: ${c.getRequiredStrength()}`);
    console.log();
  });

  // 9. 演示植物功能
  console.log('=== 植物功能 ===');
  const plants = data.getPlants();
  plants.forEach((p) => {
    console.log(`${p.name}:`);
    const plantData = p.getPlantData();

    if (plantData) {
      console.log(`  成熟时间: ${Math.floor(plantData.transformAge / 60 / 24)} 天`);
      console.log(`  收获物品: ${plantData.transformToItem}`);
      console.log(`  收获季节: ${plantData.harvestSeason?.join(', ') || '全年'}`);

      // 检查当前成熟状态
      const testAge = 50000;
      console.log(`  ${testAge} 回合时成熟: ${p.isPlantMature(testAge) ? '是' : '否'}`);
    }
    console.log();
  });

  // 10. 演示发光家具
  console.log('=== 发光家具 ===');
  const lightEmitters = data.getLightEmitters();
  lightEmitters.forEach((f) => {
    console.log(`${f.name}:`);
    console.log(`  光照等级: ${f.getLight()}`);
    console.log(`  符号: ${f.symbol} (${f.color})`);

    if (f.emitters && f.emitters.size > 0) {
      console.log(`  发射场:`);
      f.emitters.forEach((emitter, key) => {
        console.log(`    ${key}: ${emitter.field} (密度: ${emitter.density}, 概率: ${emitter.chance}%)`);
      });
    }
    console.log();
  });

  // 11. 演示破坏和拆解
  console.log('=== 破坏和拆解 ===');

  const bashable = data.getAll().filter((f) => f.isBashable());
  console.log(`可破坏家具: ${bashable.length}`);
  bashable.slice(0, 5).forEach((f) => {
    const difficulty = f.getBashDifficulty();
    console.log(`  ${f.name}: 难度 ${difficulty}`);
  });
  console.log();

  const deconstructable = data.getAll().filter((f) => f.isDeconstructable());
  console.log(`可拆解家具: ${deconstructable.length}`);
  deconstructable.slice(0, 5).forEach((f) => {
    const time = f.deconstruct?.time || 0;
    console.log(`  ${f.name}: ${time} 回合`);
  });
  console.log();

  // 12. 演示游戏机制
  console.log('=== 游戏机制示例 ===');

  console.log('制作时间计算:');
  const wb = data.findByName('workbench');
  if (wb) {
    const baseTime = 1000; // 基础时间 1000 回合

    const normalSpeed = baseTime;
    const electronicsSpeed = Math.floor(baseTime / wb.getSkillMultiplier('electronics'));
    const tailorSpeed = baseTime;

    console.log(`  普通制作: ${normalSpeed} 回合`);
    console.log(`  电子学: ${electronicsSpeed} 回合 (2x 加速)`);
    console.log(`  缝纫: ${tailorSpeed} 回合 (1x)`);
  }
  console.log();

  console.log('存储容量:');
  const crate = data.findByName('crate');
  if (crate) {
    const itemVolume = 500; // 物品体积 500ml
    const maxItems = Math.floor(crate.maxVolume / itemVolume);

    console.log(`  箱子最大容量: ${crate.maxVolume}ml`);
    console.log(`  可存储 ${maxVolume}ml 物品: ${maxItems} 个`);
  }
  console.log();

  console.log('搬运力量:');
  const table = data.findByName('table');
  if (table) {
    const requiredStr = table.getRequiredStrength();
    console.log(`  桌子质量: ${table.getMass()}g`);
    console.log(`  需要力量: ${requiredStr}`);

    const playerStr = 10;
    if (playerStr >= requiredStr) {
      console.log(`  玩家 (${playerStr} 力量) 可以搬运`);
    } else {
      console.log(`  玩家 (${playerStr} 力量) 无法搬运，需要 ${requiredStr} 力量`);
    }
  }
  console.log();

  // 13. 简单的房间示例
  console.log('=== 房间渲染示例 ===');

  const room = [
    ['f_workbench', null, null, 'f_lamp', null],
    ['f_chair', 'f_table', 'f_table', 'f_chair', null],
    [null, 'f_rack', null, 'f_crate', null],
    [null, 'f_bed', 'f_bed', null, null],
    [null, null, null, null, null],
  ];

  console.log('简单房间布局:');
  for (const row of room) {
    let line = '';
    for (const furnitureName of row) {
      if (furnitureName) {
        const f = data.findByName(furnitureName);
        if (f) {
          line += f.symbol + ' ';
        } else {
          line += '? ';
        }
      } else {
        line += '. ';
      }
    }
    console.log(line);
  }
  console.log();

  console.log('=== 示例完成 ===');
}

// 运行示例
main().catch((error) => {
  console.error('错误:', error);
  process.exit(1);
});

/**
 * 直接测试脚本 - 验证数据加载
 */
const fs = require('fs');
const path = require('path');

// 直接读取并测试
const DATA_PATH = '/Users/tanghao/workspace/game/Cataclysm-DDA/data/json/furniture_and_terrain/terrain-floors-indoor.json';
const filePath = path.resolve(DATA_PATH);

console.log('========================================');
console.log('Cataclysm-DDA 数据加载严格验证');
console.log('========================================\n');

// 1. 读取文件
console.log('1. 读取文件...');
const fileContent = fs.readFileSync(filePath, 'utf-8');
console.log(`   ✅ 文件读取成功: ${fileContent.length} 字符\n`);

// 2. 解析 JSON
console.log('2. 解析 JSON...');
const jsonData = JSON.parse(fileContent);
console.log(`   ✅ JSON 解析成功: ${jsonData.length} 个对象\n`);

// 3. 分析第一个对象
console.log('3. 分析第一个地形对象:');
const first = jsonData[0];
console.log(JSON.stringify(first, null, 2).substring(0, 800));

// 4. 检查所有字段
console.log('\n4. 所有字段列表:');
const allFields = new Set();
jsonData.forEach(item => {
  Object.keys(item).forEach(key => allFields.add(key));
});
console.log('   ' + Array.from(allFields).join('\n   '));

// 5. 检查问题字段
console.log('\n5. 检查潜在问题字段:');

// connects_to 类型检查
const connectsToStrings = jsonData.filter(item => typeof item.connects_to === 'string');
const connectsToArrays = jsonData.filter(item => Array.isArray(item.connects_to));
console.log(`   connects_to (字符串): ${connectsToStrings.length} 个`);
console.log(`   connects_to (数组): ${connectsToArrays.length} 个`);

if (connectsToStrings.length > 0) {
  console.log('   示例:');
  connectsToStrings.slice(0, 3).forEach(item => {
    console.log(`     ${item.id}: "${item.connects_to}"`);
  });
}

// copy-from 检查
const copyFromItems = jsonData.filter(item => item.copy_from);
console.log(`\n   copy-from: ${copyFromItems.length} 个`);

// looks_like 检查
const looksLikeItems = jsonData.filter(item => item.looks_like);
console.log(`   looks_like: ${looksLikeItems.length} 个`);

// light_emitted 检查
const lightItems = jsonData.filter(item => item.light_emitted !== undefined);
console.log(`   light_emitted: ${lightItems.length} 个`);

// shoot 检查
const shootItems = jsonData.filter(item => item.shoot);
console.log(`   shoot: ${shootItems.length} 个`);

// str_min_supported 检查 (在 bash 中)
const strMinSupportedItems = jsonData.filter(item => item.bash && item.bash.str_min_supported);
console.log(`   bash.str_min_supported: ${strMinSupportedItems.length} 个`);

// sound_vol 检查
const soundVolItems = jsonData.filter(item => item.bash && item.bash.sound_vol);
console.log(`   bash.sound_vol: ${soundVolItems.length} 个`);

// 6. 尝试手动解析（模拟解析器）
console.log('\n6. 手动解析测试:');
try {
  const terrain1 = {
    id: first.id,
    name: first.name,
    description: first.description,
    symbol: first.symbol,
    color: first.color,
    moveCost: first.move_cost,
    flags: first.flags,
    connectsTo: typeof first.connects_to === 'string' ? [first.connects_to] : first.connects_to,
  };

  console.log('   ✅ 手动解析成功');
  console.log(`   ID: ${terrain1.id}`);
  console.log(`   Name: ${terrain1.name}`);
  console.log(`   ConnectsTo: ${JSON.stringify(terrain1.connectsTo)}`);

  // 测试 bash 解析
  if (first.bash) {
    const bash = {
      sound: first.bash.sound,
      strMin: first.bash.str_min,
      strMax: first.bash.str_max,
      ter: first.bash.ter_set,
      // str_min_supported 被忽略了
    };
    console.log(`   Bash: strMin=${bash.strMin}, strMax=${bash.strMax}`);
  }

} catch (error) {
  console.log(`   ❌ 手动解析失败: ${error.message}`);
}

// 7. 统计
console.log('\n7. 统计摘要:');
console.log(`   总对象数: ${jsonData.length}`);
console.log(`   类型为 "terrain": ${jsonData.filter(i => i.type === 'terrain').length}`);
console.log(`   有问题的字段数: ${allFields.size - 10}`); // 减去基础字段

console.log('\n========================================');
console.log('验证完成！');
console.log('========================================\n');

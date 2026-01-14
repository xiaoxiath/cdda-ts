# 生物系统身体部位增强计划

## 项目概述

**目标**: 完善生物系统身体部位功能，从当前 70% 提升到 100%
**优先级**: P1
**预估工作量**: 4 周
**开始日期**: 2026-01-14

## 当前状态分析

### ✅ 已完成功能 (70%)

1. **SubBodyPart 系统** (`src/body/SubBodyPart.ts`, 302 行)
   - ✅ 子身体部位划分（UPPER_ARM_L, LOWER_ARM_L 等）
   - ✅ 身体部位属性定义（maxHP, size, isLethal, canBeMissing）
   - ✅ 身体部位关系映射
   - ✅ HP 分配和计算工具方法
   - ✅ 左右对称支持

2. **Avatar 基础身体部位** (`src/creature/Avatar.ts`)
   - ✅ 12 个基础身体部位（TORSO, HEAD, EYES, MOUTH, ARM_L/R, HAND_L/R, LEG_L/R, FOOT_L/R）
   - ✅ 基础 HP 系统（currentHP, baseHP）
   - ✅ 伤害和治疗方法（takeDamage, heal）
   - ✅ 健康状态判断（isDead, isDowned）

3. **Creature 抽象基类** (`src/creature/Creature.ts`)
   - ✅ 身体部位接口定义（getHP, getHPMax）
   - ✅ 基础状态检查（isDead, isDowned）

### ❌ 缺失功能 (30%)

1. **身体部位独立血量系统**
   - ❌ 没有统一的 BodyPartManager
   - ❌ Avatar 和 NPC 系统不共享
   - ❌ NPC 完全没有身体部位 HP
   - ❌ 缺少子身体部位 HP 追踪
   - ❌ 缺少部位伤害分配机制

2. **部位状态效果**
   - ❌ 没有部位状态枚举和定义
   - ❌ 没有断肢、骨折、感染等状态
   - ❌ 没有状态效果对能力的影响
   - ❌ 没有状态持续时间管理

3. **治疗和恢复机制**
   - ❌ 没有自然恢复系统
   - ❌ 没有医疗物品集成
   - ❌ 没有治疗时间计算
   - ❌ 没有恢复速度影响因素

4. **装备与部位关联**
   - ❌ 装备保护特定部位的机制未实现
   - ❌ 装备损坏吸收未完整集成
   - ❌ 身体部位与装备槽的映射不完整

## 实施计划

### 第 1 周：身体部位独立血量系统

**目标**: 创建统一的身体部位管理系统

#### 任务 1.1：创建 BodyPartManager 类 (2 天)
- [ ] 设计 BodyPartManager 接口
- [ ] 实现 BodyPart 类（包含 HP、状态等）
- [ ] 实现主部位和子部位 HP 管理
- [ ] 实现部位伤害分配算法
- [ ] 编写单元测试（50+ tests）

**关键设计**:
```typescript
class BodyPart {
  readonly id: BodyPartId;
  readonly type: BodyPartType;
  readonly maxHP: number;
  readonly currentHP: number;
  readonly status: BodyPartStatus;
  readonly subParts?: Map<SubBodyPartId, BodyPart>;

  // 方法
  takeDamage(damage: number): BodyPart
  heal(amount: number): BodyPart
  setStatus(status: BodyPartStatus): BodyPart
  isFunctional(): boolean
  getEfficiency(): number // 0-1, 影响使用该部位的能力
}

class BodyPartManager {
  readonly parts: Map<BodyPartId, BodyPart>;

  // 核心方法
  getPart(id: BodyPartId): BodyPart | undefined
  takeDamage(partId: BodyPartId, damage: number): BodyPartManager
  heal(partId: BodyPartId, amount: number): BodyPartManager
  setPartStatus(partId: BodyPartId, status: BodyPartStatus): BodyPartManager

  // 查询方法
  isPartFunctional(partId: BodyPartId): boolean
  getPartEfficiency(partId: BodyPartId): number
  getTotalHP(): number
  getFunctionalLimbsCount(): number
}
```

#### 任务 1.2：集成到 Avatar 和 NPC (1.5 天)
- [ ] 重构 Avatar 使用 BodyPartManager
- [ ] 为 NPC 添加 BodyPartManager
- [ ] 更新构造函数创建完整的身体部位
- [ ] 更新 takeDamage/heal 方法
- [ ] 编写集成测试（30+ tests）

#### 任务 1.3：子身体部位 HP 追踪 (1.5 天)
- [ ] 扩展 BodyPart 支持子部位
- [ ] 实现主部位到子部位的伤害分配
- [ ] 实现子部位影响主部位功能
- [ ] 编写单元测试（30+ tests）

**伤害分配算法**:
```
主部位受伤 → 按子部位大小比例分配伤害
如果子部位被破坏 → 主部位效率下降
如果主部位所有子部位都破坏 → 主部位丧失功能
```

#### 任务 1.4：测试和文档 (1 天)
- [ ] 完善所有单元测试
- [ ] 编写使用示例
- [ ] 更新 API 文档

**第 1 周交付**:
- ✅ BodyPartManager 类（~500 行）
- ✅ BodyPart 类（~300 行）
- ✅ 单元测试（110+ tests）
- ✅ Avatar/NPC 集成完成

---

### 第 2 周：部位状态效果

**目标**: 实现身体部位状态系统

#### 任务 2.1：定义部位状态类型 (1 天)
- [ ] 创建 BodyPartStatus 枚举
- [ ] 定义状态属性（持续时间、严重程度等）
- [ ] 创建状态效果接口
- [ ] 编写单元测试（20+ tests）

**状态类型**:
```typescript
enum BodyPartStatus {
  HEALTHY = 'healthy',           // 健康
  BRUISED = 'bruised',           // 淤伤
  CUT = 'cut',                   // 割伤
  BROKEN = 'broken',             // 骨折
  DISLOCATED = 'dislocated',     // 脱臼
  INFECTED = 'infected',         // 感染
  AMPUTATED = 'amputated',       // 断肢
  CRIPPLED = 'crippled',         // 残废
  NUMB = 'numb',                 // 麻木
  BITE = 'bite',                 // 咬伤
  INFECTED_BITE = 'infected_bite', // 感染性咬伤
}

interface BodyPartStatusEffect {
  readonly status: BodyPartStatus;
  readonly severity: number;     // 0-1
  readonly duration: number;     // 回合数
  readonly pain: number;         // 疼痛等级
  readonly bleeding: number;     // 出血量
}
```

#### 任务 2.2：实现状态管理系统 (2 天)
- [ ] 创建 BodyPartStatusManager 类
- [ ] 实现状态应用和移除逻辑
- [ ] 实现状态持续时间管理
- [ ] 实现状态叠加规则
- [ ] 编写单元测试（40+ tests）

**状态叠加规则**:
```
BRUISED + CUT = 可能转为感染
BROKEN + 重击 = 粉碎性骨折
INFECTED + 时间 = 败血症（全身效果）
AMPUTATED = 永久状态，无法恢复
```

#### 任务 2.3：状态对能力的影响 (1.5 天)
- [ ] 实现状态对移动的影响
- [ ] 实现状态对操作的影响
- [ ] 实现状态对战斗的影响
- [ ] 实现疼痛系统
- [ ] 编写单元测试（30+ tests）

**能力影响计算**:
```typescript
// 移动速度影响
腿骨折 → 移动速度 -50%
双腿骨折 → 无法移动
脚受伤 → 移动速度 -20%

// 操作能力影响
手臂骨折 → 操作能力 -40%
手受伤 → 精细操作无法进行
双手受伤 → 无法使用双手武器

// 战斗影响
断肢 → 无法使用该肢体
疼痛 → 命中率下降
```

#### 任务 2.4：状态触发和处理 (0.5 天)
- [ ] 实现状态触发逻辑
- [ ] 实现状态自然演变
- [ ] 集成到回合处理
- [ ] 编写单元测试（20+ tests）

**第 2 周交付**:
- ✅ BodyPartStatus 枚举和定义
- ✅ BodyPartStatusManager 类（~400 行）
- ✅ 状态效果系统（~300 行）
- ✅ 单元测试（110+ tests）

---

### 第 3 周：治疗和恢复机制

**目标**: 实现完整的治疗系统

#### 任务 3.1：自然恢复系统 (1.5 天)
- [ ] 实现基础恢复率
- [ ] 实现恢复影响因素
- [ ] 实现健康状态的恢复速度差异
- [ ] 集成到回合处理
- [ ] 编写单元测试（30+ tests）

**恢复率计算**:
```typescript
基础恢复率 = 0.1 HP/回合

影响因素：
+ 休息状态：x2
+ 良好健康：x1.5
- 移动中：x0.5
- 战斗中：x0（不恢复）
- 感染：x0.1（大幅减缓）
- 断骨：x0.5（需要固定）
```

#### 任务 3.2：医疗物品集成 (2 天)
- [ ] 创建 MedicalItem 接口
- [ ] 实现绷带（止血）
- [ ] 实现夹板（固定骨折）
- [ ] 实现抗生素（治疗感染）
- [ ] 实现止痛药（减少疼痛）
- [ ] 编写单元测试（40+ tests）

**医疗物品类型**:
```typescript
interface MedicalItem {
  readonly type: MedicalItemType;
  readonly healAmount: number;
  readonly stopBleeding: boolean;
  readonly cureInfection: boolean;
  readonly reducePain: number;
  readonly setBone: boolean;

  apply(target: BodyPart): BodyPart;
}

enum MedicalItemType {
  BANDAGE = 'bandage',           // 绷带 - 止血
  SPLINT = 'splint',             // 夹板 - 固定骨折
  ANTIBIOTIC = 'antibiotic',     // 抗生素 - 治疗感染
  PAINKILLER = 'painkiller',     // 止痛药
  FIRST_AID_KIT = 'first_aid_kit', // 急救包
}
```

#### 任务 3.3：治疗时间计算 (1 天)
- [ ] 实现治疗时间估算
- [ ] 实现治疗技能影响
- [ ] 实现治疗成功率
- [ ] 编写单元测试（20+ tests）

**治疗时间计算**:
```typescript
治疗时间 = 基础时间 × 伤害程度 × 技能修正

基础时间：
- 小伤：10 分钟
- 中等伤：30 分钟
- 重伤：1 小时
- 严重伤：2+ 小时

技能修正：
- 0 级技能：x2
- 5 级技能：x1（标准）
- 10 级技能：x0.5
```

#### 任务 3.4：恢复追踪 (0.5 天)
- [ ] 实现恢复进度追踪
- [ ] 实现恢复历史记录
- [ ] 编写单元测试（10+ tests）

**第 3 周交付**:
- ✅ 自然恢复系统（~200 行）
- ✅ 医疗物品集成（~300 行）
- ✅ 治疗时间计算（~150 行）
- ✅ 单元测试（100+ tests）

---

### 第 4 周：装备与部位集成 + 测试

**目标**: 完成装备系统集成并完善测试

#### 任务 4.1：装备保护机制 (1 天)
- [ ] 实现装备覆盖的身体部位映射
- [ ] 实现伤害转移到装备
- [ ] 实现装备耐久度消耗
- [ ] 编写单元测试（30+ tests）

**装备保护逻辑**:
```typescript
// 伤害分配
原始伤害 = 10
装备保护 = 头盔（覆盖头部，护甲值 5）
实际伤害 = max(0, 10 - 5) = 5
装备损耗 = 5 / 耐久度系数

// 如果装备损坏超过阈值
if (装备耐久度 < 10%) {
  装备破裂 → 不再提供保护
  可能造成额外伤害
}
```

#### 任务 4.2：身体部位与装备槽关联 (1 天)
- [ ] 完善装备槽系统
- [ ] 实现装备对部位的限制
- [ ] 实现断肢后装备掉落
- [ ] 编写单元测试（20+ tests）

#### 任务 4.3：完整集成测试 (2 天)
- [ ] 端到端测试：受伤→治疗→恢复
- [ ] 战斗集成测试：装备保护→部位受伤→状态影响
- [ ] NPC 测试：NPC 身体部位系统
- [ ] 性能测试：大量实体战斗
- [ ] 编写集成测试（50+ tests）

#### 任务 4.4：文档和优化 (1 天)
- [ ] 完善 API 文档
- [ ] 编写使用指南
- [ ] 性能优化
- [ ] 代码审查

**第 4 周交付**:
- ✅ 装备保护机制（~200 行）
- ✅ 集成测试（50+ tests）
- ✅ 完整文档
- ✅ 性能优化

---

## 总交付物

### 代码文件
1. `src/body/BodyPart.ts` - 身体部位类（~300 行）
2. `src/body/BodyPartManager.ts` - 身体部位管理器（~500 行）
3. `src/body/BodyPartStatus.ts` - 部位状态定义（~150 行）
4. `src/body/BodyPartStatusManager.ts` - 状态管理器（~400 行）
5. `src/body/RecoverySystem.ts` - 恢复系统（~200 行）
6. `src/body/MedicalItem.ts` - 医疗物品接口（~150 行）
7. `src/body/EquipmentIntegration.ts` - 装备集成（~200 行）

### 测试文件
1. `src/body/__tests__/BodyPart.test.ts`（50+ tests）
2. `src/body/__tests__/BodyPartManager.test.ts`（60+ tests）
3. `src/body/__tests__/BodyPartStatus.test.ts`（110+ tests）
4. `src/body/__tests__/RecoverySystem.test.ts`（100+ tests）
5. `src/body/__tests__/EquipmentIntegration.test.ts`（50+ tests）
6. `src/creature/__tests__/BodySystemIntegration.test.ts`（50+ tests）

**总代码量**: ~2,400 行
**总测试量**: 420+ tests

---

## 验收标准

### 功能完整性
- ✅ Avatar 和 NPC 都有完整的身体部位系统
- ✅ 支持主部位和子部位 HP 管理
- ✅ 实现所有关键状态效果（断肢、骨折、感染等）
- ✅ 实现自然恢复和医疗治疗
- ✅ 装备正确保护身体部位

### 性能指标
- ✅ 单次身体部位更新 < 1ms
- ✅ 100 个实体同时战斗 FPS > 30
- ✅ 内存占用 < 2KB/实体

### 测试覆盖率
- ✅ 单元测试覆盖率 > 90%
- ✅ 集成测试覆盖所有主要场景
- ✅ 所有测试通过

### 文档完整性
- ✅ API 参考文档
- ✅ 使用示例和指南
- ✅ 架构设计文档

---

## 风险和缓解

### 风险 1：性能问题
**风险**: 大量实体战斗时性能下降
**缓解**:
- 使用不可变数据结构减少拷贝
- 实现身体部位更新缓存
- 只更新受伤的部位

### 风险 2：复杂度增加
**风险**: 系统过于复杂难以维护
**缓解**:
- 保持接口简洁
- 提供高级 API 封装复杂逻辑
- 完善的单元测试和文档

### 风险 3：兼容性问题
**风险**: 与现有系统集成困难
**缓解**:
- 逐步重构，保持向后兼容
- 提供适配器模式
- 完善的集成测试

---

## 时间线

| 周次 | 主要任务 | 交付物 |
|-----|---------|-------|
| 第 1 周 | 身体部位独立血量系统 | BodyPartManager, 110+ tests |
| 第 2 周 | 部位状态效果 | BodyPartStatusManager, 110+ tests |
| 第 3 周 | 治疗和恢复机制 | RecoverySystem, 100+ tests |
| 第 4 周 | 装备集成和测试 | EquipmentIntegration, 50+ tests |

**总计**: 4 周，2,400+ 行代码，420+ 测试

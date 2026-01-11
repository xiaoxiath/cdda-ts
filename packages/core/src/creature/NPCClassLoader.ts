/**
 * NPC 数据加载器
 *
 * 从 Cataclysm-DDA JSON 文件加载 NPC 定义
 */

import { NPC, NPCClass, NPCData } from './NPC';
import { Tripoint } from '../coordinates/Tripoint';
import { CharacterStats } from './types';

/**
 * NPC JSON 数据格式
 */
export interface NPCJson {
  type: 'npc';
  id: string;
  '//'?: string;
  name_suffix?: string;
  name_unique?: string;
  class: string;
  attitude?: number;
  mission?: number;
  chat?: string;
  faction?: string;
  gender?: 'male' | 'female' | 'nonbinary';
  [key: string]: unknown;
}

/**
 * NPC 类定义（简化版）
 *
 * Cataclysm-DDA 中 NPC 类通常在代码中定义
 * 这里提供一些常见的 NPC 类模板
 */
export class NPCClassLoader {
  private readonly classes: Map<string, NPCClass> = new Map();

  constructor() {
    this.initializeDefaultClasses();
  }

  /**
   * 初始化默认的 NPC 类
   */
  private initializeDefaultClasses(): void {
    // 战士类
    this.classes.set('NC_SOLDIER', {
      id: 'NC_SOLDIER',
      name: 'Soldier',
      description: 'Military soldier',
      defaultStats: {
        str: 12,
        dex: 10,
        int: 8,
        per: 10,
      },
      hpMultiplier: 1.2,
      skills: {
        rifle: 3,
        pistol: 3,
        dodging: 2,
      },
    });

    // 暴徒类
    this.classes.set('NC_THUG', {
      id: 'NC_THUG',
      name: 'Thug',
      description: 'Criminal thug',
      defaultStats: {
        str: 10,
        dex: 9,
        int: 6,
        per: 8,
      },
      hpMultiplier: 1.0,
      skills: {
        bashing: 2,
        cutting: 1,
        melee: 2,
      },
    });

    // 幸存者类
    this.classes.set('NC_SURVIVOR', {
      id: 'NC_SURVIVOR',
      name: 'Survivor',
      description: 'Regular survivor',
      defaultStats: {
        str: 8,
        dex: 8,
        int: 8,
        per: 8,
      },
      hpMultiplier: 1.0,
      skills: {
        survival: 2,
        cooking: 1,
      },
    });

    // 商人类
    this.classes.set('NC_MERCHANT', {
      id: 'NC_MERCHANT',
      name: 'Merchant',
      description: 'Trader',
      defaultStats: {
        str: 7,
        dex: 8,
        int: 12,
        per: 10,
      },
      hpMultiplier: 0.9,
      skills: {
        barter: 4,
        speech: 3,
      },
    });

    // 医生类
    this.classes.set('NC_DOCTOR', {
      id: 'NC_DOCTOR',
      name: 'Doctor',
      description: 'Medical doctor',
      defaultStats: {
        str: 6,
        dex: 10,
        int: 14,
        per: 12,
      },
      hpMultiplier: 0.9,
      skills: {
        firstaid: 5,
        speech: 2,
      },
    });

    // 农民类
    this.classes.set('NC_FARMER', {
      id: 'NC_FARMER',
      name: 'Farmer',
      description: 'Agricultural worker',
      defaultStats: {
        str: 9,
        dex: 9,
        int: 7,
        per: 9,
      },
      hpMultiplier: 1.0,
      skills: {
        survival: 3,
        cooking: 2,
      },
    });

    // Apis 类（特殊 NPC）
    this.classes.set('NC_APIS', {
      id: 'NC_APIS',
      name: 'Apis',
      description: 'Special NPC - Apis',
      defaultStats: {
        str: 8,
        dex: 8,
        int: 10,
        per: 10,
      },
      hpMultiplier: 1.0,
      skills: {
        speech: 4,
        survival: 2,
      },
    });
  }

  /**
   * 获取 NPC 类
   */
  getClass(classId: string): NPCClass | undefined {
    return this.classes.get(classId);
  }

  /**
   * 注册自定义 NPC 类
   */
  registerClass(npcClass: NPCClass): void {
    this.classes.set(npcClass.id, npcClass);
  }

  /**
   * 从 JSON 加载 NPC 定义
   */
  loadFromJson(jsonArray: NPCJson[]): Map<string, NPCData> {
    const npcData = new Map<string, NPCData>();

    for (const json of jsonArray) {
      if (json.type !== 'npc') {
        continue;
      }

      npcData.set(json.id, {
        id: json.id,
        nameSuffix: json.name_suffix,
        nameUnique: json.name_unique,
        classId: json.class,
        attitude: json.attitude,
        gender: json.gender,
        faction: json.faction,
        mission: json.mission,
        chat: json.chat,
      });
    }

    return npcData;
  }

  /**
   * 从 JSON 文件路径加载
   */
  async loadFromFile(filePath: string): Promise<Map<string, NPCData>> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(content);

    // 确保数据是数组
    const jsonArray = Array.isArray(jsonData) ? jsonData : [jsonData];

    return this.loadFromJson(jsonArray as NPCJson[]);
  }

  /**
   * 创建 NPC 实例
   */
  createNPC(
    data: NPCData,
    position: Tripoint,
    name?: string
  ): NPC | undefined {
    const npcClass = this.getClass(data.classId);
    if (!npcClass) {
      console.warn(`NPC class not found: ${data.classId}`);
      return undefined;
    }

    // 生成名称
    const npcName = name || data.nameUnique || data.nameSuffix || npcClass.name;

    return new NPC(
      data.id,
      position,
      npcName,
      npcClass,
      data.attitude,
      data.faction
    );
  }
}

/**
 * NPC 数据管理器
 */
export class NPCManager {
  private readonly loader: NPCClassLoader;
  private readonly npcs: Map<string, NPC> = new Map();

  constructor() {
    this.loader = new NPCClassLoader();
  }

  /**
   * 获取加载器
   */
  getLoader(): NPCClassLoader {
    return this.loader;
  }

  /**
   * 添加 NPC
   */
  addNPC(npc: NPC): void {
    this.npcs.set(npc.id, npc);
  }

  /**
   * 获取 NPC
   */
  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }

  /**
   * 获取所有 NPC
   */
  getAllNPCs(): ReadonlyArray<NPC> {
    return Array.from(this.npcs.values());
  }

  /**
   * 根据条件筛选 NPC
   */
  filterNPCs(predicate: (npc: NPC) => boolean): NPC[] {
    return Array.from(this.npcs.values()).filter(predicate);
  }

  /**
   * 清空所有 NPC
   */
  clear(): void {
    this.npcs.clear();
  }
}

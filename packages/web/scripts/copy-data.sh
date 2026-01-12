#!/bin/bash

# CDDA 数据复制脚本
# 将核心游戏数据从 Cataclysm-DDA 复制到 web 项目的 public 目录

set -e

# 路径配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# 从 packages/web/scripts 获取项目根目录
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CDDA_ROOT="$PROJECT_ROOT/../Cataclysm-DDA"
WEB_PUBLIC="$PROJECT_ROOT/packages/web/public"
DATA_DIR="$WEB_PUBLIC/data"

echo "========================================"
echo "CDDA 数据复制工具"
echo "========================================"

# 检查 CDDA 目录是否存在
if [ ! -d "$CDDA_ROOT" ]; then
  echo "错误: 找不到 Cataclysm-DDA 目录: $CDDA_ROOT"
  echo "请确保项目结构正确"
  exit 1
fi

echo "CDDA 目录: $CDDA_ROOT"
echo "Web 项目: $PROJECT_ROOT"
echo ""

# 创建数据目录
mkdir -p "$DATA_DIR"

# 要复制的数据目录
DATA_DIRS=(
  "json/furniture_and_terrain"
  "json/mapgen"
  "json/mapgen_palettes"
  "json/overmap"
)

echo "[1/2] 清理旧数据..."
rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR"

echo "[2/2] 复制游戏数据..."
for dir in "${DATA_DIRS[@]}"; do
  src="$CDDA_ROOT/data/$dir"
  if [ -d "$src" ]; then
    echo "  - 复制 $dir"
    cp -r "$src" "$DATA_DIR/"
  else
    echo "  ⚠️  跳过不存在的目录: $dir"
  fi
done

# 复制一些核心 JSON 文件
CORE_FILES=(
  "json/construction_group.json"
  "json/item_groups.json"
  "json/uncraft"
)

echo ""
echo "[额外] 复制核心数据文件..."
for file in "${CORE_FILES[@]}"; do
  src="$CDDA_ROOT/data/$file"
  if [ -f "$src" ]; then
    # 处理目录
    file_dir=$(dirname "$DATA_DIR/$file")
    mkdir -p "$file_dir"
    echo "  - 复制 $file"
    cp "$src" "$DATA_DIR/$file"
  fi
done

# 创建数据说明文件
cat > "$DATA_DIR/README.md" << 'EOF'
# CDDA 游戏数据

此目录包含从 Cataclysm-DDA 复制的游戏数据文件。

## 数据结构

```
data/
├── json/
│   ├── furniture_and_terrain/  # 家具和地形定义
│   ├── mapgen/                 # 地图生成器
│   ├── mapgen_palettes/        # 地图生成调色板
│   └── overmap/               # 世界地图地形
└── README.md
```

## 更新数据

运行复制脚本更新数据：

```bash
pnpm copy-data
```

或手动运行：

```bash
./packages/web/scripts/copy-data.sh
```
EOF

echo ""
echo "========================================"
echo "数据复制完成！"
echo "========================================"
echo ""
echo "数据目录: $DATA_DIR"
echo ""
echo "统计信息:"
echo "  - 地形文件: $(find "$DATA_DIR/json/furniture_and_terrain" -name "terrain-*.json" 2>/dev/null | wc -l | tr -d ' ')"
echo "  - 家具文件: $(find "$DATA_DIR/json/furniture_and_terrain" -name "furniture-*.json" 2>/dev/null | wc -l | tr -d ' ')"
echo "  - 总大小: $(du -sh "$DATA_DIR" | cut -f1)"
echo ""

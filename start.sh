#!/bin/bash

# CMS 项目启动脚本
# 启动后端 NestJS 服务和前端 Vue 服务

set -e

echo "=========================================="
echo "  CMS 内容管理平台 - 启动脚本"
echo "=========================================="

# 检查 node 是否存在
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查 npm 或 pnpm
PACKAGE_MANAGER="npm"
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
elif command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
fi

echo "📦 使用包管理器: $PACKAGE_MANAGER"

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOGS_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"

mkdir -p "$LOGS_DIR"
mkdir -p "$PID_DIR"

echo "📍 项目根目录: $PROJECT_ROOT"

# 检查目录是否存在
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ 错误: 后端目录不存在: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ 错误: 前端目录不存在: $FRONTEND_DIR"
    exit 1
fi

# 检查是否需要安装依赖
install_dependencies() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        echo "📥 正在安装 $name 依赖..."
        cd "$dir" && $PACKAGE_MANAGER install
        echo "✅ $name 依赖安装完成"
    fi
}

install_dependencies "$PROJECT_ROOT" "项目根目录"
install_dependencies "$BACKEND_DIR" "后端"
install_dependencies "$FRONTEND_DIR" "前端"

# 尝试创建数据库（如果使用 Docker）
echo "🗄️  尝试创建数据库..."
if command -v docker &> /dev/null; then
    # 尝试多种可能的容器名称
    for container in "dev-postgres" "postgres" "db_zj_60037"; do
        if docker ps --format '{{.Names}}' | grep -q "$container"; then
            echo "🔍 找到 PostgreSQL 容器: $container"
            # PostgreSQL 不支持 CREATE DATABASE IF NOT EXISTS，需要先检查是否存在
            DB_EXISTS=$(docker exec -e PGPASSWORD=dev123456 "$container" psql -U dev -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='db_zj_60037'" 2>/dev/null || echo "")
            if [ "$DB_EXISTS" = "1" ]; then
                echo "   数据库 db_zj_60037 已存在，跳过创建"
            else
                echo "   创建数据库 db_zj_60037..."
                docker exec -e PGPASSWORD=dev123456 "$container" psql -U dev -d postgres -c "CREATE DATABASE db_zj_60037" 2>/dev/null || true
                echo "   数据库创建完成"
            fi
            break
        fi
    done
fi

# 运行数据库迁移和种子数据
echo "🗄️  准备数据库..."
cd "$BACKEND_DIR"

# 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
npx prisma generate

# 运行数据库迁移
echo "📊 运行数据库迁移..."
npx prisma db push

# 运行种子数据
echo "🌱 运行种子数据..."
npx prisma db seed 2>/dev/null || echo "⚠️  种子数据可能已存在，跳过"

echo "✅ 数据库准备完成"

# 停止现有服务
echo "🛑 停止现有服务..."
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid" 2>/dev/null)
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    rm -f "$PID_DIR/backend.pid"
fi

if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid" 2>/dev/null)
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    rm -f "$PID_DIR/frontend.pid"
fi

# 等待几秒确保端口释放
sleep 1

# 启动服务
echo ""
echo "🚀 启动服务..."
echo ""

# 启动后端（后台运行）
echo "🔵 启动后端服务 (端口 3000)..."
cd "$BACKEND_DIR"
npx nest start --watch > "$LOGS_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"
echo "   后端 PID: $BACKEND_PID"
echo "   日志文件: $LOGS_DIR/backend.log"

# 等待后端启动
sleep 3

# 启动前端（后台运行）
echo "🟢 启动前端服务 (端口 5173)..."
cd "$FRONTEND_DIR"
npx vite --host > "$LOGS_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"
echo "   前端 PID: $FRONTEND_PID"
echo "   日志文件: $LOGS_DIR/frontend.log"

# 等待前端启动
sleep 5

echo ""
echo "=========================================="
echo "  ✅ 服务已启动!"
echo "=========================================="
echo "📌 后端 API: http://localhost:3000"
echo "📌 Swagger 文档: http://localhost:3000/api"
echo "📌 前端: http://localhost:5173"
echo "=========================================="
echo ""
echo "👤 默认账户:"
echo "   管理员: admin / 123456"
echo "   编辑: editor / 123456"
echo ""
echo "📝 日志文件:"
echo "   后端日志: tail -f $LOGS_DIR/backend.log"
echo "   前端日志: tail -f $LOGS_DIR/frontend.log"
echo ""
echo "🛑 停止服务:"
echo "   kill $(cat $PID_DIR/backend.pid) $(cat $PID_DIR/frontend.pid)"
echo "=========================================="
echo ""

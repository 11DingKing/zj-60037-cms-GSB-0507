#!/bin/bash

# CMS 项目重启脚本
# 停止现有服务并重新启动

set -e

echo "=========================================="
echo "  CMS 内容管理平台 - 重启脚本"
echo "=========================================="

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$PROJECT_ROOT/pids"

echo "📍 项目根目录: $PROJECT_ROOT"

# 查找并停止相关进程
echo "🛑 停止现有服务..."

# 停止 PID 文件中记录的进程
if [ -f "$PID_DIR/backend.pid" ]; then
    BACKEND_PID=$(cat "$PID_DIR/backend.pid" 2>/dev/null)
    if [ -n "$BACKEND_PID" ]; then
        echo "   停止后端进程 (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
    fi
    rm -f "$PID_DIR/backend.pid"
fi

if [ -f "$PID_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PID_DIR/frontend.pid" 2>/dev/null)
    if [ -n "$FRONTEND_PID" ]; then
        echo "   停止前端进程 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    rm -f "$PID_DIR/frontend.pid"
fi

# 查找并杀死端口占用进程
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo "   停止端口 $port 上的进程 (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
}

# 停止常用端口
kill_port 3000  # 后端端口
kill_port 5173  # 前端 Vite 端口
kill_port 5555  # Prisma Studio

echo "✅ 现有服务已停止"

# 等待几秒确保端口释放
echo "⏳ 等待端口释放..."
sleep 2

# 调用 start.sh 启动服务
echo "🚀 重新启动服务..."
echo ""

# 执行 start.sh
cd "$PROJECT_ROOT"
exec bash "$PROJECT_ROOT/start.sh"

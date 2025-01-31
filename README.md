# Depined 自动化工具

![banner](image.png)

## 功能特点

- **自动 Ping 连接维护**
- **支持多账户管理**
- **支持代理配置**

## 获取令牌方法

1. 打开 Depined 仪表板 [https://app.depined.org/dashboard](https://app.depined.org/dashboard)
2. 使用邮箱登录
3. 按 F12 打开开发者工具，找到 Application 标签
4. 在 Local Storage 中找到 `token` 并复制其值
    ![token](image-1.png)

## VPS 部署教程

### 1. 准备工作

确保你的 VPS 满足以下条件：
- 操作系统：Ubuntu/Debian/CentOS
- Node.js 版本 >= 16
- 内存 >= 1GB
- 硬盘空间 >= 10GB

### 2. 安装必要软件

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# 安装 Git
apt install -y git

# 安装 Screen（用于后台运行）
apt install -y screen
```

### 3. 下载项目

```bash
# 克隆项目
git clone https://github.com/mumumusf/depinedBot.git
cd depinedBot

# 安装依赖
npm install
```

### 4. 后台运行设置

```bash
# 创建新的 screen 会话
screen -S depined

# 运行程序
npm run start

# 分离 screen 会话（按 Ctrl+A 然后按 D）
```

### 5. 常用命令

```bash
# 查看所有 screen 会话
screen -ls

# 重新连接到 screen 会话
screen -r depined

# 结束程序
# 1. 重新连接到 screen 会话
# 2. 按 Ctrl+C 停止程序
# 3. 输入 exit 关闭会话
```

### 6. 代理设置说明

支持两种代理格式：
- 格式1: `ip:port:username:password`
- 格式2: `ip:port`

示例：
```
208.196.127.126:6544:username:password
```

### 7. 运行维护

1. **日志查看**
   ```bash
   # 实时查看日志
   tail -f depined.log
   ```

2. **自动重启设置**
   创建 `restart.sh`:
   ```bash
   #!/bin/bash
   while true; do
     npm run start
     sleep 5
   done
   ```
   
   设置权限并运行：
   ```bash
   chmod +x restart.sh
   screen -S depined ./restart.sh
   ```

3. **内存监控**
   ```bash
   # 查看内存使用情况
   free -h
   
   # 查看程序占用资源
   top | grep node
   ```

### 8. 故障排除

1. **程序无响应**
   ```bash
   # 查找并结束所有 Node.js 进程
   pkill -f node
   
   # 重新启动程序
   screen -S depined
   npm run start
   ```

2. **内存占用过高**
   ```bash
   # 清理系统缓存
   sync && echo 3 > /proc/sys/vm/drop_caches
   ```

3. **网络问题**
   ```bash
   # 测试网络连接
   ping app.depined.org
   
   # 查看网络状态
   netstat -tunlp | grep node
   ```

## 免责声明

- 本脚本仅供学习交流使用
- 使用本脚本所产生的任何后果由用户自行承担
- 如果因使用本脚本造成任何损失，作者概不负责

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
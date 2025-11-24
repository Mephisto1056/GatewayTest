# 组织领导力测评系统 (Gateway Test)

这是一个基于 NestJS (后端) 和 Vue 3 (前端) 的组织领导力测评系统。

## 🚀 快速开始 (推荐使用 Docker)

本项目支持使用 Docker Compose 一键启动，无需手动安装 Node.js 或 PostgreSQL。

### 前置条件
- 确保本地已安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或 Docker Engine。

### 启动步骤

1.  **克隆代码库**
    ```bash
    git clone https://github.com/Mephisto1056/GatewayTest.git
    cd GatewayTest
    ```

2.  **配置环境变量 (可选)**
    项目默认提供了一套开发用的环境变量。如需自定义（例如修改数据库密码或 SMTP 邮件配置），请修改 `docker-compose.yml` 中的 `environment` 部分，或者创建 `.env` 文件。

3.  **启动服务**
    在项目根目录下运行：
    ```bash
    docker-compose up -d --build
    ```
    *第一次运行可能需要几分钟时间来下载镜像和构建应用。*

4.  **访问系统**
    启动完成后，通过浏览器访问：
    *   **前端页面**: `http://localhost` (或 `http://127.0.0.1`)
    *   **后端 API**: `http://localhost/api` (通过 Nginx 转发)

### 默认账号

系统首次启动时会自动初始化以下账号：

*   **管理员**: `admin@gateway.com` / `adminpassword`
*   **测试用户**: `user@example.com` / `userpassword`

---

## 🛠️ 本地开发指南 (不使用 Docker)

如果你需要进行代码开发或调试，可以在本地分别运行前后端服务。

### 前置条件
*   Node.js v18+
*   PostgreSQL v14+ (需手动安装并运行)

### 1. 数据库设置
创建一个名为 `gateway` 的 PostgreSQL 数据库。

### 2. 后端启动 (Backend)
```bash
cd backend
npm install

# 复制环境变量文件 (根据需要修改 .env 内容)
cp .env.example .env 

# 启动开发服务器
npm run start:dev
```
后端服务将运行在 `http://localhost:3000`。

### 3. 前端启动 (Frontend)
```bash
cd frontend
npm install

# 启动开发服务器
npm run dev
```
前端服务通常运行在 `http://localhost:5173`。

---

## 📂 目录结构

*   `backend/`: NestJS 后端代码
*   `frontend/`: Vue 3 + Vite 前端代码
*   `doc/`: 项目文档（包含需求、设计、部署说明等）
*   `docker-compose.yml`: Docker 编排文件

## 📚 更多文档

详细的部署说明、操作手册和设计文档请查阅 `doc/` 目录：
*   [部署说明文档](doc/部署说明文档.md)
*   [操作流程](doc/操作流程.md)
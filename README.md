# ERP 全渠道企业资源管理系统

> 基于技术架构文档搭建的基础框架

## 项目结构

```
erp-docs/
├── erp-server/              # 后端 Spring Boot 多模块项目
│   ├── erp-common/          # 公共模块
│   │   ├── erp-common-core     # 核心工具、统一响应、异常定义
│   │   ├── erp-common-security # 安全框架封装 (JWT + RBAC)
│   │   ├── erp-common-mybatis  # MyBatis-Plus 配置
│   │   └── erp-common-redis    # Redis 工具封装
│   ├── erp-system/          # 系统管理 (用户、角色、权限、字典)
│   ├── erp-product/         # 产品管理 (产品、分类、BOM)
│   ├── erp-inventory/       # 库存管理 (入库、出库、盘点)
│   ├── erp-sales/           # 销售管理 (客户、订单、退货)
│   ├── erp-purchase/        # 采购管理 (采购单、到货、应付)
│   ├── erp-production/      # 生产管理 (工艺、工单、MRP)
│   ├── erp-finance/         # 财务管理 (价格、发票、报税)
│   ├── erp-hr/              # 人事管理 (员工、考勤、审批)
│   ├── erp-integration/     # 外部集成 (电商、物流、发票平台)
│   └── erp-admin/           # 启动模块
│
├── erp-frontend/            # 前端 pnpm Monorepo
│   ├── packages/
│   │   └── shared/          # 共享层 (API、类型、状态管理、Hooks)
│   └── apps/
│       └── web/             # Web 端应用 (React + Vite + Ant Design)
│
├── docker-compose.yml       # 开发环境 Docker 配置
├── .env.example             # 环境变量示例
└── docs/                    # 文档
    ├── prd.md               # 产品需求文档
    ├── dev-design.md        # 开发设计文档
    └── tech-architecture.md # 技术架构文档
```

## 技术栈

### 后端
| 组件 | 版本 | 说明 |
|------|------|------|
| Java | 17 LTS | 运行环境 |
| Spring Boot | 3.2+ | 基础框架 |
| Spring Security | 6.x | 认证授权 |
| MyBatis-Plus | 3.5+ | ORM 框架 |
| PostgreSQL | 15+ | 主数据库 |
| Redis | 7.x | 缓存、会话、分布式锁 |
| RabbitMQ | 3.12+ | 异步消息队列 |
| JWT | 0.12+ | Token 认证 |

### 前端
| 组件 | 版本 | 说明 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Ant Design | 5.x | UI 组件库 |
| React Router | 6.x | 路由管理 |
| Zustand | 4.x | 状态管理 |
| TanStack Query | 5.x | 服务端状态 & 缓存 |

## 快速开始

### 1. 启动基础设施

```bash
# 复制环境变量配置
cp .env.example .env

# 启动 Docker 服务
docker-compose up -d
```

启动后会创建以下服务：
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672` (管理界面: http://localhost:15672)
- MinIO (对象存储): `localhost:9000` (控制台: http://localhost:9001)

### 2. 启动后端服务

```bash
cd erp-server

# 编译打包
mvn clean install -DskipTests

# 启动应用
cd erp-admin
mvn spring-boot:run
```

后端服务启动后访问：
- API 文档: http://localhost:8080/swagger-ui.html
- Actuator: http://localhost:8080/actuator

### 3. 启动前端应用

```bash
cd erp-frontend

# 安装依赖
pnpm install

# 复制环境变量
cp apps/web/.env.example apps/web/.env

# 启动 Web 应用
pnpm dev:web
```

前端访问地址: http://localhost:3000

默认登录账号: `admin` / `123456`

## 模块说明

### 后端模块

| 模块 | 功能 |
|------|------|
| erp-common-core | 统一响应 Result、异常处理、分页、工具类 |
| erp-common-security | JWT 认证、Spring Security 配置、RBAC 权限 |
| erp-common-mybatis | MyBatis-Plus 配置、分页插件 |
| erp-common-redis | Redis 操作、分布式锁 |
| erp-system | 用户管理、角色权限、数据字典 |
| erp-product | 产品管理、分类管理、BOM |
| erp-inventory | 库存管理、出入库、盘点 |
| erp-sales | 销售订单、客户管理 |
| erp-purchase | 采购订单、供应商管理 |
| erp-production | 生产工单、MRP |
| erp-finance | 财务、发票 |
| erp-hr | 人事、审批流程 |
| erp-integration | 电商平台对接、物流对接 |

### 前端模块

| 模块 | 功能 |
|------|------|
| @erp/shared | API 封装、类型定义、Zustand 状态、Hooks |
| @erp/web | Web 端应用、页面组件 |

## API 设计规范

```
基础路径: /api/v1/{module}/{resource}

示例:
  GET    /api/v1/product/products          # 产品列表（分页）
  GET    /api/v1/product/products/{id}     # 产品详情
  POST   /api/v1/product/products          # 创建产品
  PUT    /api/v1/product/products/{id}     # 更新产品
  DELETE /api/v1/product/products/{id}     # 删除产品
```

统一响应格式：
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": "2024-01-15 10:30:00"
}
```

## 开发规范

### Git 提交规范

```
feat: 新功能
fix: 修复
docs: 文档
style: 格式（不影响代码运行的变动）
refactor: 重构
perf: 性能优化
test: 测试
ci: CI/CD 相关
chore: 构建过程或辅助工具的变动
```

### 代码规范

- 后端遵循阿里巴巴 Java 开发手册
- 前端使用 ESLint + Prettier 约束代码风格

## 相关文档

- [产品需求文档 (PRD)](./prd.md)
- [开发设计文档](./dev-design.md)
- [技术架构文档](./tech-architecture.md)

## 许可证

[MIT](LICENSE)

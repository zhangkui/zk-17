# zk-17 - 冷库叉车盲区预警系统

冷库场景下的叉车盲区识别与碰撞风险预警系统，实现对叉车作业区域的实时监控、人员定位、盲区分析、碰撞预警、事件回放、统计分析等功能。

## 技术栈

### 后端
- **框架**: ASP.NET Core 8.0 (Clean Architecture)
- **实时通信**: SignalR
- **消息队列**: RabbitMQ
- **数据库**: EF Core (可配置 PostgreSQL / SQL Server / SQLite)
- **分层结构**:
  - `ColdStorageForklift.Api` - API 层 (Controllers, Hubs, DTOs)
  - `ColdStorageForklift.Services` - 业务服务层
  - `ColdStorageForklift.Core` - 核心领域层 (Entities, Interfaces)
  - `ColdStorageForklift.Infrastructure` - 基础设施层 (Repositories, Data)

### 前端
- **框架**: Angular 17 (Standalone Components, Application Builder)
- **实时通信**: SignalR Client
- **UI组件**: 原生 Canvas 2D 绘制 + 自定义样式
- **状态管理**: RxJS Subjects

## 项目结构

```
zk-17/
├── backend/                              # 后端 .NET 解决方案
│   └── src/
│       ├── ColdStorageForklift.Api/      # Web API & SignalR Hub
│       ├── ColdStorageForklift.Services/ # 业务服务
│       ├── ColdStorageForklift.Core/     # 领域实体与接口
│       └── ColdStorageForklift.Infrastructure/  # 数据访问
├── frontend/                             # 前端 Angular 应用
│   └── src/app/
│       ├── core/                         # 核心服务与模型
│       │   ├── models/index.ts           # 数据模型定义
│       │   └── services/
│       │       ├── api.service.ts        # HTTP API 服务（含数据转换层）
│       │       └── signalr.service.ts    # SignalR 实时通信服务
│       └── features/                     # 功能模块
│           ├── dashboard/                # 实时监控仪表盘
│           ├── blind-spot/               # 盲区识别
│           ├── collision-warning/        # 碰撞预警
│           ├── zone-modeling/            # 区域建模
│           ├── team-archive/             # 班组归档
│           ├── statistics/               # 统计分析
│           └── event-replay/             # 事件回放
├── docker/                               # Docker 相关文件
│   ├── docker-compose.yml                # 编排文件
│   ├── api.Dockerfile                    # 后端镜像
│   ├── web.Dockerfile                    # 前端镜像
│   └── nginx.conf                        # Nginx 反向代理配置
└── README.md
```

## API 接口列表

### 位置服务 (Positions)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/positions/forklifts` | 获取所有叉车实时位置 |
| GET | `/api/positions/personnel` | 获取所有人员实时位置 |
| POST | `/api/positions/forklift/{id}` | 更新叉车位置 |
| POST | `/api/positions/personnel/{id}` | 更新人员位置 |
| GET | `/api/positions/history` | 获取位置历史记录 |

### 盲区服务 (BlindSpots)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/blindspots` | 获取所有活跃盲区 |
| GET | `/api/blindspots/forklift/{id}` | 获取指定叉车盲区详情 |
| POST | `/api/blindspots/calculate` | 触发盲区重新计算 |

### 碰撞预警服务 (Warnings)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/warnings` | 获取所有活跃预警 |
| GET | `/api/warnings/{id}` | 获取单条预警详情 |
| POST | `/api/warnings/{id}/acknowledge` | 确认（处理）预警 |
| GET | `/api/warnings/history` | 获取历史预警记录 |

### 区域服务 (Zones)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/zones` | 获取所有区域定义 |
| GET | `/api/zones/{id}` | 获取单个区域详情 |
| POST | `/api/zones` | 创建新区域 |
| PUT | `/api/zones/{id}` | 更新区域属性 |
| DELETE | `/api/zones/{id}` | 删除区域 |

### 统计服务 (Statistics)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/statistics/high-risk-periods` | 24小时高风险时段统计 |
| GET | `/api/statistics/warning-trend` | 预警趋势分析（按日/周/月） |
| GET | `/api/statistics/zone-risk-ranking` | 区域风险排名 |
| GET | `/api/statistics/team-safety-scores` | 班组安全评分 |

### 班组服务 (Teams)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teams` | 获取所有班组 |
| POST | `/api/teams` | 创建班组 |
| PUT | `/api/teams/{id}` | 更新班组信息 |
| GET | `/api/teams/{id}/members` | 获取班组成员 |
| POST | `/api/teams/{id}/members` | 添加班组成员 |
| GET | `/api/teams/{id}/events` | 获取班组关联事件 |

### 事件回放服务 (Events)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/events` | 获取事件日志列表 |
| GET | `/api/events/replay` | 获取指定时间段回放数据 |

### SignalR 实时 Hub
| 端点 | 说明 |
|------|------|
| `/hubs/monitoring` | 实时数据推送通道 |

**Hub 事件类型**:
- `ForkliftPositionUpdate` - 叉车位置更新
- `PersonnelPositionUpdate` - 人员位置更新
- `BlindSpotUpdate` - 盲区状态更新
- `WarningTriggered` - 新预警触发
- `WarningResolved` - 预警已解除

## 快速开始

### 环境要求
- Node.js 20+
- .NET SDK 8.0
- Docker & Docker Compose (推荐)

### 方式一：Docker Compose 一键部署

```bash
cd docker
docker-compose up -d
```

启动后访问:
- **前端**: http://localhost
- **后端 API**: http://localhost/api
- **SignalR Hub**: http://localhost/hubs/monitoring

### 方式二：本地开发

#### 启动后端
```bash
cd backend
dotnet restore
dotnet run --project src/ColdStorageForklift.Api/ColdStorageForklift.Api.csproj
```
后端监听 http://localhost:8080

#### 启动前端
```bash
cd frontend
npm install
npm start
```
前端监听 http://localhost:4200

> **注意**: 本地开发时，前端已配置好代理规则，将 `/api` 和 `/hubs` 转发到后端 8080 端口。

## 前端功能模块说明

### 1. 实时监控 (Dashboard)
- 2D 俯视画布展示叉车、人员、区域、盲区、预警位置
- 顶部统计卡片：在线叉车/人员数、活跃预警数、盲区数
- 右侧实时预警列表
- SignalR 实时更新

### 2. 盲区识别 (Blind Spot)
- 盲区扇形覆盖图，按风险等级着色
- 盲区详情列表：角度、半径、盲区内人员数
- 极高/高/中/低 四级风险标识

### 3. 碰撞预警 (Collision Warning)
- 预警分布地图（脉冲动画标识位置）
- 按风险等级统计数量
- 预警确认操作与详情弹窗

### 4. 区域建模 (Zone Modeling)
- 拖拽式画布绘制区域
- 区域属性编辑（名称、类型、位置、大小、温度、高风险标识）
- 区域类型：冷藏区、通道、装卸区、充电区、限制区

### 5. 班组归档 (Team Archive)
- 班组列表与安全评分
- 班组成员管理
- 班组关联事件追溯表
- 责任统计卡片

### 6. 统计分析 (Statistics)
- 24小时高风险时段柱状图
- 预警趋势折线图
- 区域风险排名表
- 班组安全雷达图

### 7. 事件回放 (Event Replay)
- 按日期选择历史事件
- 动画回放指定事件前后 4 分钟轨迹
- 播放/暂停/停止/倍速/进度拖拽

## Nginx 路由规则

参见 [nginx.conf](file:///e:/2026zk/zk-17/docker/nginx.conf)

```
/api/*     →  后端 API (http://api:8080)
/hubs/*    →  SignalR Hub (http://api:8080，支持 WebSocket Upgrade)
/*         →  前端静态文件 + Angular SPA fallback (index.html)
```

## 注意事项

1. **前端构建产物**: Angular 17 使用 Application Builder 构建，产物位于 `dist/frontend/browser/` 目录，Docker 部署时需注意拷贝路径。
2. **API 路径一致性**: 前端所有接口统一通过 `/api` 前缀，与后端 Controller 路由 `[Route("api/xxx")]` 完全一致。
3. **数据转换层**: 前端 `ApiService` 内置 DTO → 前端模型 的转换逻辑，确保后端字段命名（PascalCase）与前端字段命名（camelCase / 嵌套对象）的适配。
4. **无 Mock 数据兜底**: 系统严格依赖真实后端数据，所有组件不包含任何 Mock 数据 fallback，确保问题能够及时暴露。
5. **WebSocket 代理**: Nginx 配置 SignalR 路由时必须正确设置 `Upgrade` 和 `Connection` 头，否则 WebSocket 无法建立。

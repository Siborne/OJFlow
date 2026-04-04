# IPC通信机制

<cite>
**本文引用的文件**
- [electron/main.ts](file://electron/main.ts)
- [electron/preload.ts](file://electron/preload.ts)
- [shared/ipc-channels.ts](file://shared/ipc-channels.ts)
- [electron/services/contest.ts](file://electron/services/contest.ts)
- [electron/services/rating.ts](file://electron/services/rating.ts)
- [electron/services/solvedNum.ts](file://electron/services/solvedNum.ts)
- [shared/types.ts](file://shared/types.ts)
- [src/services/contest.ts](file://src/services/contest.ts)
- [src/services/rating.ts](file://src/services/rating.ts)
- [src/services/solved.ts](file://src/services/solved.ts)
- [src/stores/contest.ts](file://src/stores/contest.ts)
- [electron/store.ts](file://electron/store.ts)
</cite>

## 目录
1. [引言](#引言)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考量](#性能考量)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录](#附录)

## 引言
本文件系统性梳理 OJFlow 的 IPC（跨进程）通信机制，聚焦 Electron 主进程与渲染进程之间的消息传递架构。重点覆盖以下方面：
- 使用模式：ipcMain.handle 与 ipcRenderer.invoke 的配对使用
- IPC 通道定义与命名规范：GET_CONTESTS、GET_RATING、GET_SOLVED_NUM 等
- 预加载脚本的安全隔离：contextIsolation 与 nodeIntegration 的配置原理
- 完整消息协议：请求参数校验、错误分类与处理、响应格式标准化
- 实际调用示例：在 Vue 组件中如何通过 window.api 调用 IPC 接口，主进程如何处理与响应
- 安全考虑：URL 协议验证、参数长度限制等

## 项目结构
OJFlow 的 IPC 通信围绕“共享通道常量 + 预加载白名单 API + 主进程处理器”的三层设计展开：
- 共享层：统一定义 IPC 通道名称与类型映射
- 预加载层：通过 contextBridge 将受控 API 暴露给渲染进程
- 主进程层：注册 ipcMain.handle 处理器，执行业务逻辑并返回结果

```mermaid
graph TB
subgraph "共享层"
CH["IPC 通道常量<br/>shared/ipc-channels.ts"]
TYPES["类型定义<br/>shared/types.ts"]
end
subgraph "主进程"
MAIN["主进程入口<br/>electron/main.ts"]
SVC_CONTEST["赛事服务<br/>electron/services/contest.ts"]
SVC_RATING["评分服务<br/>electron/services/rating.ts"]
SVC_SOLVED["做题数服务<br/>electron/services/solvedNum.ts"]
ESTORE["Electron Store<br/>electron/store.ts"]
end
subgraph "预加载层"
PRELOAD["预加载脚本<br/>electron/preload.ts"]
end
subgraph "渲染进程"
RND_CONTSVC["渲染侧服务<br/>src/services/contest.ts"]
RND_RATINGSVC["渲染侧服务<br/>src/services/rating.ts"]
RND_SOLVEDSVC["渲染侧服务<br/>src/services/solved.ts"]
STORE["Pinia 状态管理<br/>src/stores/contest.ts"]
end
CH --> MAIN
CH --> PRELOAD
TYPES --> MAIN
TYPES --> PRELOAD
PRELOAD --> MAIN
MAIN --> SVC_CONTEST
MAIN --> SVC_RATING
MAIN --> SVC_SOLVED
MAIN --> ESTORE
PRELOAD --> RND_CONTSVC
PRELOAD --> RND_RATINGSVC
PRELOAD --> RND_SOLVEDSVC
RND_CONTSVC --> STORE
```

图表来源
- [shared/ipc-channels.ts:3-14](file://shared/ipc-channels.ts#L3-L14)
- [electron/preload.ts:1-38](file://electron/preload.ts#L1-L38)
- [electron/main.ts:396-486](file://electron/main.ts#L396-L486)
- [electron/services/contest.ts:12-269](file://electron/services/contest.ts#L12-L269)
- [electron/services/rating.ts:5-174](file://electron/services/rating.ts#L5-L174)
- [electron/services/solvedNum.ts:5-197](file://electron/services/solvedNum.ts#L5-L197)
- [electron/store.ts:27-31](file://electron/store.ts#L27-L31)
- [src/services/contest.ts:7-34](file://src/services/contest.ts#L7-L34)
- [src/services/rating.ts:3-7](file://src/services/rating.ts#L3-L7)
- [src/services/solved.ts:3-7](file://src/services/solved.ts#L3-L7)
- [src/stores/contest.ts:63-201](file://src/stores/contest.ts#L63-L201)

章节来源
- [shared/ipc-channels.ts:1-53](file://shared/ipc-channels.ts#L1-L53)
- [electron/preload.ts:1-38](file://electron/preload.ts#L1-L38)
- [electron/main.ts:357-385](file://electron/main.ts#L357-L385)

## 核心组件
- IPC 通道常量与类型映射：集中定义所有通道名及参数/返回值类型，确保主进程与渲染进程契约一致
- 预加载白名单 API：仅暴露受控方法，避免直接暴露 ipcRenderer 或 Node 能力
- 主进程处理器：注册 ipcMain.handle，执行参数校验、业务调用与错误分类
- 渲染侧服务封装：在 Vue 组件中以 window.api.xxx() 形式调用，内部通过 ipcRenderer.invoke 发送请求
- 类型系统：RawContest/Rating/SolvedNum 等类型在共享层定义，保证前后端数据结构一致性

章节来源
- [shared/ipc-channels.ts:18-52](file://shared/ipc-channels.ts#L18-L52)
- [electron/preload.ts:4-37](file://electron/preload.ts#L4-L37)
- [electron/main.ts:396-486](file://electron/main.ts#L396-L486)
- [shared/types.ts:1-67](file://shared/types.ts#L1-L67)

## 架构总览
下面的序列图展示了从渲染进程到主进程的关键调用链路，以“获取近期赛事”为例。

```mermaid
sequenceDiagram
participant View as "Vue 组件"
participant Store as "Pinia 状态<br/>src/stores/contest.ts"
participant RndSvc as "渲染侧服务<br/>src/services/contest.ts"
participant Preload as "预加载 API<br/>electron/preload.ts"
participant Main as "主进程<br/>electron/main.ts"
participant Svc as "业务服务<br/>electron/services/contest.ts"
View->>Store : 触发获取赛事
Store->>RndSvc : 调用 getRecentContests()
RndSvc->>Preload : window.api.getRecentContests(day)
Preload->>Main : ipcRenderer.invoke(GET_CONTESTS, day)
Main->>Svc : getAllContests(day)
Svc-->>Main : RawContest[]
Main-->>Preload : 返回结果
Preload-->>RndSvc : 返回结果
RndSvc-->>Store : 转换为 Contest[]
Store-->>View : 更新视图
```

图表来源
- [src/stores/contest.ts:190-201](file://src/stores/contest.ts#L190-L201)
- [src/services/contest.ts:7-25](file://src/services/contest.ts#L7-L25)
- [electron/preload.ts:6-10](file://electron/preload.ts#L6-L10)
- [electron/main.ts:396-412](file://electron/main.ts#L396-L412)
- [electron/services/contest.ts:255-266](file://electron/services/contest.ts#L255-L266)

## 详细组件分析

### 通道定义与命名规范
- 通道名采用小写短横线风格，语义清晰且稳定
- 核心通道
  - GET_CONTESTS：获取近期赛事
  - GET_RATING：按平台查询用户评分
  - GET_SOLVED_NUM：按平台查询做题数
  - OPEN_URL：打开外部链接（带协议校验）
  - UPDATER_INSTALL：触发更新安装
  - STORE_GET/STORE_SET/STORE_GET_ALL：读取/设置/读取全部应用配置（通过 electron-store）

章节来源
- [shared/ipc-channels.ts:3-14](file://shared/ipc-channels.ts#L3-L14)

### 预加载脚本与安全隔离
- contextBridge 暴露受控 API：仅导出白名单方法，不直接暴露 ipcRenderer
- 配置项
  - nodeIntegration: false
  - contextIsolation: true
  - preload: 指向预加载脚本
  - sandbox: false（为 electron-store 访问 Node 能力而设，但通过预加载隔离）
- 预加载 API 包含：
  - getRecentContests、getRating、getSolvedNum、openUrl、installUpdate
  - store.get/set/getAll

章节来源
- [electron/preload.ts:1-38](file://electron/preload.ts#L1-L38)
- [electron/main.ts:357-385](file://electron/main.ts#L357-L385)

### 主进程处理器与消息协议
- GET_CONTESTS
  - 参数：day:number
  - 行为：限定范围[min,max]，默认 fallback；调用服务层聚合多平台赛事
  - 返回：RawContest[]
  - 错误：异常时返回空数组
- GET_RATING
  - 参数：{ platform:string, name:string }
  - 行为：参数类型校验、长度限制；根据平台路由到对应服务
  - 返回：Rating
  - 错误：未知平台或网络异常向上抛出
- GET_SOLVED_NUM
  - 参数：{ platform:string, name:string }
  - 行为：参数类型校验、长度限制；根据平台路由到对应服务
  - 返回：SolvedNum
  - 错误：上游接口无效或网络异常向上抛出
- OPEN_URL
  - 参数：url:string
  - 行为：仅允许 http/https 协议，否则抛错
  - 返回：void
- UPDATER_INSTALL
  - 参数：{ url:string }
  - 行为：下载并启动更新包
  - 返回：boolean
- STORE_*（electron-store）
  - STORE_GET/SET/GET_ALL：键值读取/设置/读取全部

章节来源
- [electron/main.ts:396-486](file://electron/main.ts#L396-L486)
- [electron/services/contest.ts:255-266](file://electron/services/contest.ts#L255-L266)
- [electron/services/rating.ts:156-171](file://electron/services/rating.ts#L156-L171)
- [electron/services/solvedNum.ts:166-194](file://electron/services/solvedNum.ts#L166-L194)
- [electron/store.ts:27-31](file://electron/store.ts#L27-L31)

### 业务服务与数据模型
- 赛事服务：聚合 LeetCode、Codeforces、Nowcoder、AtCoder、洛谷、蓝桥云课 等平台的近期赛事
- 评分服务：按平台返回当前/历史最高分
- 做题数服务：按平台返回做题数量
- 数据模型：RawContest、Contest（渲染侧格式化）、Rating、SolvedNum

章节来源
- [electron/services/contest.ts:12-269](file://electron/services/contest.ts#L12-L269)
- [electron/services/rating.ts:5-174](file://electron/services/rating.ts#L5-L174)
- [electron/services/solvedNum.ts:5-197](file://electron/services/solvedNum.ts#L5-L197)
- [shared/types.ts:1-67](file://shared/types.ts#L1-L67)

### 渲染侧调用流程与示例路径
- 在 Vue 组件中，通过 Pinia 状态管理触发获取赛事
- 渲染侧服务封装 window.api 调用
- 示例调用路径（不含代码片段）：
  - [src/stores/contest.ts:190-201](file://src/stores/contest.ts#L190-L201)
  - [src/services/contest.ts:7-25](file://src/services/contest.ts#L7-L25)
  - [src/services/rating.ts:3-7](file://src/services/rating.ts#L3-L7)
  - [src/services/solved.ts:3-7](file://src/services/solved.ts#L3-L7)

章节来源
- [src/stores/contest.ts:190-201](file://src/stores/contest.ts#L190-L201)
- [src/services/contest.ts:7-25](file://src/services/contest.ts#L7-L25)
- [src/services/rating.ts:3-7](file://src/services/rating.ts#L3-L7)
- [src/services/solved.ts:3-7](file://src/services/solved.ts#L3-L7)

### 错误处理与响应格式
- 错误分类与处理
  - 超时/网络类错误：统一分类为 timeout/network，便于 UI 层提示
  - 未知错误：归类为 unknown
- 响应格式
  - GET_CONTESTS：RawContest[]（失败时返回空数组）
  - GET_RATING/GET_SOLVED_NUM：对应领域对象（失败时抛出异常）
  - OPEN_URL/UPDATER_INSTALL：void/boolean
- 参数校验
  - GET_RATING/GET_SOLVED_NUM：字符串长度限制
  - OPEN_URL：协议白名单 http/https

章节来源
- [electron/main.ts:115-167](file://electron/main.ts#L115-L167)
- [electron/main.ts:413-450](file://electron/main.ts#L413-L450)
- [electron/main.ts:451-458](file://electron/main.ts#L451-L458)

## 依赖关系分析
- 低耦合高内聚
  - 通道常量与类型映射集中于共享层，避免重复与不一致
  - 预加载层仅承担“门面”职责，隔离主进程能力
  - 主进程处理器专注业务与错误处理
- 关键依赖链
  - 渲染侧服务 -> 预加载 API -> 主进程处理器 -> 业务服务
  - 主进程处理器 -> electron-store（配置持久化）

```mermaid
graph LR
CH["IPC 通道常量"] --> PRE["预加载 API"]
CH --> MAIN["主进程处理器"]
PRE --> MAIN
MAIN --> SVC1["赛事服务"]
MAIN --> SVC2["评分服务"]
MAIN --> SVC3["做题数服务"]
MAIN --> ESTORE["electron-store"]
```

图表来源
- [shared/ipc-channels.ts:3-14](file://shared/ipc-channels.ts#L3-L14)
- [electron/preload.ts:1-38](file://electron/preload.ts#L1-L38)
- [electron/main.ts:396-486](file://electron/main.ts#L396-L486)
- [electron/services/contest.ts:12-269](file://electron/services/contest.ts#L12-L269)
- [electron/services/rating.ts:5-174](file://electron/services/rating.ts#L5-L174)
- [electron/services/solvedNum.ts:5-197](file://electron/services/solvedNum.ts#L5-L197)
- [electron/store.ts:27-31](file://electron/store.ts#L27-L31)

## 性能考量
- 并发抓取：主进程聚合多平台赛事时使用并发请求，缩短等待时间
- 缓存策略：electron-store 提供本地持久化，减少重复请求
- 超时与重试：网络请求具备超时控制与指数退避重试，提升稳定性
- 参数裁剪：day 参数在主进程侧进行边界裁剪，避免过长窗口导致资源消耗

章节来源
- [electron/services/contest.ts:255-266](file://electron/services/contest.ts#L255-L266)
- [electron/main.ts:176-225](file://electron/main.ts#L176-L225)
- [electron/store.ts:27-31](file://electron/store.ts#L27-L31)

## 故障排查指南
- 常见问题定位
  - 通道名不匹配：检查 shared/ipc-channels.ts 与预加载/主进程是否一致
  - 参数类型错误：主进程对 GET_RATING/GET_SOLVED_NUM 进行类型与长度校验
  - 协议非法：OPEN_URL 仅允许 http/https
  - 网络超时/失败：查看错误分类（timeout/network/unknown），结合日志定位
- 日志与调试
  - 主进程打印错误信息，便于定位上游服务异常
  - 开发模式下可开启 DevTools 辅助调试 IPC 调用

章节来源
- [shared/ipc-channels.ts:3-14](file://shared/ipc-channels.ts#L3-L14)
- [electron/main.ts:413-458](file://electron/main.ts#L413-L458)
- [electron/main.ts:115-167](file://electron/main.ts#L115-L167)

## 结论
OJFlow 的 IPC 通信以“共享通道 + 预加载白名单 + 主进程处理器”为核心，实现了安全、清晰且可扩展的跨进程交互。通过严格的参数校验、错误分类与响应格式标准化，配合并发抓取与缓存策略，既保障了用户体验，也提升了系统的健壮性与可维护性。

## 附录

### IPC 通道与类型映射速览
- GET_CONTESTS：args=[day:number] → return=RawContest[]
- GET_RATING：args=[{platform:string,name:string}] → return=Rating
- GET_SOLVED_NUM：args=[{platform:string,name:string}] → return=SolvedNum
- OPEN_URL：args=[url:string] → return=void
- UPDATER_INSTALL：args=[{url:string}] → return=boolean
- STORE_GET/SET/GET_ALL：键值读取/设置/读取全部

章节来源
- [shared/ipc-channels.ts:18-52](file://shared/ipc-channels.ts#L18-L52)
- [shared/types.ts:1-67](file://shared/types.ts#L1-L67)
# 开发与部署文档

本文档说明当前 Astro 内容站的技术结构、内容管理方式，以及部署到自有服务器时可选的后台方案。

## 目录

- [1. 项目定位](#1-项目定位)
- [2. 技术栈](#2-技术栈)
- [3. 本地开发](#3-本地开发)
- [4. 项目结构](#4-项目结构)
- [5. 内容管理原理](#5-内容管理原理)
- [6. 本地内容后台如何工作](#6-本地内容后台如何工作)
- [7. 自有服务器部署方案](#7-自有服务器部署方案)
- [8. 推荐架构](#8-推荐架构)
- [9. 静态部署步骤](#9-静态部署步骤)
- [10. GitHub 内容 + 自有服务器](#10-github-内容--自有服务器)
- [11. 完全自托管内容后台](#11-完全自托管内容后台)
- [12. 无头 CMS 方案](#12-无头-cms-方案)
- [13. 服务器环境建议](#13-服务器环境建议)
- [14. 后台登录与权限设计](#14-后台登录与权限设计)
- [15. 安全要求](#15-安全要求)
- [16. 备份与恢复](#16-备份与恢复)
- [17. 发布与回滚](#17-发布与回滚)
- [18. 常见问题](#18-常见问题)
- [19. 上线检查表](#19-上线检查表)
- [20. 后续开发顺序](#20-后续开发顺序)

## 1. 项目定位

这是一个以 Astro 搭建的内容型网站框架，参考了课程销售页、产品发布页和个人品牌站常见的信息架构。

当前站点包含：

- 首页课程销售结构
- 学习笔记列表与详情
- 产品列表与详情
- 价格、FAQ、作者介绍和社交链接
- 浅色与深色主题
- 响应式布局
- Markdown 内容集合
- 内置本地内容管理后台

代码不绑定 GitHub、Netlify、Vercel 或 Cloudflare。网站可以部署到任意静态服务器，也可以扩展为自己的 Node 管理服务。

## 2. 技术栈

| 组件 | 当前方案 |
| --- | --- |
| 前端框架 | Astro 7 |
| 内容格式 | Markdown + YAML frontmatter |
| 内容校验 | Astro Content Collections + Zod |
| 图标 | `@lucide/astro` |
| 样式 | 原生 CSS |
| 内容后台 | 内置本地 Markdown 管理后台 |
| 构建产物 | `dist/` 静态文件 |
| Node.js | 建议 22 LTS 或更新版本 |

## 3. 本地开发

Windows PowerShell 如果禁止执行 `npm.ps1`，统一使用 `npm.cmd`。

安装依赖：

```powershell
npm.cmd install
```

启动开发服务器：

```powershell
npm.cmd run dev
```

默认地址：

```text
网站：http://127.0.0.1:4321/
后台：http://127.0.0.1:4321/admin/
```

本地后台由 `admin/dev-admin-plugin.mjs` 提供接口，只在开发服务器中启用。接口只接受来自 `127.0.0.1` 的请求，可以编辑首页、学习笔记和产品，保存时直接写入 Markdown 文件。

执行完整检查和生产构建：

```powershell
npm.cmd run build
```

构建结果：

```text
dist/
```

预览生产构建：

```powershell
npm.cmd run preview
```

## 4. 项目结构

```text
.
├─ admin/
│  └─ dev-admin-plugin.mjs   # 本地内容读写接口
├─ public/
│  └─ admin/
│     ├─ admin.css           # 后台界面样式
│     ├─ admin.js            # 后台编辑器逻辑
│     └─ config.yml          # 线上 Decap 方案预留配置
├─ src/
│  ├─ components/            # 页面组件
│  ├─ content/
│  │  ├─ home/landing.md     # 首页内容
│  │  ├─ notes/              # 学习笔记
│  │  └─ products/           # 产品条目
│  ├─ layouts/               # HTML 与站点布局
│  ├─ pages/
│  │  ├─ admin/index.astro   # 内容后台入口
│  │  ├─ notes/              # 笔记列表与详情路由
│  │  ├─ products/           # 产品列表与详情路由
│  │  └─ index.astro         # 首页
│  ├─ styles/global.css      # 全站样式
│  └─ content.config.ts      # 内容数据结构和校验
├─ .admin-backups/           # 后台自动备份，不进入 Git
├─ astro.config.mjs
├─ package.json
└─ README.md
```

## 5. 内容管理原理

内容与页面组件是分离的。

首页的全部可编辑内容位于：

```text
src/content/home/landing.md
```

学习笔记位于：

```text
src/content/notes/*.md
```

产品条目位于：

```text
src/content/products/*.md
```

`src/content.config.ts` 负责校验字段。如果内容字段和校验结构不一致，构建会失败并在终端给出具体位置。

内容更新流程：

```text
编辑内容文件
    ↓
Astro 读取并校验
    ↓
页面组件渲染
    ↓
执行生产构建
    ↓
部署 dist
```

这种结构的优点是：

- 页面代码和内容分离
- 内容可以进入 Git 版本管理
- 修改可审查、可回滚
- 不依赖数据库
- 静态构建速度快、攻击面小

## 6. 本地内容后台如何工作

本地后台入口：

```text
http://127.0.0.1:4321/admin/
```

界面文件位于：

```text
src/pages/admin/index.astro
public/admin/admin.css
public/admin/admin.js
```

接口文件位于：

```text
admin/dev-admin-plugin.mjs
```

当前后台具备以下能力：

- 读取首页、笔记和产品目录
- 以结构化表单编辑首页字段
- 编辑笔记和产品的 frontmatter 与 Markdown 正文
- 新建、删除笔记和产品
- 保存时原子写入 Markdown 文件
- 覆盖和删除前自动备份到 `.admin-backups`
- 保存后由 Astro 开发服务器自动刷新内容

接口只在 `astro dev` 中启用，不会进入静态生产构建。接口会检查请求来源，仅允许本机回环地址访问：

```text
127.0.0.1
::1
::ffff:127.0.0.1
```

安全边界：

- 管理接口不能通过公网访问
- 文件标识经过白名单检查，防止目录穿越
- 请求体限制为 2 MB
- YAML 写入前会再次解析验证
- 静态构建产物中的 `/admin/` 只能查看界面，不能保存内容

因此，部署到公网后若要在线编辑，仍然需要服务器端认证和管理服务。可以使用 GitHub OAuth、网站在线后台或本文档第 11 节描述的自托管管理服务。
## 7. 自有服务器部署方案

### 方案 A：自有服务器只做静态托管

内容在本地或 Git 中管理，构建后上传 `dist`。

适合：

- 个人网站
- 内容更新频率不高
- 可以接受本地编辑后重新发布
- 希望服务器最安全、最简单

服务器要求：

- Nginx、Apache、Caddy 或宝塔
- 不需要 Node.js
- 不需要数据库

### 方案 B：GitHub 保存内容 + 自有服务器展示

内容保存在 GitHub，后台通过 OAuth 修改仓库。提交后由服务器自动拉取并重新构建。

适合：

- 希望在浏览器后台编辑
- 希望保留版本记录
- 希望网站部署在自己的服务器
- 可以接受 GitHub 参与内容存储

服务器要求：

- Node.js
- Git
- Nginx 或 Caddy
- systemd、PM2 或其他进程管理
- GitHub OAuth 回调服务或 OAuth 代理
- GitHub Webhook 或自动部署任务

### 方案 C：完全自托管后台

内容文件直接保存在自己的服务器，浏览器后台登录后写入 Markdown 文件，然后触发构建。

适合：

- 内容不能放在 GitHub
- 希望完全控制数据
- 愿意维护 Node 服务和安全配置

服务器要求：

- Node.js
- Nginx 或 Caddy
- systemd 或 PM2
- HTTPS
- 登录、会话、限流、审计和备份机制

### 方案 D：无头 CMS

服务器运行 Directus、Strapi、Payload 或其他无头 CMS，Astro 构建时读取接口。

适合：

- 内容结构复杂
- 多个编辑人员
- 需要角色权限、数据库和审核流程
- 可以承担更高的运维成本

## 8. 推荐架构

### 推荐一：更新方便

```text
Decap CMS
    ↓ GitHub OAuth
GitHub 仓库
    ↓ Webhook
自有 Linux 服务器
    ↓ npm run build
Nginx 静态站点
```

优点：

- 后台编辑体验完整
- 内容有版本记录
- 服务器不放数据库
- 回滚容易

### 推荐二：数据完全自管

```text
自托管管理后台
    ↓ 登录与权限验证
Markdown 内容文件
    ↓ 构建队列
Astro 静态站点
    ↓
Nginx
```

优点：

- 数据全部在自己的服务器
- 不依赖 GitHub、Netlify 或第三方 CMS
- 可以接入自己的账号系统

缺点：

- 需要自行开发后台接口
- 需要处理安全、备份和升级

## 9. 静态部署步骤

### 9.1 构建

```bash
npm ci
npm run build
```

### 9.2 上传

将 `dist` 上传到服务器：

```text
/var/www/astro-content-site
```

也可以在服务器上直接构建：

```bash
cd /srv/astro-content-site
npm ci
npm run build
```

### 9.3 Nginx 示例

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root /var/www/astro-content-site;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

### 9.4 HTTPS

使用 Certbot：

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

或在 Caddy 中使用自动 HTTPS。

### 9.5 更新静态站点

```bash
cd /srv/astro-content-site
git pull --ff-only
npm ci
npm run build
```

## 10. GitHub 内容 + 自有服务器

### 10.1 GitHub 仓库

先把项目推送到仓库：

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin git@github.com:YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

修改后台配置：

```yaml
backend:
  name: github
  repo: YOUR_NAME/YOUR_REPO
  branch: main
```

### 10.2 OAuth

GitHub OAuth 的 `client_secret` 不能放在静态网页中，必须由服务器或 OAuth 代理保存。

可选方式：

- 使用 Netlify 提供的 GitHub OAuth
- 使用 Cloudflare Worker 实现 OAuth 代理
- 在自有服务器实现 OAuth 回调

Decap CMS 配置示例：

```yaml
backend:
  name: github
  repo: YOUR_NAME/YOUR_REPO
  branch: main
  base_url: https://oauth.example.com
  auth_endpoint: auth
```

### 10.3 自动部署

GitHub 仓库更新后，有两种方式更新服务器。

方式一：服务器定时拉取：

```bash
cd /srv/astro-content-site
git pull --ff-only
npm ci
npm run build
```

方式二：GitHub Webhook 触发服务器脚本。

服务器发布脚本示例：

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /srv/astro-content-site
git pull --ff-only
npm ci
npm run build
```

Webhook 服务必须验证 GitHub 签名，不能接受来自任意来源的构建请求。

### 10.4 部署用户

建议创建单独的系统用户：

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin astro
sudo chown -R astro:astro /srv/astro-content-site
```

不要让网站构建进程使用 `root`。

## 11. 完全自托管内容后台

项目已经包含只在本地开发服务器中运行的 Markdown 管理接口。下面描述的是把它扩展为公网可用的生产后台所需的认证、权限和发布设计。

### 11.1 后台接口

```text
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/session
GET  /api/admin/content/home
PUT  /api/admin/content/home
GET  /api/admin/content/notes
PUT  /api/admin/content/notes/:id
GET  /api/admin/content/products
PUT  /api/admin/content/products/:id
POST /api/admin/media
POST /api/admin/publish
```

### 11.2 登录方式

推荐顺序：

1. 单管理员账号 + Argon2id 密码哈希
2. 会话 Cookie + CSRF Token
3. 可选 TOTP 双因素认证
4. 可选 GitHub OAuth 或企业统一登录

会话 Cookie 要求：

```text
HttpOnly
Secure
SameSite=Strict
```

### 11.3 内容写入

写入前必须：

- 检查用户权限
- 检查路径是否在白名单内
- 校验 Markdown 和 frontmatter
- 限制文件大小
- 使用临时文件加原子替换
- 记录操作审计日志

不允许把用户提交的路径直接拼接成服务器文件路径。

### 11.4 构建队列

保存内容后不应直接在请求线程里执行完整构建。

推荐：

```text
保存成功
    ↓
写入构建任务
    ↓
后台任务执行 npm run build
    ↓
构建成功后原子切换发布目录
    ↓
构建失败保留旧版本
```

可以先用简单队列，后续再接入 Redis、BullMQ 或 CI Runner。

### 11.5 systemd 示例

服务文件位置：

```text
/etc/systemd/system/astro-admin.service
```

示例：

```ini
[Unit]
Description=Astro Content Admin
After=network.target

[Service]
Type=simple
User=astro
WorkingDirectory=/srv/astro-content-site
Environment=NODE_ENV=production
Environment=PORT=4322
ExecStart=/usr/bin/node server/admin.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启用：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now astro-admin
sudo systemctl status astro-admin
```

`server/admin.mjs` 是后续实现的管理服务，当前项目尚未包含该文件。

### 11.6 Nginx 反向代理

```nginx
location /admin/ {
    proxy_pass http://127.0.0.1:4322;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/admin/ {
    proxy_pass http://127.0.0.1:4322;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 12. 无头 CMS 方案

可选产品：

- Directus
- Strapi
- Payload CMS
- Ghost

适合使用无头 CMS 的情况：

- 多个管理员和编辑人员
- 需要角色和审核流程
- 内容量较大
- 需要数据库查询、搜索和复杂关系
- 需要 API 给多个客户端使用

代价：

- 需要数据库
- 需要升级和迁移
- 需要备份数据库与媒体文件
- 服务器资源占用更高
- Astro 构建时需要访问 CMS API

## 13. 服务器环境建议

Linux 是首选环境。

| 项目 | 建议 |
| --- | --- |
| 系统 | Ubuntu 22.04/24.04 LTS 或 Debian 12 |
| Node.js | 22 LTS 或更新版本 |
| Web 服务器 | Nginx 或 Caddy |
| 进程管理 | systemd、PM2 |
| 部署目录 | `/srv/astro-content-site` |
| 发布目录 | `/var/www/astro-content-site` |
| HTTPS | Certbot 或 Caddy 自动证书 |
| 最低内存 | 静态构建建议 1 GB 以上 |
| 推荐内存 | 2 GB 以上 |

如果使用宝塔：

1. 新建静态站点
2. 将发布目录指向 `dist`
3. 配置域名和 SSL
4. 如果使用完全自托管后台，再新建 Node 项目
5. 将 `/admin/` 和 `/api/admin/` 反向代理到 Node 服务

Windows Server 也可以运行，但 Linux 的系统服务、权限管理和自动部署更成熟，生产环境优先选 Linux。

## 14. 后台登录与权限设计

后台登录不是“用户名写进网页”即可。生产环境至少需要：

- HTTPS
- 密码哈希
- 登录限流
- 会话过期
- 修改权限检查
- 操作日志
- 敏感操作二次确认

建议角色：

| 角色 | 权限 |
| --- | --- |
| 管理员 | 全部内容、用户和发布 |
| 编辑 | 新建和修改内容 |
| 审核 | 审核并发布 |
| 访客 | 只读预览 |

如果只有一个管理员，也仍然需要把认证逻辑放在服务器端，不能只依赖前端隐藏按钮。

## 15. 安全要求

### 15.1 密钥

以下内容不能进入 Git：

- 邮箱密码
- GitHub client secret
- OAuth token
- 数据库密码
- 会话签名密钥
- 服务器私钥

使用 `.env` 或服务器 Secret Manager。

### 15.2 文件上传

- 限制扩展名
- 校验 MIME 类型
- 限制单个文件和总空间
- 禁止上传脚本、可执行文件和 HTML
- 上传文件与程序文件分目录保存
- 不要使用用户提交的原始文件名作为真实路径

### 15.3 构建服务

- 只接受验证通过的 Webhook
- 使用独立系统用户
- 限制可写目录
- 构建失败不能覆盖线上版本
- 构建日志不能包含密钥

### 15.4 依赖更新

定期执行：

```bash
npm audit
npm outdated
npm update
npm run build
```

生产依赖应保持在 0 个已知漏洞。开发工具的安全问题也需要单独评估。

## 16. 备份与恢复

至少备份：

- 内容文件
- 上传的图片和附件
- Nginx/Caddy 配置
- systemd/PM2 配置
- 环境变量
- 数据库，如果使用无头 CMS

推荐策略：

- Markdown 使用 Git 仓库
- 上传目录每日增量备份
- 服务器配置每周备份
- 备份保留多个历史版本
- 每季度做一次真实恢复测试

Git 方案中，内容回滚：

```bash
git log
git revert COMMIT_ID
```

不要依赖单一服务器磁盘作为唯一备份。

## 17. 发布与回滚

推荐使用 releases 目录：

```text
/srv/releases/2026-10-06-120000
/srv/releases/2026-10-06-160000
/var/www/astro-content-site -> /srv/releases/current
```

发布流程：

1. 构建到新目录
2. 执行基础检查
3. 原子切换软链接
4. 保留最近若干版本
5. 构建失败时保留旧版本

这样可以避免构建失败直接导致线上页面不可用。

## 18. 常见问题

### 18.1 `npm.ps1` 被系统禁止

使用：

```powershell
npm.cmd run dev
```

或修改当前用户的 PowerShell 执行策略：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 18.2 `/admin/` 能打开但不能保存

检查：

- `public/admin/config.yml` 的仓库地址
- OAuth 或 Git Gateway 是否配置
- 后台登录是否成功
- 内容保存后是否触发构建
- 服务器是否拉取到最新提交

### 18.3 修改内容后页面没有变化

本地开发：

```powershell
npm.cmd run dev
```

生产环境：

```bash
npm run build
```

如果是自有服务器，检查自动部署脚本和 Webhook 日志。

### 18.4 构建时报内容字段错误

检查 `src/content.config.ts` 和对应的 Markdown frontmatter。

### 18.5 后台保存后权限错误

检查内容目录和上传目录的用户与权限：

```bash
ls -la /srv/astro-content-site/src/content
ls -la /srv/astro-content-site/public/uploads
```

服务用户必须拥有写入权限，但不应拥有系统目录权限。

### 18.6 端口冲突

默认端口：

| 服务 | 端口 |
| --- | --- |
| Astro 开发 | 4321 |
| 自托管后台示例 | 4322 |

端口都可以通过环境变量修改。

## 19. 上线检查表

- [ ] 域名已解析到服务器
- [ ] HTTPS 已启用
- [ ] `npm run build` 无错误
- [ ] `npm audit` 无生产漏洞
- [ ] 移动端和桌面端已检查
- [ ] 深浅主题已检查
- [ ] 404、隐私、条款和 Cookie 页面可访问
- [ ] 后台登录已启用
- [ ] 后台只能通过 HTTPS 访问
- [ ] 内容保存权限已限制
- [ ] 自动部署脚本已验证
- [ ] 构建失败不会覆盖线上版本
- [ ] 内容、上传文件和服务器配置已备份
- [ ] 恢复流程已实际测试
- [ ] 环境变量和密钥未进入 Git

## 20. 后续开发顺序

推荐按下面顺序推进：

1. 完成品牌、课程、价格、联系方式等正式内容
2. 部署到自己服务器的 Nginx 静态站点
3. 配置域名和 HTTPS
4. 确定后台采用 GitHub OAuth、Netlify Git Gateway，还是完全自托管
5. 如果是完全自托管，开发登录、内容接口和构建队列
6. 增加操作日志、备份和恢复测试
7. 上线后持续更新内容，不频繁改页面结构

对于当前项目，最短可用路径是“Astro 静态站点 + 自有服务器 Nginx”。如果需要浏览器后台，再在“GitHub OAuth 方案”和“完全自托管方案”之间选择。
# 你的内容站点框架

这是一个以 Astro 搭建的内容型网站框架，包含课程销售页、产品发布页、个人品牌介绍、学习笔记和产品内容。页面代码与内容数据分离，可以在本地后台直接编辑。

## 项目文档

- [开发与部署文档](docs/development.md)：本地后台、自有服务器、线上认证、安全和上线流程。

## 本地运行

当前电脑的 PowerShell 如果拦截 `npm.ps1`，统一使用 `npm.cmd`：

```powershell
npm.cmd install
npm.cmd run dev
```

浏览器打开：

- 网站：`http://127.0.0.1:4321/`
- 内容后台：`http://127.0.0.1:4321/admin/`

## 使用本地后台

后台支持：

- 编辑首页全部内容、价格、FAQ 和页脚
- 新建、编辑、删除学习笔记
- 新建、编辑、删除产品
- 保存时直接写回 Markdown 文件
- 覆盖或删除前自动备份到 `.admin-backups`

写入接口只在 `npm.cmd run dev` 时启用，并且只允许来自 `127.0.0.1` 的请求。静态构建产物不包含写入接口。

## 内容目录

- `src/content/home/landing.md`：首页全部文案、价格、导航和页脚。
- `src/content/notes`：学习笔记。每个 Markdown 文件对应一篇文章。
- `src/content/products`：产品条目。每个 Markdown 文件对应一个产品。
- `public/uploads`：后台上传媒体文件预留目录。

也可以不使用后台，直接修改上述 Markdown 文件。保存后本地页面会自动更新。

## 发布

```powershell
npm.cmd run build
```

构建结果会生成在 `dist/`。可以部署到自己的服务器、Cloudflare Pages、Vercel、Netlify 或 GitHub Pages。

当前 `/admin/` 是本机内容管理后台。部署到公网后，若要在线编辑，需要额外接入 OAuth 和服务器端管理服务；具体方案见开发文档。

## 需要优先修改的内容

- `astro.config.mjs` 里的 `site`
- 首页内容里的品牌名称、邮箱、购买链接和社交账号
- `public/favicon.svg` 替换为自己的图标
- 上线前配置正式域名、HTTPS 和访问权限
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, '.admin-backups');
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ID_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}-]*$/u;

const COLLECTIONS = {
  home: {
    kind: 'single',
    id: 'landing',
    dir: path.join(ROOT, 'src/content/home'),
  },
  notes: {
    kind: 'collection',
    dir: path.join(ROOT, 'src/content/notes'),
  },
  products: {
    kind: 'collection',
    dir: path.join(ROOT, 'src/content/products'),
  },
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isLoopback(req) {
  const address = req.socket.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, '内容超过 2 MB 限制');
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, '请求内容不是有效 JSON');
  }
}

function parseMarkdown(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    throw new HttpError(422, '文件缺少有效的 YAML frontmatter');
  }

  try {
    return {
      data: YAML.parse(match[1]) ?? {},
      body: match[2] ?? '',
    };
  } catch (error) {
    throw new HttpError(422, `YAML 解析失败：${error.message}`);
  }
}

function stringifyMarkdown(data, body) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(422, '内容数据必须是对象');
  }

  const frontmatter = YAML.stringify(data, { lineWidth: 0 }).trimEnd();
  const normalizedBody = String(body ?? '').trim();
  const suffix = normalizedBody ? `${normalizedBody}\n` : '';
  const output = `---\n${frontmatter}\n---\n\n${suffix}`;

  parseMarkdown(output);
  return output;
}

function requireCollection(name) {
  const collection = COLLECTIONS[name];
  if (!collection) {
    throw new HttpError(404, '未知的内容类型');
  }
  return collection;
}

function requireId(id) {
  if (!id || !ID_PATTERN.test(id)) {
    throw new HttpError(400, '内容标识只能包含文字、数字和连字符');
  }
  return id;
}

function fileFor(collectionName, id) {
  const collection = requireCollection(collectionName);
  requireId(id);

  if (collection.kind === 'single' && id !== collection.id) {
    throw new HttpError(404, '首页内容只允许使用 landing 标识');
  }

  return path.join(collection.dir, `${id}.md`);
}

async function readContent(collectionName, id) {
  const filePath = fileFor(collectionName, id);
  let source;
  let stat;

  try {
    [source, stat] = await Promise.all([fs.readFile(filePath, 'utf8'), fs.stat(filePath)]);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HttpError(404, '内容文件不存在');
    }
    throw error;
  }

  const parsed = parseMarkdown(source);
  return {
    collection: collectionName,
    id,
    path: path.relative(ROOT, filePath).replaceAll('\\', '/'),
    updatedAt: stat.mtime.toISOString(),
    ...parsed,
  };
}

async function listCollection(collectionName) {
  const collection = requireCollection(collectionName);

  if (collection.kind === 'single') {
    const content = await readContent(collectionName, collection.id);
    return [
      {
        collection: collectionName,
        id: collection.id,
        title: content.data.seo?.title ?? content.data.brand?.name ?? '首页',
        subtitle: '首页与全站设置',
        updatedAt: content.updatedAt,
      },
    ];
  }

  let files = [];
  try {
    files = await fs.readdir(collection.dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const entries = await Promise.all(
    files
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map(async (entry) => {
        const id = entry.name.slice(0, -3);
        const content = await readContent(collectionName, id);
        return {
          collection: collectionName,
          id,
          title: content.data.title ?? id,
          subtitle:
            collectionName === 'notes'
              ? content.data.publishDate ?? '学习笔记'
              : content.data.category ?? content.data.status ?? '产品',
          updatedAt: content.updatedAt,
          order: Number(content.data.order ?? 0),
        };
      }),
  );

  if (collectionName === 'notes') {
    entries.sort((a, b) => String(b.subtitle).localeCompare(String(a.subtitle)));
  } else {
    entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  }

  return entries;
}

async function backupFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    return;
  }

  await fs.mkdir(BACKUP_ROOT, { recursive: true });
  const relative = path.relative(ROOT, filePath).replaceAll('\\', '__');
  const stamp = new Date().toISOString().replaceAll(':', '-');
  await fs.copyFile(filePath, path.join(BACKUP_ROOT, `${stamp}__${relative}`));
}

async function writeContent(collectionName, id, data, body) {
  const filePath = fileFor(collectionName, id);
  const output = stringifyMarkdown(data, body);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await backupFile(filePath);

  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, output, 'utf8');
  await fs.rename(tempPath, filePath);

  return readContent(collectionName, id);
}

function createId(collectionName, title) {
  const normalized = String(title ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  let base = normalized;
  if (!base || !/^[\x00-\x7F]+$/.test(base)) {
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    base = `${collectionName === 'notes' ? 'note' : 'product'}-${stamp}`;
  }

  return base.slice(0, 80);
}

async function createContent(collectionName, payload) {
  const collection = requireCollection(collectionName);
  if (collection.kind === 'single') {
    throw new HttpError(405, '首页内容不允许重复创建');
  }

  const title = String(payload.title ?? (collectionName === 'notes' ? '未命名笔记' : '未命名产品'));
  let id = payload.id ? String(payload.id) : createId(collectionName, title);
  requireId(id);

  try {
    await fs.access(fileFor(collectionName, id));
    throw new HttpError(409, '同名内容已经存在');
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (collectionName === 'notes') {
    const today = new Date().toISOString().slice(0, 10);
    return writeContent(
      collectionName,
      id,
      {
        title,
        description: '',
        publishDate: today,
        tags: [],
        featured: false,
      },
      '## 正文\n\n从这里开始写。',
    );
  }

  const existing = await listCollection(collectionName);
  return writeContent(
    collectionName,
    id,
    {
      title,
      description: '',
      status: '草稿',
      category: '未分类',
      order: existing.length + 1,
      url: '',
    },
    '在这里填写产品详情。',
  );
}

async function deleteContent(collectionName, id) {
  const collection = requireCollection(collectionName);
  if (collection.kind === 'single') {
    throw new HttpError(405, '首页内容不能删除');
  }

  const filePath = fileFor(collectionName, id);
  await backupFile(filePath);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new HttpError(404, '内容文件不存在');
    }
    throw error;
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && parts.length === 3 && parts[2] === 'health') {
    return sendJson(res, 200, { ok: true, storage: 'local-markdown' });
  }

  if (parts[2] !== 'content') {
    throw new HttpError(404, '接口不存在');
  }

  const collectionName = parts[3];
  const id = parts[4] ? decodeURIComponent(parts[4]) : null;

  if (req.method === 'GET' && !collectionName) {
    const [home, notes, products] = await Promise.all([
      listCollection('home'),
      listCollection('notes'),
      listCollection('products'),
    ]);
    return sendJson(res, 200, { home, notes, products });
  }

  if (req.method === 'GET' && collectionName && !id) {
    return sendJson(res, 200, { items: await listCollection(collectionName) });
  }

  if (req.method === 'GET' && collectionName && id) {
    return sendJson(res, 200, { item: await readContent(collectionName, id) });
  }

  if (req.method === 'POST' && collectionName && !id) {
    const payload = await readJsonBody(req);
    return sendJson(res, 201, { item: await createContent(collectionName, payload) });
  }

  if (req.method === 'PUT' && collectionName && id) {
    const payload = await readJsonBody(req);
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      throw new HttpError(422, 'data 必须是内容对象');
    }
    return sendJson(res, 200, {
      item: await writeContent(collectionName, id, payload.data, payload.body ?? ''),
    });
  }

  if (req.method === 'DELETE' && collectionName && id) {
    await deleteContent(collectionName, id);
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(405, '不支持的请求方式');
}

let contentSyncQueue = Promise.resolve();

async function syncAstroContent() {
  const instanceUrl = pathToFileURL(
    path.join(ROOT, 'node_modules/astro/dist/content/instance.js'),
  ).href;
  const { globalContentLayer } = await import(instanceUrl);
  const contentLayer = await globalContentLayer.get();
  if (!contentLayer?.sync) {
    throw new Error('Astro content layer is not available');
  }
  await contentLayer.sync();
}

function scheduleContentSync(server) {
  contentSyncQueue = contentSyncQueue
    .catch(() => {})
    .then(() => syncAstroContent())
    .catch(async (error) => {
      console.error('[local-admin] Content sync failed, restarting dev server:', error);
      await server.restart();
    });
  return contentSyncQueue;
}

export function localAdminPlugin() {
  return {
    name: 'local-markdown-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/admin')) {
          return next();
        }

        if (!isLoopback(req)) {
          return sendJson(res, 403, { error: '本地管理接口只允许通过 127.0.0.1 访问' });
        }

        const shouldSync = ['POST', 'PUT', 'DELETE'].includes(req.method ?? '');
        try {
          await handleApi(req, res);
          if (shouldSync && res.statusCode >= 200 && res.statusCode < 300) {
            await scheduleContentSync(server);
          }
        } catch (error) {
          const statusCode = error instanceof HttpError ? error.statusCode : 500;
          if (statusCode >= 500) {
            console.error('[local-admin]', error);
          }
          sendJson(res, statusCode, { error: error.message ?? '管理接口发生错误' });
        }
      });
    },
  };
}
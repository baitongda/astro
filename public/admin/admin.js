(() => {
  const collectionLabels = {
    home: '首页',
    notes: '学习笔记',
    products: '产品',
  };

  const fieldLabels = {
    seo: 'SEO 设置',
    title: '标题',
    description: '描述',
    announcement: '顶部公告',
    text: '公告文字',
    label: '按钮或标签文字',
    href: '链接地址',
    brand: '品牌',
    name: '名称',
    shortName: '短名称',
    slogan: '品牌口号',
    navigation: '主导航',
    hero: '主视觉',
    eyebrow: '眉题',
    subtitle: '副标题',
    primaryCta: '主按钮',
    secondaryCta: '次按钮',
    stats: '数据指标',
    value: '数值或内容',
    preview: '工作台预览',
    caption: '说明文字',
    progressLabel: '进度名称',
    progressValue: '进度值',
    metrics: '指标列表',
    trend: '备注',
    tasks: '任务列表',
    meta: '类型或备注',
    status: '状态',
    painPoints: '真实工作场景',
    items: '条目列表',
    category: '分类',
    lesson: '课次',
    bullets: '要点列表',
    phases: '学习路径',
    index: '序号',
    tags: '标签',
    benefits: '核心优势',
    tag: '标签',
    pricing: '课程价格',
    badge: '徽标',
    oldPrice: '原价',
    price: '现价',
    unit: '价格说明',
    summary: '摘要',
    features: '包含内容',
    cta: '行动按钮',
    note: '备注',
    faqs: '常见问题',
    question: '问题',
    answer: '回答',
    about: '关于作者',
    paragraphs: '正文段落',
    contacts: '联系方式',
    footer: '页脚',
    socials: '社交账号',
    legal: '法律链接',
    languages: '语言',
    active: '当前语言',
    copyright: '版权信息',
    publishDate: '发布日期',
    featured: '精选',
    order: '排序',
    url: '外部链接',
  };

  const longTextFieldKeys = new Set([
    'description',
    'text',
    'subtitle',
    'caption',
    'summary',
    'answer',
    'note',
    'slogan',
  ]);

  const longArrayKeys = new Set(['bullets', 'paragraphs', 'features']);

  const state = {
    items: { home: [], notes: [], products: [] },
    current: null,
    dirty: false,
    saving: false,
    toastTimer: null,
  };

  const contentNav = document.querySelector('#content-nav');
  const adminMain = document.querySelector('#admin-main');
  const toast = document.querySelector('#toast');

  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function labelFor(key) {
    return fieldLabels[key] ?? key;
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function clonePath(path) {
    return JSON.stringify(path);
  }

  function parsePath(value) {
    return JSON.parse(value);
  }

  function setAtPath(target, path, value) {
    let cursor = target;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      if (cursor[key] === undefined || cursor[key] === null) {
        cursor[key] = typeof path[index + 1] === 'number' ? [] : {};
      }
      cursor = cursor[key];
    }
    cursor[path[path.length - 1]] = value;
  }

  function blankLike(value) {
    if (Array.isArray(value)) return [];
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blankLike(item)]));
    }
    if (typeof value === 'boolean') return false;
    if (typeof value === 'number') return 0;
    return '';
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      cache: 'no-store',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      throw new Error(payload.error ?? `请求失败（${response.status}）`);
    }

    return payload;
  }

  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('is-visible');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  function showDialog({
    title,
    message,
    inputLabel = '',
    defaultValue = '',
    confirmText = '确定',
    cancelText = '取消',
    danger = false,
  }) {
    return new Promise((resolve) => {
      const overlay = el('div', 'admin-modal-backdrop');
      const panel = el('div', 'admin-modal');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'admin-modal-title');

      const heading = el('h2', '', title);
      heading.id = 'admin-modal-title';
      panel.append(heading);

      if (message) {
        panel.append(el('p', 'admin-modal__message', message));
      }

      let input = null;
      if (inputLabel) {
        const field = el('label', 'field admin-modal__field');
        field.append(el('span', 'field__label', inputLabel));
        input = document.createElement('input');
        input.type = 'text';
        input.id = 'admin-modal-input';
        input.value = defaultValue;
        field.append(input);
        panel.append(field);
      }

      const actions = el('div', 'admin-modal__actions');
      const cancelButton = el('button', 'button button--secondary', cancelText);
      cancelButton.type = 'button';
      const confirmButton = el(
        'button',
        `button ${danger ? 'button--danger' : 'button--primary'}`,
        confirmText,
      );
      confirmButton.type = 'button';
      actions.append(cancelButton, confirmButton);
      panel.append(actions);

      const close = (result) => {
        overlay.classList.remove('is-open');
        document.body.classList.remove('has-modal');
        window.setTimeout(() => overlay.remove(), 140);
        document.removeEventListener('keydown', handleKeydown);
        resolve(result);
      };

      const submit = () => {
        if (input) {
          const value = input.value.trim();
          if (!value) {
            input.focus();
            return;
          }
          close(value);
          return;
        }
        close(true);
      };

      const handleKeydown = (event) => {
        if (event.key === 'Escape') close(null);
        if (event.key === 'Enter' && (event.target === input || !input)) submit();
      };

      cancelButton.addEventListener('click', () => close(null));
      confirmButton.addEventListener('click', submit);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close(null);
      });
      document.addEventListener('keydown', handleKeydown);
      overlay.append(panel);
      document.body.append(overlay);
      document.body.classList.add('has-modal');
      window.requestAnimationFrame(() => {
        overlay.classList.add('is-open');
        (input || confirmButton).focus();
        if (input) input.select();
      });
    });
  }

  function markDirty(isDirty = true) {
    state.dirty = isDirty;
    const status = document.querySelector('#editor-status');
    if (status) {
      status.classList.toggle('is-dirty', isDirty);
      status.textContent = isDirty ? '有未保存修改' : '所有修改已保存';
    }
  }

  async function confirmDiscard() {
    if (!state.dirty) return true;
    return Boolean(
      await showDialog({
        title: '有未保存修改',
        message: '当前内容还没有保存。离开后，这些修改会丢失。',
        confirmText: '仍然离开',
        cancelText: '继续编辑',
        danger: true,
      }),
    );
  }

  function renderLoading() {
    adminMain.innerHTML = '';
    const wrapper = el('div', 'admin-main__inner');
    wrapper.append(el('div', 'loading', '正在读取内容…'));
    adminMain.append(wrapper);
  }

  function renderApiError(error) {
    adminMain.innerHTML = '';
    const wrapper = el('div', 'admin-main__inner');
    const panel = el('div', 'api-error');
    panel.append(
      el('h2', '', '本地管理接口不可用'),
      el(
        'p',
        '',
        `${error.message}。请使用 npm.cmd run dev 启动开发服务器，再从 127.0.0.1 打开后台。静态构建产物不包含写入接口。`,
      ),
    );
    wrapper.append(panel);
    adminMain.append(wrapper);
  }

  function renderWelcome() {
    adminMain.innerHTML = '';
    const wrapper = el('div', 'admin-main__inner welcome');
    const panel = el('div', 'welcome__panel');
    panel.append(
      el('div', 'brand-mark', '内'),
      el('h1', '', '本地内容管理'),
      el('p', '', '从左侧选择首页、学习笔记或产品。修改后点击保存，内容会直接写入项目中的 Markdown 文件。'),
    );

    const steps = el('div', 'welcome__steps');
    const stepData = [
      ['01', '选择内容', '首页、文章或产品'],
      ['02', '编辑字段', '结构化表单减少 YAML 错误'],
      ['03', '保存发布', '写入文件并触发页面更新'],
    ];
    stepData.forEach(([index, title, description]) => {
      const step = el('div', 'welcome__step');
      step.append(el('strong', '', `${index} · ${title}`), el('span', '', description));
      steps.append(step);
    });

    panel.append(steps);
    wrapper.append(panel);
    adminMain.append(wrapper);
  }

  function makeNavButton(item) {
    const button = el('button', 'nav-item');
    button.type = 'button';
    button.dataset.openCollection = item.collection;
    button.dataset.openId = item.id;
    if (state.current?.collection === item.collection && state.current?.id === item.id) {
      button.classList.add('is-active');
    }

    const iconText = item.collection === 'home' ? '页' : item.collection === 'notes' ? '文' : '品';
    const icon = el('span', 'nav-item__icon', iconText);
    const copy = el('span', 'nav-item__copy');
    copy.append(
      el('span', 'nav-item__title', item.title || item.id),
      el('span', 'nav-item__meta', item.subtitle || collectionLabels[item.collection]),
    );
    button.append(icon, copy);
    return button;
  }

  function renderSidebar() {
    contentNav.innerHTML = '';

    Object.keys(collectionLabels).forEach((collection) => {
      const group = el('div', 'nav-group');
      const head = el('div', 'nav-group__head');
      head.append(el('span', '', collectionLabels[collection]));

      if (collection !== 'home') {
        const addButton = el('button', 'button button--quiet button--small', '+ 新建');
        addButton.type = 'button';
        addButton.dataset.createCollection = collection;
        head.append(addButton);
      }

      const list = el('div', 'nav-list');
      const items = state.items[collection] ?? [];
      if (items.length) {
        items.forEach((item) => list.append(makeNavButton(item)));
      } else {
        list.append(el('div', 'nav-empty', '暂无内容'));
      }

      group.append(head, list);
      contentNav.append(group);
    });
  }

  function addInputAttributes(input, key, path) {
    input.dataset.path = clonePath(path);
    input.dataset.key = key;
    return input;
  }

  function createTextField(key, value, path) {
    const field = el('label', 'field');
    const label = el('span', 'field__label');
    label.append(el('span', '', labelFor(key)), el('span', 'field__key', key));

    const useTextarea = longTextFieldKeys.has(key) || String(value).length > 110;
    const input = document.createElement(useTextarea ? 'textarea' : 'input');
    if (!useTextarea) {
      input.type = key === 'publishDate' ? 'date' : 'text';
    }
    input.value = value ?? '';
    addInputAttributes(input, key, path);

    field.append(label, input);
    return field;
  }

  function createNumberField(key, value, path) {
    const field = el('label', 'field');
    const label = el('span', 'field__label');
    label.append(el('span', '', labelFor(key)), el('span', 'field__key', key));
    const input = document.createElement('input');
    input.type = 'number';
    input.value = Number(value ?? 0);
    addInputAttributes(input, key, path);
    field.append(label, input);
    return field;
  }

  function createBooleanField(key, value, path) {
    const field = el('label', 'field');
    const wrapper = el('span', 'field__check');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    addInputAttributes(input, key, path);
    wrapper.append(input, el('span', '', labelFor(key)));
    field.append(wrapper);
    return field;
  }

  function createNestedObject(key, value, path) {
    const section = el('div', 'nested-section');
    const head = el('div', 'nested-section__head');
    head.append(el('h3', '', labelFor(key)), el('span', 'field__key', key));
    const body = el('div', 'nested-section__body');

    Object.entries(value).forEach(([childKey, childValue]) => {
      body.append(createField(childKey, childValue, [...path, childKey], key));
    });

    section.append(head, body);
    return section;
  }

  function createArrayField(key, value, path) {
    const section = el('div', 'nested-section');
    const head = el('div', 'nested-section__head');
    head.append(el('h3', '', labelFor(key)), el('span', 'field__key', key));

    const addButton = el('button', 'button button--secondary button--small', '+ 添加');
    addButton.type = 'button';
    addButton.dataset.arrayAdd = 'true';
    addButton.dataset.path = clonePath(path);
    addButton.dataset.parentKey = key;
    head.append(addButton);

    const list = el('div', 'array-list');
    if (!Array.isArray(value) || value.length === 0) {
      list.append(el('div', 'array-empty', '暂无条目'));
    } else {
      value.forEach((item, index) => {
        const card = el('div', 'array-item');
        const itemHead = el('div', 'array-item__head');
        itemHead.append(el('span', '', `第 ${index + 1} 项`));
        const removeButton = el('button', 'button button--quiet button--small', '删除');
        removeButton.type = 'button';
        removeButton.dataset.arrayRemove = 'true';
        removeButton.dataset.path = clonePath(path);
        removeButton.dataset.index = String(index);
        itemHead.append(removeButton);
        card.append(itemHead);

        const itemBody = el('div', 'array-item__body');
        if (isPlainObject(item)) {
          Object.entries(item).forEach(([childKey, childValue]) => {
            itemBody.append(createField(childKey, childValue, [...path, index, childKey], key));
          });
        } else {
          const field = el('label', 'field');
          const input = document.createElement(longArrayKeys.has(key) ? 'textarea' : 'input');
          if (input.tagName === 'INPUT') input.type = 'text';
          input.value = item ?? '';
          addInputAttributes(input, key, [...path, index]);
          field.append(input);
          itemBody.append(field);
        }

        card.append(itemBody);
        list.append(card);
      });
    }

    section.append(head, list);
    return section;
  }

  function createField(key, value, path) {
    if (Array.isArray(value)) {
      return createArrayField(key, value, path);
    }
    if (isPlainObject(value)) {
      return createNestedObject(key, value, path);
    }
    if (typeof value === 'boolean') {
      return createBooleanField(key, value, path);
    }
    if (typeof value === 'number') {
      return createNumberField(key, value, path);
    }
    return createTextField(key, value ?? '', path);
  }

  function makeFormSection(sectionKey, title, entries, pathPrefix = []) {
    const section = el('section', 'form-section');
    const head = el('div', 'form-section__head');
    head.append(el('h2', '', title), el('span', 'form-section__key', sectionKey));
    const body = el('div', 'form-section__body');

    entries.forEach(([key, value]) => {
      body.append(createField(key, value, [...pathPrefix, key], sectionKey));
    });

    section.append(head, body);
    return section;
  }

  function renderEditor() {
    if (!state.current) {
      renderWelcome();
      return;
    }

    adminMain.innerHTML = '';
    const wrapper = el('div', 'admin-main__inner');
    const header = el('div', 'editor-head');

    const copy = el('div', 'editor-head__copy');
    const eyebrow = el('div', 'editor-head__eyebrow');
    eyebrow.append(el('span', '', collectionLabels[state.current.collection]), el('span', 'editor-path', state.current.path));
    const title = state.current.data.title ?? state.current.data.seo?.title ?? state.current.id;
    copy.append(eyebrow, el('h1', '', title), el('p', '', '修改字段后点击保存。保存会直接更新源文件，并生成一份本地备份。'));

    const actions = el('div', 'editor-actions');
    const status = el('span', 'editor-status', state.dirty ? '有未保存修改' : '所有修改已保存');
    status.id = 'editor-status';
    if (state.dirty) status.classList.add('is-dirty');

    if (state.current.collection !== 'home') {
      const deleteButton = el('button', 'button button--danger', '删除');
      deleteButton.type = 'button';
      deleteButton.dataset.deleteCurrent = 'true';
      actions.append(deleteButton);
    }

    const saveButton = el('button', 'button button--primary', state.saving ? '保存中…' : '保存内容');
    saveButton.type = 'button';
    saveButton.id = 'save-button';
    saveButton.disabled = state.saving;
    saveButton.dataset.saveCurrent = 'true';

    actions.append(status, saveButton);
    header.append(copy, actions);

    const form = el('form', 'editor-form');
    form.id = 'editor-form';
    const dataEntries = Object.entries(state.current.data ?? {});
    const primitiveEntries = dataEntries.filter(([, value]) => !isPlainObject(value));
    const objectEntries = dataEntries.filter(([, value]) => isPlainObject(value));

    if (primitiveEntries.length) {
      form.append(makeFormSection('basic', '基本信息', primitiveEntries));
    }

    objectEntries.forEach(([key, value]) => {
      form.append(makeFormSection(key, labelFor(key), Object.entries(value), [key]));
    });

    if (state.current.collection !== 'home') {
      const bodySection = el('section', 'form-section raw-body');
      const bodyHead = el('div', 'form-section__head');
      bodyHead.append(el('h2', '', '正文 Markdown'), el('span', 'form-section__key', 'body'));
      const bodyWrap = el('div', 'form-section__body');
      const field = el('label', 'field');
      const hint = el('span', 'field__hint', '支持 Markdown。保存时会写入 frontmatter 下方。');
      const textarea = document.createElement('textarea');
      textarea.className = 'is-code';
      textarea.value = state.current.body ?? '';
      textarea.dataset.body = 'true';
      field.append(hint, textarea);
      bodyWrap.append(field);
      bodySection.append(bodyHead, bodyWrap);
      form.append(bodySection);
    }

    wrapper.append(header, form);
    adminMain.append(wrapper);
  }

  async function loadIndex({ preserveCurrent = false } = {}) {
    const previous = preserveCurrent ? state.current : null;
    const payload = await api('/api/admin/content');
    state.items = {
      home: payload.home ?? [],
      notes: payload.notes ?? [],
      products: payload.products ?? [],
    };
    if (previous) {
      state.current = previous;
    }
    renderSidebar();
  }

  async function openItem(collection, id, { force = false } = {}) {
    if (!force && !(await confirmDiscard())) return;

    renderLoading();
    try {
      const payload = await api(`/api/admin/content/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`);
      state.current = payload.item;
      markDirty(false);
      renderEditor();
      renderSidebar();
    } catch (error) {
      showToast(error.message, true);
      renderApiError(error);
    }
  }

  async function saveCurrent() {
    if (!state.current || state.saving) return;
    state.saving = true;
    const saveButton = document.querySelector('#save-button');
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = '保存中…';
    }

    try {
      const payload = await api(
        `/api/admin/content/${encodeURIComponent(state.current.collection)}/${encodeURIComponent(state.current.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ data: state.current.data, body: state.current.body ?? '' }),
        },
      );
      state.current = payload.item;
      markDirty(false);
      showToast('内容已保存，页面会自动更新。');
      await loadIndex({ preserveCurrent: true });
      renderEditor();
      renderSidebar();
    } catch (error) {
      showToast(error.message, true);
    } finally {
      state.saving = false;
      const currentSaveButton = document.querySelector('#save-button');
      if (currentSaveButton) {
        currentSaveButton.disabled = false;
        currentSaveButton.textContent = '保存内容';
      }
    }
  }

  async function createItem(collection) {
    if (!(await confirmDiscard())) return;
    const fallback = collection === 'notes' ? '未命名笔记' : '未命名产品';
    const title = await showDialog({
      title: `新建${collectionLabels[collection]}`,
      message: '先填写标题。创建后仍然可以继续修改其他字段。',
      inputLabel: '标题',
      defaultValue: fallback,
      confirmText: '创建',
      cancelText: '取消',
    });
    if (!title) return;

    try {
      const payload = await api(`/api/admin/content/${encodeURIComponent(collection)}`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      state.current = payload.item;
      await loadIndex({ preserveCurrent: true });
      markDirty(false);
      renderEditor();
      renderSidebar();
      showToast('新内容已创建。');
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function deleteCurrent() {
    if (!state.current || state.current.collection === 'home') return;
    const title = state.current.data.title ?? state.current.id;
    const confirmed = await showDialog({
      title: '删除这条内容？',
      message: `“${title}”会从内容目录中移除。删除前会自动保留一份备份，可以在 .admin-backups 中找回。`,
      confirmText: '删除内容',
      cancelText: '取消',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await api(
        `/api/admin/content/${encodeURIComponent(state.current.collection)}/${encodeURIComponent(state.current.id)}`,
        { method: 'DELETE' },
      );
      state.current = null;
      markDirty(false);
      await loadIndex();
      renderSidebar();
      renderWelcome();
      showToast('内容已删除，备份保存在 .admin-backups。');
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function updateCurrentValue(target) {
    if (!state.current) return;

    if (target.dataset.body === 'true') {
      state.current.body = target.value;
      markDirty(true);
      return;
    }

    if (!target.dataset.path) return;
    const path = parsePath(target.dataset.path);
    let value;
    if (target.type === 'checkbox') value = target.checked;
    else if (target.type === 'number') value = Number(target.value);
    else value = target.value;

    setAtPath(state.current.data, path, value);
    markDirty(true);

    if (path.length === 1 && path[0] === 'title') {
      const heading = document.querySelector('.editor-head h1');
      if (heading) heading.textContent = value || state.current.id;
    }
  }

  function handleArrayAction(button) {
    if (!state.current) return;
    const path = parsePath(button.dataset.path);
    let array = state.current.data;
    path.forEach((key) => {
      array = array?.[key];
    });
    if (!Array.isArray(array)) return;

    if (button.dataset.arrayRemove === 'true') {
      array.splice(Number(button.dataset.index), 1);
    } else if (button.dataset.arrayAdd === 'true') {
      const template = array[0];
      array.push(template === undefined ? '' : blankLike(template));
    }

    markDirty(true);
    renderEditor();
  }

  contentNav.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-collection]');
    if (openButton) {
      openItem(openButton.dataset.openCollection, openButton.dataset.openId);
      return;
    }

    const createButton = event.target.closest('[data-create-collection]');
    if (createButton) {
      createItem(createButton.dataset.createCollection);
    }
  });

  adminMain.addEventListener('input', (event) => {
    if (event.target.matches('input, textarea, select')) {
      updateCurrentValue(event.target);
    }
  });

  adminMain.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"], select')) {
      updateCurrentValue(event.target);
    }
  });

  adminMain.addEventListener('click', (event) => {
    const saveButton = event.target.closest('[data-save-current]');
    if (saveButton) {
      saveCurrent();
      return;
    }

    const deleteButton = event.target.closest('[data-delete-current]');
    if (deleteButton) {
      deleteCurrent();
      return;
    }

    const arrayButton = event.target.closest('[data-array-add], [data-array-remove]');
    if (arrayButton) {
      handleArrayAction(arrayButton);
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
    }
  });

  async function init() {
    renderLoading();
    try {
      await api('/api/admin/health');
      await loadIndex();
      if (state.items.home[0]) {
        await openItem('home', state.items.home[0].id, { force: true });
      } else {
        renderWelcome();
      }
    } catch (error) {
      renderApiError(error);
    }
  }

  init();
})();
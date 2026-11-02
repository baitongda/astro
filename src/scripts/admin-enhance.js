import EasyMDE from 'easymde';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'easymde/dist/easymde.min.css';

let activeEditor = null;
let scheduled = false;
let observer = null;

function destroyEditor() {
  if (!activeEditor) return;
  try {
    activeEditor.toTextArea();
  } catch {
    // The previous form may already have been replaced by the admin renderer.
  }
  activeEditor = null;
}

function findBodyEditor() {
  const adminMain = document.querySelector('#admin-main');
  return adminMain?.querySelector('textarea[data-body="true"]') ?? null;
}

function setupEditor() {
  const textarea = findBodyEditor();

  if (!textarea) {
    if (activeEditor?.codemirror && !document.contains(activeEditor.codemirror.getWrapperElement())) {
      destroyEditor();
    }
    return;
  }

  if (textarea.dataset.easymdeReady === 'true') return;

  destroyEditor();
  textarea.dataset.easymdeReady = 'true';

  try {
    const editor = new EasyMDE({
      element: textarea,
      autoDownloadFontAwesome: false,
      spellChecker: false,
      forceSync: true,
      minHeight: '380px',
      placeholder: '开始写 Markdown。可以使用工具栏插入标题、列表、链接和代码块。',
      status: ['lines', 'words'],
      indentWithTabs: false,
      tabSize: 2,
      toolbar: [
        'bold',
        'italic',
        'heading',
        '|',
        'quote',
        'unordered-list',
        'ordered-list',
        '|',
        'link',
        'code',
        'table',
        '|',
        'preview',
        'side-by-side',
        'fullscreen',
        '|',
        'guide',
      ],
      shortcuts: {
        toggleBold: 'Cmd-B',
        toggleItalic: 'Cmd-I',
        drawLink: 'Cmd-K',
      },
    });

    editor.codemirror.on('change', () => {
      const nextValue = editor.value();
      if (textarea.value !== nextValue) {
        textarea.value = nextValue;
      }
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    activeEditor = editor;
    delete textarea.dataset.easymdeError;
  } catch (error) {
    delete textarea.dataset.easymdeReady;
    textarea.dataset.easymdeError = error instanceof Error ? error.message : String(error);
    console.error('[local-admin] Markdown editor failed to initialize:', error);
  }
}

function scheduleSetup() {
  if (scheduled) return;
  scheduled = true;
  window.queueMicrotask(() => {
    scheduled = false;
    setupEditor();
  });
}

function attachObserver() {
  const adminMain = document.querySelector('#admin-main');

  if (!adminMain) {
    window.setTimeout(attachObserver, 50);
    return;
  }

  observer?.disconnect();
  observer = new MutationObserver(scheduleSetup);
  observer.observe(adminMain, { childList: true, subtree: true });
  scheduleSetup();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
} else {
  attachObserver();
}
const requiredFiles = [
  { key: 'aiPromptTemplates', path: 'data/aiPromptTemplates.json' },
  { key: 'aiModelConfig', path: 'config/aiModelConfig.json' }
];

function storageGetLocal(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], result => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
}

function storageSetLocal(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function notifyError(title, message) {
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  chrome.notifications.create({
    type: 'basic',
    iconUrl,
    title,
    message
  });
}

async function loadFileWithRetry(url, parseJson = true, attempts = 2, delayMs = 1000) {
  let lastError = null;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return parseJson ? await response.json() : await response.text();
    } catch (err) {
      lastError = err;
      if (i < attempts) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

async function addMissingAiFile() {
  for (const file of requiredFiles) {
    try {
      const existing = await storageGetLocal(file.key);
      if (existing !== undefined) {
        continue;
      }
      const url = chrome.runtime.getURL(file.path);
      const isJson = file.path.toLowerCase().endsWith('.json');
      const data = await loadFileWithRetry(url, isJson);
      await storageSetLocal({ [file.key]: data });
      console.log(`Loaded default ${file.key} from ${file.path}`);
    } catch (error) {
      console.error(`Error loading ${file.path}:`, error);
      notifyError(
        'Failed to load default AI file',
        `${file.path}: ${error.message}`
      );
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  addMissingAiFile();
});

chrome.runtime.onStartup.addListener(() => {
  addMissingAiFile();
});
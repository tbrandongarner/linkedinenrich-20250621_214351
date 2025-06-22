const FILE_INPUT_ID = 'planConfirmationFileInput';
  const STATUS_ID = 'planConfirmationFileStatus';
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTENSIONS = ['.csv'];
  const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const fileInput = document.getElementById(FILE_INPUT_ID);
    if (!fileInput) return;
    fileInput.addEventListener('change', handleFileSelect);
  }

  function handleFileSelect(event) {
    clearStatus();
    const file = event.target.files && event.target.files[0];
    if (!file) {
      setStatus('No file selected.', 'error');
      return;
    }
    if (!isValidFile(file)) {
      setStatus('Invalid file type or size exceeds limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => processFile(e.target.result);
    reader.onerror = () => setStatus('Error reading file.', 'error');
    reader.readAsText(file);
  }

  function isValidFile(file) {
    const name = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
    const hasValidType = ALLOWED_MIME_TYPES.includes(file.type) || hasValidExt;
    const okSize = file.size > 0 && file.size <= MAX_FILE_SIZE;
    return hasValidExt && hasValidType && okSize;
  }

  function processFile(text) {
    let records;
    try {
      records = parseCSV(text);
    } catch (err) {
      setStatus('Invalid CSV format: ' + err.message, 'error');
      return;
    }
    chrome.storage.local.set({ planConfirmations: records }, () => {
      if (chrome.runtime.lastError) {
        setStatus('Failed to save data: ' + chrome.runtime.lastError.message, 'error');
      } else {
        setStatus('Plan confirmations uploaded successfully.', 'success');
      }
    });
  }

  function parseCSV(text) {
    if (window.Papa && Papa.parse) {
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });
      if (result.errors && result.errors.length) {
        throw new Error(result.errors.map(e => e.message).join('; '));
      }
      return result.data;
    }
    // Fallback naive parser
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('No data rows found');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map((line, rowIndex) => {
      const cols = line.split(',').map(c => c.trim());
      if (cols.length > headers.length) {
        // ignore extra columns
      }
      return headers.reduce((obj, header, idx) => {
        obj[header] = cols[idx] != null ? cols[idx] : '';
        return obj;
      }, {});
    });
  }

  function setStatus(message, type = 'info') {
    const statusEl = document.getElementById(STATUS_ID);
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = type;
  }

  function clearStatus() {
    const statusEl = document.getElementById(STATUS_ID);
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.className = '';
  }
})();
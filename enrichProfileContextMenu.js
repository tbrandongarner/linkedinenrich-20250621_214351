const CONTEXT_MENU_ID = 'linkedin-enrich-profile';

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      console.error('Error removing context menus:', chrome.runtime.lastError);
    }
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: 'Enrich LinkedIn Profile',
      contexts: ['page', 'link'],
      documentUrlPatterns: ['*://www.linkedin.com/in/*'],
      targetUrlPatterns: ['*://www.linkedin.com/in/*']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating enrich profile context menu:', chrome.runtime.lastError);
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab || typeof tab.id === 'undefined') {
    return;
  }

  const profileUrl = info.linkUrl || info.pageUrl;
  if (!profileUrl) {
    console.warn('No profile URL available for enrichment.');
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    action: 'ENRICH_PROFILE_FROM_CONTEXT_MENU',
    profileUrl: profileUrl
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error sending message to content script:', chrome.runtime.lastError);
    }
  });
});
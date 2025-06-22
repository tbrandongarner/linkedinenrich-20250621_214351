const SIDEBAR_ID = 'linkedin-enrichment-sidebar';
  let lastUrl = location.href;

  // Monkey-patch history methods to detect SPA navigation
  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    window.dispatchEvent(new Event('locationchange'));
  };
  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    window.dispatchEvent(new Event('locationchange'));
  };

  // Listen for navigation events
  window.addEventListener('popstate', init);
  window.addEventListener('locationchange', init);

  // Debounced mutation observer on body to detect DOM-driven route changes
  let mutationTimeout = null;
  const observer = new MutationObserver(() => {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(() => {
      if (location.href !== lastUrl) {
        init();
      }
    }, 200);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  init();

  function init() {
    if (!location.pathname.startsWith('/in/')) return;
    if (location.href === lastUrl && document.getElementById(SIDEBAR_ID)) return;
    lastUrl = location.href;
    removeSidebar();
    waitForRail().then(createSidebar).then(() => fetchData(location.href));
  }

  function waitForRail() {
    return new Promise(resolve => {
      const findRail = () =>
        document.querySelector('.pv-content .core-rail') ||
        document.querySelector('.core-rail');
      let rail = findRail();
      if (rail) {
        return resolve(rail);
      }
      const railObserver = new MutationObserver(() => {
        rail = findRail();
        if (rail) {
          railObserver.disconnect();
          resolve(rail);
        }
      });
      railObserver.observe(document.body, { childList: true, subtree: true });
    });
  }

  function createSidebar(rail) {
    const sidebar = document.createElement('div');
    sidebar.id = SIDEBAR_ID;
    sidebar.style.cssText = [
      'position:sticky',
      'top:100px',
      'margin:10px',
      'padding:12px',
      'background:#fff',
      'border:1px solid #ddd',
      'border-radius:4px',
      'max-width:280px',
      'font-family:Arial,sans-serif',
      'font-size:14px',
      'color:#333',
      'z-index:9999'
    ].join(';');
    sidebar.textContent = 'Loading enrichment...';
    rail.prepend(sidebar);
    return Promise.resolve();
  }

  function removeSidebar() {
    const existing = document.getElementById(SIDEBAR_ID);
    if (existing) existing.remove();
  }

  function fetchData(profileUrl) {
    chrome.runtime.sendMessage(
      { type: 'FETCH_PROFILE_DATA', profileUrl },
      response => {
        if (response && response.success && response.data) {
          populateSidebar(response.data);
        } else {
          const errorMsg =
            response && response.error
              ? response.error
              : 'Failed to load enrichment';
          showError(errorMsg);
        }
      }
    );
  }

  function populateSidebar(data) {
    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return;
    sidebar.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = 'Enriched Profile';
    title.style.margin = '0 0 8px 0';
    title.style.fontSize = '16px';
    sidebar.appendChild(title);

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    const fields = {
      Email: data.email,
      Phone: data.phone,
      Company: data.company,
      Location: data.location
    };
    for (const [label, value] of Object.entries(fields)) {
      if (!value) continue;
      const li = document.createElement('li');
      li.style.margin = '4px 0';
      const strong = document.createElement('strong');
      strong.textContent = label + ': ';
      li.appendChild(strong);
      li.appendChild(document.createTextNode(value));
      list.appendChild(li);
    }
    sidebar.appendChild(list);

    if (Array.isArray(data.socialLinks) && data.socialLinks.length) {
      const socialDiv = document.createElement('div');
      socialDiv.style.marginTop = '10px';
      const strong = document.createElement('strong');
      strong.textContent = 'Social Links';
      socialDiv.appendChild(strong);
      data.socialLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link;
        a.textContent = link.replace(/^https?:\/\//, '');
        a.target = '_blank';
        a.style.display = 'block';
        a.style.margin = '2px 0';
        socialDiv.appendChild(a);
      });
      sidebar.appendChild(socialDiv);
    }
  }

  function showError(message) {
    const sidebar = document.getElementById(SIDEBAR_ID);
    if (!sidebar) return;
    sidebar.innerHTML = '';
    const err = document.createElement('div');
    err.textContent = message;
    err.style.color = 'red';
    sidebar.appendChild(err);
  }
})();
const BACKEND_URL = "http://localhost:5000";
const cache = new Map();
const TTL = 300000; // cache 5 min

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyze-stock-sentiment",
    title: "Analyze Stock Sentiment",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-stock-sentiment" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: "ANALYZE_TICKER",
      ticker: info.selectionText.trim()
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "FETCH_STOCK_DATA" && message?.ticker) {
    fetchAll(message.ticker)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async
  }
});

async function fetchAll(ticker) {
  const now = Date.now();
  if (cache.has(ticker) && now - cache.get(ticker).timestamp < TTL) {
    return cache.get(ticker).data;
  }
  const res = await fetch(`${BACKEND_URL}/all/${ticker}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(ticker, { data, timestamp: now });
  return data;
}

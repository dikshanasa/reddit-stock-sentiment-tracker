if (!window.__sentimentScriptLoaded) {
  window.__sentimentScriptLoaded = true;

  let tooltipEl;
  let hideTimeout;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "ANALYZE_TICKER" && msg.ticker) {
      const tickerRegex = /^\$?[A-Z]{1,5}$/;
      if (tickerRegex.test(msg.ticker)) {
        const ticker = msg.ticker.replace('$', '');
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        showTooltipAtPosition(ticker, rect.left + window.scrollX, rect.bottom + window.scrollY + 5);
      }
    }
  });

  function showTooltipAtPosition(ticker, x, y) {
    hideTooltip();

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'stock-tooltip dark-theme';
    tooltipEl.textContent = 'Loading...';
    document.body.appendChild(tooltipEl);

    tooltipEl.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    tooltipEl.addEventListener('mouseleave', () => {
      hideTimeout = setTimeout(hideTooltip, 200);
    });

    tooltipEl.style.top = `${y}px`;
    tooltipEl.style.left = `${x}px`;

    chrome.runtime.sendMessage({ type: 'FETCH_STOCK_DATA', ticker }, (res) => {
      if (res.success) {
        renderTooltipData(res.data);
      } else {
        tooltipEl.textContent = 'Error loading data';
      }
    });
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  function renderTooltipData(d) {
    const changeColor = d.changePercent > 0 ? '#4caf50'
                      : d.changePercent < 0 ? '#f44336'
                      : '#999';
    const sentimentColor = getSentimentColor(d.sentimentScore || 50);

    const comments = (d.posts || []).map(p => ({
      title: p.title.length > 100 ? p.title.slice(0, 97) + '…' : p.title,
      subreddit: p.subreddit || '',
      url: p.url,
      sentiment: p.threadSentiment
    }));

    tooltipEl.innerHTML = `
      <div class="header">
        <strong>${d.ticker}</strong>
        <span class="price">Price: $${d.price ?? 'N/A'}</span><br>
        <span class="change" style="color:${changeColor}">
          Change: ${d.changePercent != null ? d.changePercent.toFixed(2) + '%' : 'N/A'}
        </span>
      </div>

      <div class="sentiment-section">
        <label>Overall Sentiment:</label>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${d.sentimentScore}%; background:${sentimentColor};"></div>
        </div>
      </div>

      <div class="reddit-comments">
        <label>Recent Reddit Threads:</label>
        ${comments.length
          ? comments.map(p => `
            <div class="comment" style="color:${getSentimentColor(p.sentiment)}">
              <a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.title}</a>
              <span class="subreddit">(${p.subreddit})</span>
            </div>
          `).join('')
          : '<div>No recent posts</div>'}
      </div>

      <div class="footer">
        <a href="https://reddit.com/r/stocks/search?q=${d.ticker}"
           target="_blank"
           rel="noopener noreferrer">
          View full analysis
        </a>
      </div>
    `;
  }

  function getSentimentColor(score) {
    if (score >= 70) return '#4caf50'; // bullish
    if (score >= 40) return '#ffeb3b'; // neutral
    return '#f44336'; // bearish
  }
}

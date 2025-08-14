# Reddit Stock Sentiment Tracker 🚀

AI-powered Chrome Extension that analyzes stock-related Reddit threads and visualizes sentiment in real-time using an NLP model fine-tuned for **financial news**. Built with **JavaScript, Node.js, Hugging Face API**, and **Reddit & Finnhub APIs**.

---

## 📌 Features

- **Real-time Reddit Sentiment** - Scrapes the latest 5 relevant threads from subreddits like r/stocks, r/wallstreetbets, r/investing.
- **Financial NLP Model** - Uses [mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis](https://huggingface.co/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis) for finance-specific sentiment scoring.
- **Stock Data** - Live price, change %, and historical info from [Finnhub](https://finnhub.io/).
- **Visual Sentiment Breakdown** - Color-coded bars: 🟢 Bullish (≥70) | 🟡 Neutral (40–69) | 🔴 Bearish (<40).
- **Context Menu Integration** - Right-click → *Analyze Stock Sentiment* for any selected ticker.
- **Cloud Backend** - Deployed on Vercel with secure API key management.

---

## 🛠 Tech Stack

### **Frontend (Chrome Extension)**
- Manifest V3
- Background service worker + content scripts
- HTML/CSS/JavaScript for UI & tooltip rendering

### **Backend**
- Node.js + Express (deployed on Vercel)
- Hugging Face Inference API
- Reddit API + OAuth2
- Finnhub API
- CORS-enabled for extension requests

---

## 📷 Screenshots

| Tooltip with Sentiment | Context Menu |
|------------------------|--------------|
| ![tooltip](src/assets/tooltip.png) | ![context menu](src/assets/context-menu.png) |

---

## 🚀 Quick Start

### **1. Clone the repo**

```bash
git clone https://github.com/dikshanasa/reddit-stock-sentiment-tracker.git
cd reddit-stock-sentiment-tracker
```

### **2. Load Chrome Extension**

- Go to `chrome://extensions`
- Toggle **Developer Mode**
- Click **Load Unpacked** and select the `/extension` folder
- The extension is ready to use with the deployed backend!

### **3. Test the Extension**

1. Visit any financial website (Yahoo Finance, Bloomberg, etc.)
2. Highlight a stock ticker (e.g., $TSLA, AAPL)
3. Right-click → **Analyze Stock Sentiment**
4. View real-time Reddit sentiment and stock data in the popup

---

## 🔧 Local Development

### **Backend Setup**

```bash
cd server
npm install
```

Create a `.env` in `/server` with:

```env
HF_TOKEN=your_huggingface_api_token
FINNHUB_KEY=your_finnhub_api_key
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=your_app_user_agent
PORT=5000
```

Run locally:

```bash
node server.js
```

### **Extension Development**

For local backend testing, update `BACKEND_URL` in your extension files:

```javascript
// For local development
const BACKEND_URL = 'http://localhost:5000';

// For production (default)
const BACKEND_URL = 'https://reddit-stock-sentiment-tracker-4asug17my-dikshanasas-projects.vercel.app';
```

---

## 🌐 Deployed Backend

The production API is live at:
**[https://reddit-stock-sentiment-tracker-4asug17my-dikshanasas-projects.vercel.app](https://reddit-stock-sentiment-tracker-4asug17my-dikshanasas-projects.vercel.app)**

### **API Endpoints**

- `GET /` - Health check
- `GET /reddit/:symbol` - Get Reddit sentiment for a stock symbol
- `GET /all/:symbol` - Get combined stock data + sentiment

### **Example Usage**

```bash
# Get Tesla sentiment from Reddit
curl "https://reddit-stock-sentiment-tracker-4asug17my-dikshanasas-projects.vercel.app/reddit/TSLA"

# Get Apple stock data + sentiment
curl "https://reddit-stock-sentiment-tracker-4asug17my-dikshanasas-projects.vercel.app/all/AAPL"
```

---

## 🔒 Environment Variables

| Variable | Description |
|----------|-------------|
| HF_TOKEN | Hugging Face token (read access) |
| FINNHUB_KEY | Finnhub API key |
| REDDIT_CLIENT_ID | Reddit OAuth client ID |
| REDDIT_CLIENT_SECRET | Reddit OAuth client secret |
| REDDIT_USER_AGENT | App's user agent string |

---

## 📦 Deployment

### **Backend (Already Deployed)**

- ✅ Deployed on Vercel with automatic deployments from GitHub
- ✅ Environment variables configured
- ✅ Production API endpoints active

### **Extension Distribution**

**Developer Mode Install**:
- Share the `/extension` folder with users
- Instructions: Load unpacked in `chrome://extensions`

**Chrome Web Store** (Future):
- Package extension as .zip
- Pay $5 developer fee
- Submit for review (1-3 days)

---

## 🎬 Demo

Watch the Reddit Stock Sentiment Tracker in action:

![Demo GIF](src/assets/redditDemo.gif)

**How it works:**

1. Highlight a stock ticker anywhere on a webpage
2. Right-click and select **Analyze Stock Sentiment** from the context menu
3. A tooltip pops up showing real-time sentiment based on the latest Reddit threads
4. Color-coded bars indicate sentiment strength:
   - 🟢 Bullish (≥70)
   - 🟡 Neutral (40–69)
   - 🔴 Bearish (<40)
5. Live stock price and historical info are fetched from Finnhub for context

---

## 🚀 Current Status

- ✅ **Backend**: Deployed and operational on Vercel
- ✅ **API**: All endpoints working with real data
- ✅ **Extension**: Ready for installation and testing
- ✅ **Sentiment Analysis**: Finance-specific NLP model integrated
- ✅ **Stock Data**: Real-time prices via Finnhub API
- 🔄 **Next**: Chrome Web Store submission

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

MIT License © 2025
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import Sentiment from "sentiment";

dotenv.config();
const app = express();
app.use(cors());

const FINNHUB_KEY = process.env.FINNHUB_KEY || "YOUR_FINNHUB_KEY";
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT;

const sentiment = new Sentiment();

function sendError(res, message, status = 500) {
  console.error("[Server Error]", message);
  res.status(status).json({ error: message });
}

async function fetchFinnhubQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
  console.log(`[Backend] Fetching stock data for ${symbol} from Finnhub: ${url}`);
  const r = await fetch(url);
  const data = await r.json();
  console.log("[Finnhub raw response]", data);

  if (!data || typeof data.c !== "number") {
    throw new Error(`No stock data for ${symbol}`);
  }

  return {
    ticker: symbol,
    price: data.c,
    open: data.o,
    high: data.h,
    low: data.l,
    previousClose: data.pc,
    change: data.d,
    changePercent: data.dp
  };
}

app.get("/stock/:symbol", async (req, res) => {
  try {
    const quote = await fetchFinnhubQuote(req.params.symbol.toUpperCase());
    res.json(quote);
  } catch (err) {
    sendError(res, err.message);
  }
});

app.get("/reddit/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USER_AGENT) {
    return sendError(res, "Missing Reddit API credentials in .env");
  }

  try {
    const authString = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return sendError(res, `Reddit auth failed: ${JSON.stringify(tokenData)}`, 401);
    }

    const subreddits = ["stocks", "wallstreetbets", "investing", symbol];
    let allPosts = [];
    for (const sub of subreddits) {
      const url = `https://oauth.reddit.com/r/${sub}/search.json?q=${symbol}&limit=15&sort=new&restrict_sr=on`;
      const searchRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": REDDIT_USER_AGENT,
        },
      });
      const json = await searchRes.json();
      const posts = json?.data?.children?.map((p) => ({
        title: p.data.title,
        score: p.data.score,
        url: `https://reddit.com${p.data.permalink}`,
        subreddit: p.data.subreddit,
      })) || [];
      allPosts.push(...posts);
    }

    const tickerRegex = new RegExp(`(\\$${symbol}\\b|\\b${symbol}\\b)`, "i");
    allPosts = allPosts.filter(p => tickerRegex.test(p.title));

    const seen = new Set();
    allPosts = allPosts.filter(p => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    allPosts.sort((a, b) => b.score - a.score);
    allPosts = allPosts.slice(0, 5);

    let totalSentiment = 0;
    allPosts.forEach(p => { totalSentiment += sentiment.analyze(p.title).score; });
    let sentimentScore = allPosts.length
      ? Math.round(((totalSentiment / allPosts.length) + 5) / 10 * 100) : 50;
    sentimentScore = Math.max(0, Math.min(100, sentimentScore));

    res.json({ sentimentScore, posts: allPosts });

  } catch (err) {
    sendError(res, err.message);
  }
});

app.get("/all/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const [stockData, redditData] = await Promise.all([
      fetchFinnhubQuote(symbol),
      fetch(`http://localhost:${process.env.PORT || 5000}/reddit/${symbol}`).then(r => r.json()),
    ]);
    res.json({ ticker: symbol, ...stockData, sentimentScore: redditData.sentimentScore, posts: redditData.posts });
  } catch (err) {
    sendError(res, err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`));

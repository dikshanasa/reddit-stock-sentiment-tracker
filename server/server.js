import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN;
const FINNHUB_KEY = process.env.FINNHUB_KEY;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT;

// Add a root endpoint for testing
app.get("/", (req, res) => {
  res.json({ 
    message: "Reddit Stock Sentiment Tracker API is running!",
    endpoints: ["/reddit/:symbol", "/all/:symbol"],
    status: "healthy"
  });
});

// Map model labels to numeric scores
function finbertScore(label) {
  switch (label.toLowerCase()) {
    case "positive": return 100;
    case "neutral": return 50;
    case "negative": return 0;
    default: return 50;
  }
}

// Clean text before sending to HF API
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\*\*/g, '')           // Remove bold markdown (fixed escaping)
    .replace(/\*/g, '')             // Remove italic markdown  
    .replace(/u\/\w+/g, '')         // Remove user mentions (fixed escaping)
    .replace(/r\/\w+/g, '')         // Remove subreddit mentions (fixed escaping)
    .replace(/https?:\/\/\S+/g, '') // Remove URLs (fixed escaping)
    .replace(/[^\w\s.,!?-]/g, ' ')  // Replace special chars with spaces (fixed escaping)
    .replace(/\s+/g, ' ')           // Collapse multiple spaces (fixed escaping)
    .substring(0, 512)              // HF model token limit
    .trim();
}

// Add delay function for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeTextFinBERT(text) {
  try {
    const cleanText = sanitizeText(text);
    
    // Skip if text is too short or empty
    if (cleanText.length < 10) {
      console.log('⚠️ Text too short, using neutral score');
      return 50;
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: cleanText }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HF API HTTP error: ${response.status} - ${errorText}`);
      return 50;
    }

    const result = await response.json();
    if (!Array.isArray(result) || !Array.isArray(result[0])) return 50;
    
    const best = result[0].reduce((prev, cur) =>
      cur.score > prev.score ? cur : prev
    );
    return finbertScore(best.label);
  } catch (err) {
    console.error("HF API call failed:", err.message);
    return 50;
  }
}

async function fetchFinnhubQuote(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
  const r = await fetch(url);
  const data = await r.json();
  if (!data || typeof data.c !== "number")
    throw new Error(`No stock data for ${symbol}`);
  return {
    ticker: symbol,
    price: data.c,
    open: data.o,
    high: data.h,
    low: data.l,
    previousClose: data.pc,
    change: data.d,
    changePercent: data.dp,
  };
}

app.get("/reddit/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  console.log(`\n=== Fetching Reddit sentiment for ${symbol} ===`);

  try {
    // Reddit OAuth
    const authString = Buffer.from(
      `${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`
    ).toString("base64");
    const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token)
      return res.status(401).json({ error: "Reddit auth failed" });

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": REDDIT_USER_AGENT,
    };
    const subs = ["stocks", "wallstreetbets", "investing", symbol];
    let allPosts = [];

    for (const sub of subs) {
      const url = `https://oauth.reddit.com/r/${sub}/search.json?q=${symbol}&limit=15&sort=new&restrict_sr=on`;
      const r = await fetch(url, { headers });
      const json = await r.json();
      const posts =
        json?.data?.children?.map((p) => ({
          id: p.data.id,
          title: p.data.title,
          selftext: p.data.selftext || "",
          score: p.data.score,
          url: `https://reddit.com${p.data.permalink}`,
          permalink: p.data.permalink,
          subreddit: p.data.subreddit,
        })) || [];
      allPosts.push(...posts);
    }

    // Filter & dedupe
    const tickerRegex = new RegExp(
      `(?<![A-Z0-9])\\$?${symbol}(?![A-Z0-9])`,
      "i"
    );

    allPosts = allPosts.filter(
      (p) => tickerRegex.test(p.title) || tickerRegex.test(p.selftext)
    );
    allPosts = Array.from(new Set(allPosts.map((p) => p.url))).map((url) =>
      allPosts.find((p) => p.url === url)
    );
    allPosts.sort((a, b) => b.score - a.score);
    allPosts = allPosts.slice(0, 5);

    // Analyze threads
    let threadScores = [];
    for (const post of allPosts) {
      console.log(
        `\n--- Analyzing thread: ${post.title} (${post.url}) ---`
      );
      const postText = `${post.title} ${post.selftext}`;
      const postSentiment = await analyzeTextFinBERT(postText);

      // Comments
      const commentsUrl = `https://oauth.reddit.com${post.permalink}.json?sort=top&limit=10`;
      const cr = await fetch(commentsUrl, { headers });
      const cj = await cr.json();
      let commentScores = [];

      if (Array.isArray(cj) && cj[1]?.data?.children) {
        const comments = cj[1].data.children
          .filter((c) => c.kind === "t1" && c.data.body)
          .map((c) => c.data.body);
        console.log(`💬 Found ${comments.length} top comments`);
        
        // Add rate limiting between comment analysis
        for (const comment of comments) {
          await delay(100); // 100ms delay between requests
          commentScores.push(await analyzeTextFinBERT(comment));
        }
      }

      const avgCommentSentiment = commentScores.length
        ? commentScores.reduce((a, b) => a + b, 0) / commentScores.length
        : 50;

      post.threadSentiment = Math.round(
        postSentiment * 0.6 + avgCommentSentiment * 0.4
      );
      console.log(`🎯 Thread final sentiment: ${post.threadSentiment}`);
      threadScores.push(post.threadSentiment);
    }

    const sentimentScore = threadScores.length
      ? Math.round(
          threadScores.reduce((a, b) => a + b, 0) / threadScores.length
        )
      : 50;

    console.log(`\n🔥 Final overall sentiment for ${symbol}: ${sentimentScore}\n`);
    res.json({ sentimentScore, posts: allPosts });
  } catch (err) {
    console.error("❌ Error in /reddit route:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/all/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const [stockData, redditData] = await Promise.all([
      fetchFinnhubQuote(symbol),
      // Fixed: Use current host instead of localhost for deployed version
      fetch(
        `${req.protocol}://${req.get('host')}/reddit/${symbol}`
      ).then((r) => r.json()),
    ]);
    res.json({
      ticker: symbol,
      ...stockData,
      sentimentScore: redditData.sentimentScore,
      posts: redditData.posts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);

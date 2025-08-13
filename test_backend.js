import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000";
const tests = [
  { name: "Normal - Apple", endpoint: "all/AAPL" },
  { name: "Normal - Tesla", endpoint: "all/TSLA" },
  { name: "Lowercase - google", endpoint: "all/goog" },
  { name: "All Reddit - AAPL", endpoint: "reddit/AAPL" },
  { name: "Invalid Ticker", endpoint: "all/FAKETKR" },
  { name: "Empty Ticker", endpoint: "all/" },
];

async function runTests() {
  console.log("🚀 Starting backend API tests...\n");

  for (let t of tests) {
    const url = `${BASE_URL}/${t.endpoint}`;
    console.log(`🔎 Test: ${t.name} (${url})`);
    const start = Date.now();
    try {
      const res = await fetch(url);
      const time = Date.now() - start;
      console.log(`   ⏱  Response time: ${time} ms`);
      console.log(`   📡 Status: ${res.status} ${res.statusText}`);
      const data = await res.json();
      // Sanity checks
      if (res.status === 200) {
        if (data.sentimentScore !== undefined) {
          console.log(`   🎯 Sentiment score: ${data.sentimentScore}`);
          if (data.sentimentScore === 50) {
            console.warn("   ⚠️ Sentiment defaulted to 50 (neutral) — check model/API result");
          }
        }
        if (Array.isArray(data.posts)) {
          console.log(`   📝 Posts returned: ${data.posts.length}`);
          // Look for edge sentiment variety
          const sentiments = [...new Set(data.posts.map(p => p.threadSentiment))];
          console.log(`   🎨 Unique post sentiments: ${sentiments.join(", ")}`);
        }
      } else {
        console.error(`   ❌ Error response:`, data);
      }
    } catch (err) {
      console.error(`   💥 Request failed: ${err.message}`);
    }
    console.log("");
  }
}

runTests();

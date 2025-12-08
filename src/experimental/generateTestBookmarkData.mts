import fs from 'fs';

// --- CONFIGURATION ---
const TARGET_COUNT = 250;
const OUTPUT_JSON = 'heavy_bookmarks.mts';
const OUTPUT_HTML = 'heavy_bookmarks.html';

// --- SEMANTIC VOCABULARY ---
// We mix these to create "real-sounding" bookmarks that will actually test your LLM's logic.
const VOCAB = {
  dev: {
    titles: ['React', 'TypeScript', 'Docker', 'Kubernetes', 'Rust', 'GraphQL', 'Python', 'Node.js', 'API', 'Debugging', 'Async', 'Algorithm'],
    suffixes: ['Documentation', 'Crash Course', 'Best Practices', 'Tutorial', 'GitHub Repo', 'v5.0 Release Notes', 'Stack Overflow', 'Guide'],
    domains: ['github.com', 'stackoverflow.com', 'dev.to', 'react.dev', 'typescriptlang.org', 'npmjs.com']
  },
  cooking: {
    titles: ['Pizza', 'Sourdough', 'Ramen', 'Burger', 'Pasta', 'Sushi', 'Steak', 'Vegan Curry', 'Keto Diet', 'Chocolate Cake'],
    suffixes: ['Recipe', 'Video', 'Serious Eats', 'Technique', 'Guide', 'Best Ingredients', 'Food Lab', 'Chef Steps'],
    domains: ['seriouseats.com', 'cooking.nytimes.com', 'bonappetit.com', 'allrecipes.com', 'foodnetwork.com']
  },
  news: {
    titles: ['Election', 'Stock Market', 'Global Warming', 'Tech Crunch', 'Crypto Crash', 'Sports Finals', 'Weather Update', 'Breaking News'],
    suffixes: ['Live Updates', 'Analysis', 'Report', 'Opinion', 'Forecast', 'Headlines', 'BBC World'],
    domains: ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com', 'bloomberg.com']
  }
};

const CATEGORIES = ['dev', 'cooking', 'news'] as const;

// --- HELPERS ---
const pick = <T,>(arr: T[] | readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const randomId = () => Math.random().toString(36).substring(7);

function generateBookmark() {
  const category = pick(CATEGORIES);
  const vocab = VOCAB[category];
  
  const title = `${pick(vocab.titles)} ${pick(vocab.suffixes)}`;
  // Add some randomness to URL to ensure uniqueness
  const url = `https://${pick(vocab.domains)}/${category}/${pick(vocab.titles).toLowerCase()}-${randomId()}`;

  return { title, url }; // expectedCategory is just for your reference
}

// --- MAIN ---
console.log(`🏭 Generating ${TARGET_COUNT} semantic bookmarks...`);

const bookmarks = [];
for (let i = 0; i < TARGET_COUNT; i++) {
  bookmarks.push(generateBookmark());
}

// 1. WRITE JSON (For your Test Harness)
console.log(`💾 Writing JSON to ${OUTPUT_JSON}...`);
fs.writeFileSync(OUTPUT_JSON, JSON.stringify(bookmarks, null, 2));

// 2. WRITE HTML (For Chrome Import)
console.log(`💾 Writing HTML to ${OUTPUT_HTML}...`);
const htmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Date.now()}">Stress Test Import</H3>
    <DL><p>
        ${bookmarks.map(b => `<DT><A HREF="${b.url}" ADD_DATE="${Date.now()}">${b.title}</A>`).join('\n        ')}
    </DL><p>
</DL><p>`;

fs.writeFileSync(OUTPUT_HTML, htmlContent);

console.log("✅ Done! You can now:");
console.log("   1. Import `heavy_bookmarks.html` into Chrome to test the Extension API.");
console.log("   2. Load `heavy_bookmarks.json` into your harness to stress-test the LLM Cluster.");
/**
 * Workflowfree.com Prompt Scraper v2
 * Scrapes ~2600+ image prompts from the listing pages
 * 
 * Usage: node scraper/scrape-prompts.mjs
 * 
 * Phase 1: Scrape listing pages (1-146) to collect all prompt URLs
 * Phase 2: Scrape each prompt page for full content (with retry on 503)
 * Phase 3: Save to JSON
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = __dirname;
const URLS_FILE = path.join(OUTPUT_DIR, 'prompt-urls.json');
const DATA_FILE = path.join(OUTPUT_DIR, 'prompts-raw.json');
const FINAL_FILE = path.join(OUTPUT_DIR, '..', 'public', 'data', 'prompts.json');

const BASE_LISTING_URL = 'https://workflowfree.com/prompt-anh-google-banana/';
const TOTAL_LISTING_PAGES = 146;
const CONCURRENCY = 3;       // lower to avoid 503
const DELAY_MS = 500;         // delay between requests
const REQUEST_TIMEOUT = 20000;
const MAX_RETRIES = 3;
const BATCH_SIZE = 30;

// Simple HTML fetcher with retry
function fetchPage(url, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${url}`)), REQUEST_TIMEOUT);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timer);
        fetchPage(res.headers.location, retries).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode === 503 || res.statusCode === 429) {
        clearTimeout(timer);
        if (retries > 0) {
          const backoff = (MAX_RETRIES - retries + 1) * 2000;
          setTimeout(() => {
            fetchPage(url, retries - 1).then(resolve).catch(reject);
          }, backoff);
        } else {
          reject(new Error(`HTTP ${res.statusCode} after ${MAX_RETRIES} retries: ${url}`));
        }
        return;
      }
      
      if (res.statusCode !== 200) {
        clearTimeout(timer);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        resolve(data);
      });
      res.on('error', err => {
        clearTimeout(timer);
        reject(err);
      });
    }).on('error', err => {
      clearTimeout(timer);
      if (retries > 0) {
        setTimeout(() => {
          fetchPage(url, retries - 1).then(resolve).catch(reject);
        }, 2000);
      } else {
        reject(err);
      }
    });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runConcurrent(tasks, concurrency, delayMs = 0) {
  const results = [];
  let index = 0;
  
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        results[i] = { error: err.message };
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  }
  
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ===================== PHASE 1: Collect URLs =====================
function extractPromptUrls(html) {
  const urls = [];
  const linkRegex = /href="(https:\/\/workflowfree\.com\/[^"]+)"/g;
  let match;
  
  const excludePatterns = [
    '/category/', '/tag/', '/page/', '/san-pham/', '/prompt-anh-google-banana/',
    '/author/', '/wp-content/', '/wp-admin/', '/wp-json/', '#',
    '.jpg', '.png', '.gif', '.css', '.js', '/feed/', '/comments/',
    'aistudio.google.com', 'labs.google', '/shop/', '/cart/', '/checkout/',
    '/my-account/', '/contact/', '/about/', '/lien-he/', '/gioi-thieu/',
    '/dang-nhap/', '/dang-ky/',
  ];
  
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1].split('?')[0].split('#')[0];
    if (excludePatterns.some(p => url.includes(p))) continue;
    const slug = url.replace('https://workflowfree.com/', '').replace(/\/$/, '');
    if (!slug || slug.includes('/')) continue;
    urls.push(url.endsWith('/') ? url : url + '/');
  }
  
  return [...new Set(urls)];
}

async function phase1_collectUrls() {
  console.log('=== PHASE 1: Collecting prompt URLs from listing pages ===');
  
  if (fs.existsSync(URLS_FILE)) {
    const cached = JSON.parse(fs.readFileSync(URLS_FILE, 'utf-8'));
    console.log(`Found cached URLs: ${cached.length} URLs`);
    return cached;
  }
  
  const allUrls = new Set();
  const tasks = [];
  
  // Page 1
  tasks.push(async () => {
    console.log(`Fetching listing page 1...`);
    const html = await fetchPage(BASE_LISTING_URL);
    const urls = extractPromptUrls(html);
    console.log(`  Page 1: ${urls.length} URLs`);
    return urls;
  });
  
  // Pages 2-146
  for (let page = 2; page <= TOTAL_LISTING_PAGES; page++) {
    const pageNum = page;
    tasks.push(async () => {
      const url = `${BASE_LISTING_URL}page/${pageNum}/`;
      console.log(`Fetching listing page ${pageNum}...`);
      const html = await fetchPage(url);
      const urls = extractPromptUrls(html);
      console.log(`  Page ${pageNum}: ${urls.length} URLs`);
      return urls;
    });
  }
  
  const results = await runConcurrent(tasks, CONCURRENCY, DELAY_MS);
  
  let errorCount = 0;
  for (const result of results) {
    if (result && result.error) {
      errorCount++;
    } else if (Array.isArray(result)) {
      result.forEach(u => allUrls.add(u));
    }
  }
  
  const urlArray = [...allUrls];
  console.log(`\nTotal unique URLs: ${urlArray.length} (${errorCount} page errors)`);
  
  fs.writeFileSync(URLS_FILE, JSON.stringify(urlArray, null, 2));
  return urlArray;
}

// ===================== PHASE 2: Scrape individual prompts =====================
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

function extractPromptData(html, url) {
  const data = { url };
  
  // Extract title from <h1 class="entry-title">
  const h1Match = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>(.*?)<\/h1>/is) ||
                   html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (h1Match) {
    data.title = decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, '').trim());
  }
  
  // Extract the prompt from entry-content
  // Look for the pattern "Prompt XXXX:" in <p> tags
  const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<footer|<\/article)/i);
  
  if (contentMatch) {
    const content = contentMatch[1];
    
    // Find all <p> tags
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    
    while ((pMatch = pRegex.exec(content)) !== null) {
      const rawText = pMatch[1];
      const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
      
      // Check if this paragraph contains "Prompt XXXX:" pattern
      const promptMatch = text.match(/^Prompt\s+(\d+)\s*:\s*([\s\S]+)/i);
      if (promptMatch) {
        data.promptId = parseInt(promptMatch[1]);
        data.promptText = promptMatch[2].trim();
        break;
      }
    }
    
    // Fallback: If no "Prompt XXXX:" pattern found, look for the longest English paragraph
    if (!data.promptText) {
      let bestText = '';
      const pRegex2 = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch2;
      
      while ((pMatch2 = pRegex2.exec(content)) !== null) {
        const text = decodeHtmlEntities(pMatch2[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
        const englishRatio = (text.match(/[a-zA-Z]/g) || []).length / Math.max(text.length, 1);
        if (text.length > 100 && englishRatio > 0.6 && text.length > bestText.length) {
          bestText = text;
        }
      }
      
      if (bestText) {
        data.promptText = bestText;
        // Try to extract ID from it
        const idInText = bestText.match(/^(\d+)\s*:\s*/);
        if (idInText) {
          data.promptId = parseInt(idInText[1]);
          data.promptText = bestText.replace(/^\d+\s*:\s*/, '');
        }
      }
    }
  }
  
  // Extract OG image
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  if (ogImageMatch) {
    data.imageUrl = ogImageMatch[1];
  }
  
  // Also try to extract featured image from content
  if (!data.imageUrl) {
    const imgMatch = html.match(/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/i) ||
                     html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*wp-post-image[^"]*"/i);
    if (imgMatch) {
      data.imageUrl = imgMatch[1];
    }
  }
  
  return data;
}

async function phase2_scrapePrompts(urls) {
  console.log('\n=== PHASE 2: Scraping individual prompt pages ===');
  
  // Load existing progress
  let existingData = {};
  if (fs.existsSync(DATA_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    raw.forEach(item => {
      if (item.url && item.promptText && !item.error) {
        existingData[item.url] = item;
      }
    });
    console.log(`Found ${Object.keys(existingData).length} successfully-scraped prompts`);
  }
  
  // Filter out already-scraped (successfully) URLs
  const remaining = urls.filter(u => !existingData[u]);
  console.log(`Remaining to scrape: ${remaining.length}`);
  
  if (remaining.length === 0) {
    return Object.values(existingData);
  }
  
  let completed = 0;
  
  for (let batchStart = 0; batchStart < remaining.length; batchStart += BATCH_SIZE) {
    const batch = remaining.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
    console.log(`\n  Batch ${batchNum}/${totalBatches} (${batch.length} URLs)...`);
    
    const tasks = batch.map(url => async () => {
      try {
        const html = await fetchPage(url);
        const data = extractPromptData(html, url);
        completed++;
        if (completed % 10 === 0) {
          process.stdout.write(`  ${completed}/${remaining.length} `);
        }
        return data;
      } catch (err) {
        completed++;
        return { url, error: err.message };
      }
    });
    
    const batchResults = await runConcurrent(tasks, CONCURRENCY, DELAY_MS);
    
    let batchSuccess = 0;
    let batchError = 0;
    for (const item of batchResults) {
      if (item && item.url) {
        if (item.promptText && !item.error) {
          existingData[item.url] = item;
          batchSuccess++;
        } else {
          batchError++;
        }
      }
    }
    
    // Save progress
    const allData = Object.values(existingData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));
    console.log(`  Batch ${batchNum}: ${batchSuccess} OK, ${batchError} failed. Total: ${allData.length}`);
    
    // Longer delay between batches
    await sleep(1000);
  }
  
  return Object.values(existingData);
}

// ===================== PHASE 3: Clean & transform data =====================
function phase3_transformData(rawData) {
  console.log('\n=== PHASE 3: Transforming and cleaning data ===');
  
  const prompts = rawData
    .filter(item => item.promptText && !item.error)
    .map((item, index) => ({
      id: item.promptId || (index + 1),
      title: item.title || '',
      prompt: item.promptText || '',
      image: item.imageUrl || '',
      url: item.url || '',
    }))
    .sort((a, b) => (b.id || 0) - (a.id || 0));
  
  console.log(`Valid prompts: ${prompts.length} out of ${rawData.length} total`);
  
  const finalDir = path.dirname(FINAL_FILE);
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  
  fs.writeFileSync(FINAL_FILE, JSON.stringify(prompts, null, 2));
  console.log(`Final data saved to: ${FINAL_FILE}`);
  console.log(`File size: ${(fs.statSync(FINAL_FILE).size / 1024 / 1024).toFixed(2)} MB`);
  
  return prompts;
}

// ===================== MAIN =====================
async function main() {
  console.log('🚀 Workflowfree.com Prompt Scraper v2');
  console.log('======================================\n');
  
  try {
    const urls = await phase1_collectUrls();
    const rawData = await phase2_scrapePrompts(urls);
    const prompts = phase3_transformData(rawData);
    
    console.log('\n✅ Done!');
    console.log(`Total prompts scraped: ${prompts.length}`);
    console.log(`Output file: ${FINAL_FILE}`);
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * twitter-post.js — Post the next tweet from the rotating content queue.
 *
 * Usage:
 *   node scripts/twitter-post.js             # Post the next tweet
 *   node scripts/twitter-post.js --dry-run   # Print what would be posted
 *
 * Required env vars (set in GitHub Actions secrets):
 *   TWITTER_API_KEY
 *   TWITTER_API_SECRET
 *   TWITTER_ACCESS_TOKEN
 *   TWITTER_ACCESS_SECRET
 *
 * Loops through content/tweet-queue.json, tracks position in
 * content/tweet-state.json. On queue exhaustion, wraps back to index 0.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const QUEUE_PATH = path.join(REPO_ROOT, 'content', 'tweet-queue.json');
const STATE_PATH = path.join(REPO_ROOT, 'content', 'tweet-state.json');

const DRY_RUN = process.argv.includes('--dry-run');

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function validateTweet(tweet) {
  if (!tweet || typeof tweet.text !== 'string') {
    throw new Error('Invalid tweet: missing .text');
  }
  if (tweet.text.length > 280) {
    throw new Error(`Tweet too long: ${tweet.text.length}/280 chars`);
  }
  return true;
}

async function main() {
  const queue = loadJson(QUEUE_PATH, null);
  if (!queue || !Array.isArray(queue.tweets) || queue.tweets.length === 0) {
    console.error('[twitter-post] No tweet queue found or queue empty.');
    process.exit(1);
  }

  const state = loadJson(STATE_PATH, { index: 0, lastPostedAt: null, posted: [] });
  const index = state.index % queue.tweets.length;
  const tweet = queue.tweets[index];

  try {
    validateTweet(tweet);
  } catch (err) {
    console.error(`[twitter-post] ${err.message}`);
    console.error(`[twitter-post] Tweet at index ${index}:`, tweet);
    process.exit(1);
  }

  console.log(`[twitter-post] Next tweet (${index + 1}/${queue.tweets.length}):`);
  console.log('─'.repeat(60));
  console.log(tweet.text);
  if (tweet.link) console.log(`Link: ${tweet.link}`);
  console.log('─'.repeat(60));
  console.log(`Length: ${tweet.text.length}/280`);

  if (DRY_RUN) {
    console.log('\n[twitter-post] DRY RUN — not posting.');
    return;
  }

  // Check API credentials
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } = process.env;
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    console.error('[twitter-post] Missing Twitter API credentials.');
    console.error('  Required env vars: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET');
    process.exit(1);
  }

  // Lazy-load the SDK so --dry-run works without installed deps
  let TwitterApi;
  try {
    ({ TwitterApi } = require('twitter-api-v2'));
  } catch (err) {
    console.error('[twitter-post] twitter-api-v2 not installed. Run `npm install`.');
    process.exit(1);
  }

  const client = new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET
  });

  try {
    const result = await client.v2.tweet(tweet.text);
    console.log(`[twitter-post] ✓ Posted tweet ID: ${result.data.id}`);

    // Advance state
    state.index = (state.index + 1) % queue.tweets.length;
    state.lastPostedAt = new Date().toISOString();
    if (!state.posted) state.posted = [];
    state.posted.push({
      id: result.data.id,
      text: tweet.text,
      postedAt: state.lastPostedAt,
      queueIndex: index
    });
    // Keep only last 100 in state file
    if (state.posted.length > 100) state.posted = state.posted.slice(-100);
    saveJson(STATE_PATH, state);
    console.log(`[twitter-post] State advanced to index ${state.index}/${queue.tweets.length}`);
  } catch (err) {
    console.error(`[twitter-post] ✗ Failed to post: ${err.message}`);
    if (err.data) console.error('  API response:', JSON.stringify(err.data, null, 2));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[twitter-post] Unexpected error:', err);
  process.exit(1);
});

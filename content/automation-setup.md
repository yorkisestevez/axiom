# Autonomous Promotion Setup Guide

This guide gets all four promotion systems running autonomously. Total one-time setup: ~20 minutes. After that, zero manual work.

## What You're Setting Up

| System | Frequency | Output |
|--------|-----------|--------|
| **Twitter auto-post** | Every 12 hours | Posts from rotating queue of 46 tweets |
| **Dev.to publisher** | Tue + Fri | Publishes next unpublished article from queue |
| **SEO blog builder** | On every push | Rebuilds `site/blog/` from markdown sources |
| **Weekly Hall of Gaps** | Every Sunday 6 AM EST | Scans top 50 repos in a rotating topic, generates report + blog post |

## Step 1: Twitter Developer Account (10 minutes)

You need Twitter API credentials to post programmatically.

1. Go to **https://developer.twitter.com/en/portal/dashboard**
2. Sign up with your Twitter account (use the account you want tweets to come from)
3. Apply for the **Free** tier (basic posting, plenty for this use case)
   - They ask about your use case — write something honest like: "Open source developer tool announcements and technical content"
   - Approval is usually instant
4. Once approved, click **Create Project** → **Create App**
5. On the app page, go to **Keys and tokens**:
   - Copy **API Key** (also called Consumer Key)
   - Copy **API Secret** (also called Consumer Secret)
   - Click **Generate** under "Access Token and Secret"
   - Copy **Access Token**
   - Copy **Access Token Secret**
6. Go to **User authentication settings** for your app:
   - Click **Set up**
   - App permissions: **Read and write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URI: `http://localhost` (required but not used)
   - Website URL: `https://github.com/yorkisestevez/axiom`
   - Save

**Important:** If you generated your access token BEFORE setting permissions to Read and Write, you must regenerate it after changing permissions.

You should now have four values. Keep them ready for step 4.

## Step 2: Dev.to API Key (2 minutes)

1. Go to **https://dev.to/settings/extensions**
2. Scroll to **DEV Community API Keys**
3. Name your key `axiom-auto-publish`
4. Click **Generate API Key**
5. Copy the key — you won't see it again

You now have one value. Keep it ready for step 4.

## Step 3: GitHub Personal Access Token (Optional — only if weekly Hall of Gaps hits rate limits)

The weekly Hall of Gaps workflow uses `GITHUB_TOKEN` automatically — which is fine for 50 repo clones per week. If you later increase the limit or run more scans, you'll need a PAT with higher rate limits.

Skip this for now.

## Step 4: Add Secrets to GitHub Repo

1. Go to your repo: **https://github.com/yorkisestevez/axiom**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

| Secret Name | Value |
|-------------|-------|
| `TWITTER_API_KEY` | (from Step 1) |
| `TWITTER_API_SECRET` | (from Step 1) |
| `TWITTER_ACCESS_TOKEN` | (from Step 1) |
| `TWITTER_ACCESS_SECRET` | (from Step 1) |
| `DEVTO_API_KEY` | (from Step 2) |

After each paste, click **Add secret**. You should end up with 5 secrets total.

**Do not commit these values to any file.** GitHub Secrets are encrypted and only accessible to workflows — that's the right place for them.

## Step 5: Enable GitHub Actions

GitHub Actions should already be enabled. Verify:

1. Go to **Settings** → **Actions** → **General**
2. **Actions permissions**: Allow all actions and reusable workflows
3. **Workflow permissions**: Read and write permissions (this is required so the workflows can commit state updates back)
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Save

## Step 6: Test Each Workflow Manually

GitHub lets you trigger workflows manually via the Actions tab. Let's verify each one:

### 6.1 Test Twitter (dry-run first)

1. Go to **Actions** → **Twitter Auto-Post**
2. Click **Run workflow** (top right)
3. In the dry_run dropdown, select `true`
4. Click **Run workflow**
5. Wait ~30 seconds, click into the run
6. You should see the next tweet in the output (nothing actually posted)

### 6.2 Test Twitter (real post)

Once the dry-run works:

1. Same flow but leave `dry_run` as `false` (default)
2. Watch it post a real tweet to your account
3. Verify the tweet shows up on Twitter
4. Check `content/tweet-state.json` got a commit — index should now be 1

### 6.3 Test Dev.to (dry-run first)

1. **Actions** → **Dev.to Auto-Publish**
2. Click **Run workflow**, dry_run = `true`
3. Should show the next article metadata

### 6.4 Test Dev.to (real publish)

**⚠️ This will publish a real article to your Dev.to account.** Make sure you're ready.

1. Same flow, dry_run = `false`
2. Watch it publish the first article
3. Check your Dev.to profile for the new post
4. Check `content/devto-state.json` got a commit

### 6.5 Test the Blog Build

1. **Actions** → **Build Blog**
2. Click **Run workflow**
3. It rebuilds `site/blog/` and commits if anything changed
4. If this is the first run, nothing changes (the blog was pre-built in the initial commit)

### 6.6 Test Weekly Hall of Gaps

**⚠️ This takes ~10 minutes to run.** It clones 50 repos and scans them all.

1. **Actions** → **Weekly Hall of Gaps**
2. Click **Run workflow**
3. Wait — grab coffee
4. When done, check that `content/hall-of-gaps.md` and `content/blog/2026-04-10-hall-of-gaps-*.md` got new content
5. Also check `content/hall-of-gaps-topics.json` — `current_index` should have advanced

## Step 7: Sit Back

That's it. The four systems are now running autonomously:

- Twitter posts happen at 9 AM and 5 PM Eastern (approximately — GitHub cron has small offsets)
- Dev.to posts happen Tuesdays and Fridays at 10 AM Eastern
- The blog rebuilds whenever you commit to `content/blog/`
- The weekly Hall of Gaps runs every Sunday at 6 AM Eastern, generating fresh content across rotating topics

## Content Lifecycle

You'll want to add more content over time. Here's how:

### Add Tweets
Edit `content/tweet-queue.json`. Append new tweet objects to the `tweets` array. The poster loops back to index 0 when it hits the end, so longer queues just delay the repeat cycle. Aim for 60+ tweets minimum.

### Add Dev.to Articles
Drop a new `.md` file in `content/devto/`. The publisher picks them up in filename order (hence the `01-`, `02-`, `03-` prefix). Format the frontmatter like the existing articles.

### Add Blog Posts
Drop a new `.md` file in `content/blog/`. The blog builder picks them up on the next push and regenerates `site/blog/`. Use YYYY-MM-DD prefixes for consistent ordering.

### Add Topics
Edit `content/hall-of-gaps-topics.json`. Append new `{ name, label }` objects to the `topics` array. The next weekly run picks up the new topic in rotation.

## Troubleshooting

### Twitter post fails with "Unauthorized"
Your access tokens were generated before you set the app to "Read and Write" permissions. Regenerate the access token and secret in the Twitter developer portal, then update the GitHub secrets.

### Dev.to publishes but tags are wrong
Dev.to only allows 4 tags per article. The publisher automatically truncates to 4. If you want specific tags, put them first in the `tags:` frontmatter.

### Weekly Hall of Gaps fails
Most common cause: `gh` CLI hitting rate limits on the runner. The workflow uses `GITHUB_TOKEN` which gets 1000 API calls/hour — usually plenty for 50 repos. If you hit limits, wait an hour and re-run, or add a personal access token with higher limits.

### State files getting out of sync
If `content/tweet-state.json` or `content/devto-state.json` gets corrupted, delete the file. The scripts will regenerate it starting from index 0.

## Cost

All of this is **free**:
- GitHub Actions: 2000 free minutes/month for public repos (you'll use ~100/month)
- Twitter Free tier: 500 posts/month (you'll use ~60/month)
- Dev.to API: Free, no rate limits for personal use
- Netlify: Free tier covers the blog
- Hall of Gaps scans: Use `GITHUB_TOKEN`, no additional cost

Total infrastructure cost: **$0/month**.

#!/usr/bin/env node
// Monthly adoption capture (metrics/README.md). Reads each component page's server
// payload for the counters the rendered page hides, plus the repo's GitHub numbers,
// and writes metrics/YYYY-MM-DD.json. Run: node scripts/capture-metrics.mjs
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const COMPONENTS = ['ink-hero', 'ease-atlas']
const USER = 'ryanonline1234'
const REPO = 'ryanonline1234/ease-atlas'

const num = (html, key) => {
  const m = html.match(new RegExp(`"${key}":\\s*(-?\\d+(?:\\.\\d+)?)`))
  return m ? Number(m[1]) : null
}

async function component(slug) {
  const url = `https://21st.dev/@${USER}/components/${slug}`
  const res = await globalThis.fetch(url, { headers: { 'user-agent': 'ease-atlas-metrics/1.0 (+https://github.com/' + REPO + ')' } })
  const raw = await res.text()
  const html = raw.replace(/\\"/g, '"')
  const metricsBlock = html.match(/"component_metrics":\{([^{}]*)\}/)?.[1] ?? ''
  const inBlock = (key) => num(metricsBlock, key)
  return {
    slug,
    url,
    http: res.status,
    view_count: inBlock('view_count'),
    code_copy_count: inBlock('code_copy_count'),
    prompt_copy_count: inBlock('prompt_copy_count'),
    cli_download_count: inBlock('cli_download_count'),
    downloads_count: num(html, 'downloads_count'),
    likes_count: num(html, 'likes_count'),
    bookmarks_count: num(html, 'bookmarks_count'),
    review_status: html.match(/"review_status":"([a-z_]+)"/)?.[1] ?? null,
    metrics_block_found: metricsBlock.length > 0,
  }
}

function github() {
  try {
    const out = execSync(`gh api repos/${REPO} --jq '{stars:.stargazers_count,forks:.forks_count,watchers:.subscribers_count,open_issues:.open_issues_count}'`, { encoding: 'utf8' })
    const base = JSON.parse(out)
    const issues = JSON.parse(execSync(`gh api "repos/${REPO}/issues?state=all&per_page=100" --jq '[.[] | select(.user.login != "${USER.split('/')[0]}")] | length'`, { encoding: 'utf8' }))
    return { ...base, issues_or_prs_from_others: issues }
  } catch (e) {
    return { error: String(e.message).split('\n')[0] }
  }
}

const date = new Date().toISOString().slice(0, 10)
const out = { captured_at: new Date().toISOString(), components: [], github: github() }
for (const slug of COMPONENTS) out.components.push(await component(slug))
fs.mkdirSync('metrics', { recursive: true })
const file = `metrics/${date}.json`
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
console.log(`wrote ${file}`)
for (const c of out.components)
  console.log(`  ${c.slug}: http ${c.http} views=${c.view_count} bookmarks=${c.bookmarks_count} cli=${c.cli_download_count} copies=${c.code_copy_count}/${c.prompt_copy_count} downloads=${c.downloads_count} review=${c.review_status} block=${c.metrics_block_found}`)
console.log('  github:', JSON.stringify(out.github))

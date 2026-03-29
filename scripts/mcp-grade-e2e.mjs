#!/usr/bin/env node
// Chrome DevTools MCP-based E2E: login -> students -> grades -> save -> chart
// Prereqs:
//  - Backend running at http://localhost:8000 (docker compose up)
//  - Frontend running at http://localhost:5173 (npm run dev) OR built+preview
//  - Chrome DevTools MCP installed (devDep in ./frontend)

import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const FRONTEND_DIR = path.join(process.cwd(), 'frontend')

function runCD(args, { json = false, quiet = false, env: envExtra } = {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn('npm', ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', ...args], {
      cwd: process.cwd(),
      stdio: json ? ['ignore', 'pipe', 'inherit'] : (quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit'),
      env: envExtra ? { ...process.env, ...envExtra } : process.env,
    })
    let out = ''
    if (json) {
      cp.stdout.on('data', (d) => (out += d.toString()))
    }
    cp.on('error', reject)
    cp.on('close', (code) => {
      if (code !== 0) return reject(new Error(`chrome-devtools ${args.join(' ')} exited with ${code}`))
      resolve(out)
    })
  })
}

async function startServer() {
  const browserUrl = process.env.MCP_BROWSER_URL
  const wsEndpoint = process.env.MCP_WS_ENDPOINT
  const skipStart = process.env.MCP_SKIP_START === '1'

  if (skipStart) {
    await runCD(['status'], { quiet: true })
    return
  }

  const args = ['start']
  if (browserUrl) args.push('--browserUrl', browserUrl)
  else if (wsEndpoint) args.push('--wsEndpoint', wsEndpoint)
  else args.push('--headless')

  try {
    await runCD(args, { quiet: true })
    await runCD(['status'], { quiet: true })
  } catch (e) {
    const msg = String(e?.message || e)
    if (/uv_os_get_passwd|ENOENT/i.test(msg)) {
      // Try again with preloaded os.userInfo stub
      const preload = path.resolve('scripts/polyfills/os-userinfo-stub.cjs')
      try {
        await runCD(args, { quiet: true, env: { NODE_OPTIONS: `--require ${preload}` } })
        await runCD(['status'], { quiet: true, env: { NODE_OPTIONS: `--require ${preload}` } })
        return
      } catch (e2) {
        throw new Error(
          '현재 환경에서 headless 데몬 시작이 제한되었습니다(패치 재시도 실패). 로컬에서 다음 중 하나로 실행한 뒤 재시도하세요:\n' +
          '  1) cd frontend && npm run mcp:chrome\n' +
          '  2) 자동 연결: cd frontend && npm run mcp:chrome:auto (chrome://inspect/#remote-debugging 활성화)\n' +
          '  3) 이미 실행 중인 Chrome에 연결: MCP_BROWSER_URL=http://127.0.0.1:9222 node scripts/mcp-grade-e2e.mjs'
        )
      }
    }
    throw e
  }
}

async function navigate(url) {
  await runCD(['new_page', url])
}

async function waitFor(text, timeoutMs = 30000) {
  await runCD(['wait_for', text, '--timeout', String(timeoutMs)], { quiet: true })
}

async function evalJSON(fnSource, args = []) {
  const out = await runCD(['evaluate_script', fnSource, '--args', JSON.stringify(args)], { json: true })
  try {
    return JSON.parse(out || 'null')
  } catch (e) {
    throw new Error(`Failed to parse evaluate_script output: ${out}`)
  }
}

async function clickByText(tag, text) {
  // Click first element whose textContent includes the text
  await evalJSON(`([tag, text]) => {
    const el = Array.from(document.querySelectorAll(tag)).find(e => (e.textContent||'').includes(text))
    if (!el) throw new Error('Element not found: ' + tag + ' contains ' + text)
    el.click();
    return true;
  }`, [tag, text])
}

async function setInput(selector, value) {
  await evalJSON(`([sel, val]) => {
    const el = document.querySelector(sel)
    if (!el) throw new Error('Input not found: ' + sel)
    el.focus();
    el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true;
  }`, [selector, value])
}

async function takeScreenshot(filePath, { fullPage = false } = {}) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await runCD(['take_screenshot', '--filePath', path.resolve(filePath), ...(fullPage ? ['--fullPage'] : [])])
}

async function main() {
  console.log('▶ Starting Chrome DevTools MCP server...')
  await startServer()

  console.log('▶ Open login page')
  await navigate('http://localhost:5173/login')
  await waitFor('Student Manager')

  console.log('▶ Submit login form')
  // Defaults are pre-filled; just click the submit button "로그인"
  await clickByText('button', '로그인')
  await waitFor('대시보드')

  console.log('▶ Go to students list')
  await runCD(['navigate_page', '--url', 'http://localhost:5173/students'])
  await waitFor('학생 목록')

  console.log('▶ Open first student grades page')
  // Click first "성적" link
  await evalJSON(`() => {
    const link = document.querySelector('a[href^="/grades/"]');
    if (!link) throw new Error('No grade link found')
    link.click();
    return link.getAttribute('href');
  }`)
  await waitFor('성적 관리')

  console.log('▶ Wait for grade table and set first score to 97 (rank 1)')
  await waitFor('점수')
  await setInput('table tbody tr:first-child td:nth-child(2) input', '97')

  console.log('▶ Save grades')
  await clickByText('button', '성적 저장')

  console.log('▶ Verify first row rank is 1')
  const rank = await evalJSON(`() => {
    const cell = document.querySelector('table tbody tr:first-child td:nth-child(3)')
    return cell ? (cell.textContent||'').trim() : null
  }`)
  if (rank !== '1') {
    throw new Error(`Expected rank '1' after save, got '${rank}'`)
  }
  console.log('✓ Rank verified: 1')

  console.log('▶ Switch to radar chart and take screenshot')
  await clickByText('button', '레이더 차트')
  await waitFor('점수')
  await takeScreenshot(path.join('frontend', 'e2e-artifacts', 'grades-chart.png'))
  console.log('✓ Screenshot saved to frontend/e2e-artifacts/grades-chart.png')
}

main().catch((err) => {
  console.error('\nE2E failed:', err?.message || err)
  process.exit(1)
})

#!/usr/bin/env node
// Minimal Chrome DevTools MCP health check
// - Verifies CLI availability
// - Checks daemon status
// - Optionally attempts a headless start and a smoke navigation/screenshot
// Note: In sandboxed CI, launching Chrome may be blocked.

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

const ROOT = process.cwd()
const FRONTEND_DIR = path.join(ROOT, 'frontend')

function sh(cmd, args = [], { json = false, quiet = false, env: envExtra } = {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn(cmd, args, {
      cwd: ROOT,
      env: envExtra ? { ...process.env, ...envExtra } : process.env,
      stdio: json ? ['ignore', 'pipe', 'inherit'] : (quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit'),
    })
    let out = ''
    if (json) cp.stdout.on('data', d => (out += d.toString()))
    cp.on('error', reject)
    cp.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
      resolve(out)
    })
  })
}

async function npmCd(...args) {
  return sh('npm', ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', ...args])
}

async function main() {
  console.log('▶ MCP Health: 시작')

  // 1) 설치 확인
  if (!existsSync(path.join(FRONTEND_DIR, 'node_modules', 'chrome-devtools-mcp'))) {
    console.error('✗ chrome-devtools-mcp가 설치되어 있지 않습니다. 다음을 실행하세요:\n  npm --prefix frontend install')
    process.exit(1)
  }

  // 2) CLI 동작 확인 (버전)
  try {
    await npmCd('--version')
    console.log('✓ CLI 확인: chrome-devtools 사용 가능')
  } catch (e) {
    console.error('✗ CLI 실행 실패:', e?.message || e)
    process.exit(1)
  }

  // 3) 데몬 상태 확인
  let isRunning = false
  try {
    const out = await sh('npm', ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', 'status'], { json: true })
    if (out && /daemon is running/i.test(out)) isRunning = true
    console.log(isRunning ? '✓ 데몬 상태: 실행 중' : '• 데몬 상태: 정지')
  } catch (e) {
    console.error('✗ 상태 확인 실패:', e?.message || e)
  }

  // 4) 실행 시도 (필요 시)
  if (!isRunning) {
    console.log('▶ 데몬 시작 시도: headless')
    try {
      await sh('npm', ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', 'start', '--headless'], { quiet: true })
      const out2 = await sh('npm', ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', 'status'], { json: true })
      if (out2 && /daemon is running/i.test(out2)) {
        console.log('✓ 데몬 시작됨')
        isRunning = true
      } else {
        console.log('• 데몬 시작 요청 후에도 실행 확인 불가')
      }
    } catch (e) {
      const msg = String(e?.message || e)
      if (/uv_os_get_passwd|ENOENT/i.test(msg)) {
        console.warn('• 시스템 제한으로 headless 시작 실패 (uv_os_get_passwd). 사전 로드 패치로 재시도합니다…')
        const preload = path.resolve('scripts/polyfills/os-userinfo-stub.cjs')
        try {
          await sh(
            'npm',
            ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', 'start', '--headless'],
            { quiet: true, env: { NODE_OPTIONS: `--require ${preload}` } }
          )
          const out3 = await sh('npm', ['--prefix', 'frontend', 'exec', '-s', 'chrome-devtools', 'status'], { json: true, env: { NODE_OPTIONS: `--require ${preload}` } })
          if (out3 && /daemon is running/i.test(out3)) {
            console.log('✓ 데몬 시작됨 (패치 적용)')
            isRunning = true
          } else {
            console.error('✗ 패치 적용 후에도 데몬 실행 확인 불가')
          }
        } catch (e2) {
          console.error('✗ 패치 적용 재시도 실패:', e2?.message || e2)
          console.error('→ 로컬 환경에서 다음 명령으로 실행하세요:\n  cd frontend && npm run mcp:chrome\n  또는 자동 연결: npm run mcp:chrome:auto')
        }
      } else {
        console.error('✗ 데몬 시작 실패:', msg)
      }
    }
  }

  // 5) 간단 동작 점검 (페이지 열기 + 스크린샷)
  if (isRunning) {
    console.log('▶ 간단 동작 점검: new_page + screenshot')
    try {
      const envPatched = isRunning ? {} : {}
      await npmCd('new_page', 'https://example.com')
      const outFile = path.join('frontend', 'e2e-artifacts', 'mcp-health.png')
      await mkdir(path.dirname(outFile), { recursive: true })
      await npmCd('take_screenshot', '--filePath', path.resolve(outFile))
      console.log('✓ 스크린샷 저장됨:', outFile)
      console.log('✓ MCP Chrome DevTools 정상 동작')
      return
    } catch (e) {
      console.error('✗ 동작 점검 실패:', e?.message || e)
    }
  }

  // 6) 최종 안내
  console.log('\n다음 순서로 로컬에서 재시도하세요:')
  console.log('1) Chrome(144+) 설치 및 실행 확인')
  console.log('2) 자동 연결: cd frontend && npm run mcp:chrome:auto  (Chrome에서 chrome://inspect/#remote-debugging 활성화 필요)')
  console.log('   또는 별도 Chrome 관리: npm run mcp:chrome')
  console.log('3) 이 스크립트를 다시 실행: node scripts/mcp-health.mjs')
  process.exit(2)
}

main().catch((e) => {
  console.error('치명적 오류:', e?.message || e)
  process.exit(1)
})

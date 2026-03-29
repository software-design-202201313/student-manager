// Patch os.userInfo to avoid uv_os_get_passwd ENOENT in sandboxed runtimes
try {
  const os = require('node:os')
  const orig = os.userInfo
  const safe = function safeUserInfo(options) {
    try {
      return orig.call(os, options)
    } catch (e) {
      // Fallback values
      const uid = typeof process.getuid === 'function' ? process.getuid() : 1000
      const gid = typeof process.getgid === 'function' ? process.getgid() : 1000
      return {
        uid,
        gid,
        username: process.env.USER || process.env.LOGNAME || 'user',
        homedir: process.env.HOME || process.cwd(),
        shell: process.env.SHELL || '/bin/sh',
      }
    }
  }
  Object.defineProperty(os, 'userInfo', { value: safe })
} catch (_) {
  // ignore
}


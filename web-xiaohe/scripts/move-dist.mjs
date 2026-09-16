import { access, lstat, realpath, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 将构建产物迁移至 Go 服务，先删除目标旧 dist。
 * @returns {Promise<void>} 迁移完成时返回；校验或文件操作失败时抛出错误。
 */
async function moveDist() {
  const frontendRoot = fileURLToPath(new URL('../', import.meta.url))
  const projectRoot = await realpath(path.resolve(frontendRoot, '..'))
  const serverRoot = path.join(projectRoot, 'xiaohe-server')
  const sourceDist = path.join(frontendRoot, 'dist')
  const targetDist = path.join(serverRoot, 'dist')

  // 删除前确认目标父目录是真实服务目录，避免通过 symlink 操作项目外路径。
  if ((await realpath(serverRoot)) !== serverRoot) {
    throw new Error('xiaohe-server 不得为 symlink 目录')
  }
  if (!(await lstat(sourceDist)).isDirectory()) {
    throw new Error('构建产物 dist 必须为真实目录')
  }
  await access(path.join(sourceDist, 'index.html'))
  await rm(targetDist, { recursive: true, force: true })
  await rename(sourceDist, targetDist)
  console.log('构建产物已移动至 xiaohe-server/dist')
}

await moveDist()

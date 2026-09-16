/**
 * 按官方兼容思路通过临时 textarea 复制，支持未提供 Clipboard API 的 HTTP 环境。
 * @param text 待复制文本
 * @returns execCommand 是否成功执行复制
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textarea = document.createElement('textarea')
  const activeElement = document.activeElement
  textarea.value = text
  // 复用 Tailwind 的无障碍隐藏工具类，不引入内嵌样式。
  textarea.className = 'sr-only'
  textarea.setAttribute('readonly', '')
  document.body.appendChild(textarea)
  try {
    textarea.focus({ preventScroll: true })
    textarea.select()
    // 与官方一致，补充 iOS 的选区处理。
    const range = document.createRange()
    range.selectNodeContents(textarea)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    textarea.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
    window.getSelection()?.removeAllRanges()
    if (activeElement instanceof HTMLElement) activeElement.focus({ preventScroll: true })
  }
}

/**
 * 优先 Clipboard API，失败或不可用时降级复制；不支持的环境返回失败。
 * @param text 待复制文本
 * @returns Promise<boolean> 表示复制是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (window.navigator.clipboard?.writeText) {
    try {
      await window.navigator.clipboard.writeText(text)
      return true
    } catch {
      // 权限拒绝或其他 Clipboard API 异常时继续尝试官方降级方案。
    }
  }
  return fallbackCopyToClipboard(text)
}

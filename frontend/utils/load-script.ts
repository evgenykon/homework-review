export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-src="${src}"]`)

    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.src = src
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)))
    document.head.appendChild(script)
  })
}

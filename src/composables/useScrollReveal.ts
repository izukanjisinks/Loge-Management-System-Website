import { type Ref, onMounted, onUnmounted } from 'vue'

export function useScrollReveal(root: Ref<HTMLElement | null> | null = null) {
  let intersectionObserver: IntersectionObserver
  let mutationObserver: MutationObserver

  function observe(el: Element) {
    if (!el.classList.contains('visible')) {
      intersectionObserver.observe(el)
    }
  }

  onMounted(() => {
    const target: Document | HTMLElement = root?.value ?? document

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            intersectionObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    target.querySelectorAll('.reveal').forEach(observe)

    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return
          const el = node as HTMLElement
          if (el.classList?.contains('reveal')) observe(el)
          el.querySelectorAll?.('.reveal').forEach(observe)
        })
      })
    })

    mutationObserver.observe(target === document ? document.body : target as HTMLElement, {
      childList: true,
      subtree: true,
    })
  })

  onUnmounted(() => {
    intersectionObserver?.disconnect()
    mutationObserver?.disconnect()
  })
}

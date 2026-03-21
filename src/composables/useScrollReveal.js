import { onMounted, onUnmounted } from 'vue'

export function useScrollReveal(root = null) {
  let intersectionObserver
  let mutationObserver

  function observe(el) {
    if (!el.classList.contains('visible')) {
      intersectionObserver.observe(el)
    }
  }

  onMounted(() => {
    const target = root?.value ?? document

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

    // Observe elements already in the DOM
    target.querySelectorAll('.reveal').forEach(observe)

    // Watch for new .reveal elements added after async data loads
    mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return
          if (node.classList?.contains('reveal')) observe(node)
          node.querySelectorAll?.('.reveal').forEach(observe)
        })
      })
    })

    mutationObserver.observe(target === document ? document.body : target, {
      childList: true,
      subtree: true,
    })
  })

  onUnmounted(() => {
    intersectionObserver?.disconnect()
    mutationObserver?.disconnect()
  })
}
import { onMounted, onUnmounted } from 'vue'

/**
 * Attach scroll-reveal behaviour to elements with class `.reveal`
 * inside a given root element (defaults to document).
 *
 * Usage:
 *   useScrollReveal()                   // on any view
 *   useScrollReveal(containerRef)       // scoped to a ref
 */
export function useScrollReveal(root = null) {
  let observer

  onMounted(() => {
    const target = root?.value ?? document
    const elements = target.querySelectorAll('.reveal')

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            // Stagger each element slightly based on its index in the list
            setTimeout(() => {
              entry.target.classList.add('visible')
            }, i * 80)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    elements.forEach((el) => observer.observe(el))
  })

  onUnmounted(() => observer?.disconnect())
}

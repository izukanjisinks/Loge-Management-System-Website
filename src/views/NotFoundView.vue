<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
    <p class="font-sans text-xs font-semibold tracking-[0.22em] uppercase text-(--color-primary) mb-3">
      404
    </p>
    <h1 class="font-serif text-4xl text-(--color-on-surface) mb-3">
      This path leads nowhere
    </h1>
    <p class="font-sans text-sm text-(--color-on-muted) mb-8 max-w-xs leading-relaxed">
      The page you're looking for has wandered off into the forest.
    </p>
    <RouterLink
      to="/"
      class="inline-flex items-center gap-2 font-sans text-sm text-(--color-primary) hover:underline"
    >
      <span class="material-symbols-outlined text-base">arrow_back</span>
      Return home
    </RouterLink>
  </div>
</template>

/** Unique name for View Transitions API — morphs cover from list to details. */
export function bookCoverTransitionName(userBookId: number): string {
  return `book-cover-${userBookId}`
}

export function navigateWithTransition(navigate: () => void): void {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    document.startViewTransition(navigate)
  } else {
    navigate()
  }
}

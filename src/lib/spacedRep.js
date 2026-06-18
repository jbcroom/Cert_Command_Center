// SM-2 algorithm — pure function, no side effects
// quality: 1=Again, 3=Hard, 4=Good, 5=Easy
export function calculateNextReview(quality, currentInterval, currentEaseFactor, reviewCount) {
  const newEaseFactor = Math.max(
    1.3,
    currentEaseFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  let newInterval
  if (quality < 3) {
    newInterval = 1
  } else if (reviewCount <= 1) {
    newInterval = 1
  } else if (reviewCount === 2) {
    newInterval = 6
  } else {
    newInterval = Math.round(currentInterval * newEaseFactor)
  }

  const newReviewCount = quality < 3 ? 1 : reviewCount + 1

  const next = new Date()
  next.setDate(next.getDate() + newInterval)
  const nextReviewAt = next.toISOString().split('T')[0]

  return { newInterval, newEaseFactor, newReviewCount, nextReviewAt }
}

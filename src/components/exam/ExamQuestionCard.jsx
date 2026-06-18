import { useMemo } from 'react'

function shuffle(arr, seed) {
  // Fisher-Yates using the question id as a stable seed so the order
  // doesn't change on re-render but does differ between questions
  const a = [...arr.map((text, i) => ({ text, originalIndex: i }))]
  let h = [...seed].reduce((acc, c) => Math.imul(31, acc) + c.charCodeAt(0) | 0, 0)
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h ^= h >>> 16
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function ExamQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,        // index into the SHUFFLED options array, or null
  onSelect,             // (shuffledIndex, originalIndex) => void
  showResult = false,   // true on review screen — reveals correct/incorrect
}) {
  const shuffled = useMemo(() => shuffle(question.options, question.id), [question])
  const correctShuffledIndex = shuffled.findIndex(o => o.originalIndex === question.correct_index)

  function handleSelect(si) {
    if (showResult) return
    onSelect(si, shuffled[si].originalIndex)
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted capitalize">{question.difficulty || 'medium'}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted">{question.domain_name}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-blue rounded-full transition-all"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question text */}
      <p className="text-text-primary text-base leading-relaxed">{question.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {shuffled.map((opt, si) => {
          const isSelected = selectedIndex === si
          const isCorrect = si === correctShuffledIndex

          let style = 'border-bg-elevated text-text-primary hover:border-accent-blue/50 hover:bg-bg-elevated/50 cursor-pointer'
          if (showResult) {
            if (isCorrect) style = 'border-success/60 bg-success/10 text-success cursor-default'
            else if (isSelected && !isCorrect) style = 'border-danger/60 bg-danger/10 text-danger cursor-default'
            else style = 'border-bg-elevated text-text-muted cursor-default opacity-60'
          } else if (isSelected) {
            style = 'border-accent-blue bg-accent-blue/10 text-text-primary cursor-pointer'
          }

          const letter = String.fromCharCode(65 + si)

          return (
            <button
              key={si}
              onClick={() => handleSelect(si)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${style}`}
            >
              <span className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium mt-0.5 ${
                showResult && isCorrect ? 'border-success text-success' :
                showResult && isSelected ? 'border-danger text-danger' :
                isSelected ? 'border-accent-blue bg-accent-blue text-white' :
                'border-current'
              }`}>
                {letter}
              </span>
              <span className="text-sm leading-relaxed">{opt.text}</span>
            </button>
          )
        })}
      </div>

      {/* Explanation (review mode only) */}
      {showResult && question.explanation && (
        <div className="bg-bg-elevated rounded-lg px-4 py-3 text-xs text-text-muted leading-relaxed border-l-2 border-accent-teal">
          <span className="text-accent-teal font-medium">Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  )
}

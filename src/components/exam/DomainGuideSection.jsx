import { useState } from 'react'
import { RefreshCw, AlertTriangle, Clock } from 'lucide-react'
import { generateGuideSection, isSectionStale } from '../../lib/studyGuide'

const SECTION_LABELS = {
  overview:        'Overview',
  exam_focus:      'Exam Focus',
  key_concepts:    'Key Concepts',
  ai_explanation:  'Concept Explanations',
  common_pitfalls: 'Common Pitfalls',
}

const SECTION_ORDER = ['overview', 'exam_focus', 'key_concepts', 'ai_explanation', 'common_pitfalls']

function StalenessWarning({ section }) {
  if (!isSectionStale(section)) return null
  const date = new Date(section.generated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
      <AlertTriangle size={12} className="flex-shrink-0" />
      Content generated {date} — may be outdated. Check the official exam guide before your exam.
    </div>
  )
}

function KeyConceptsList({ content }) {
  const items = content.split(',').map(s => s.trim()).filter(Boolean)
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item} className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue text-xs rounded-full border border-accent-blue/20 font-medium">
          {item}
        </span>
      ))}
    </div>
  )
}

function ExamFocusList({ content }) {
  const lines = content.split('\n').filter(l => l.trim())
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => {
        const text = line.replace(/^[-•]\s*/, '')
        return (
          <li key={i} className="flex items-start gap-2 text-sm text-text-primary leading-relaxed">
            <span className="text-accent-blue mt-1 flex-shrink-0">·</span>
            <span>{text}</span>
          </li>
        )
      })}
    </ul>
  )
}

function MarkdownContent({ content }) {
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-text-primary mt-4 mb-1.5">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-base font-semibold text-text-primary mt-4 mb-2">{line.slice(2)}</h2>)
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-bg-elevated my-3" />)
    } else if (line.match(/^\d+\.\s/)) {
      const items = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(<li key={i} className="text-sm text-text-primary leading-loose">{lines[i].replace(/^\d+\.\s/, '')}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal ml-5 space-y-1.5 my-3">{items}</ol>)
      continue
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i} className="text-sm text-text-primary leading-loose">{lines[i].slice(2)}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc ml-5 space-y-1 my-3">{items}</ul>)
      continue
    } else if (line.trim()) {
      const rendered = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-bg-elevated px-1 py-0.5 rounded text-accent-teal text-xs font-mono">$1</code>')
      elements.push(
        <p key={i} className="text-sm text-text-primary leading-loose"
          dangerouslySetInnerHTML={{ __html: rendered }} />
      )
    }
    i++
  }
  return <div className="space-y-3">{elements}</div>
}

function SectionBlock({ section, certId, domainName, onRegenerated }) {
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState(null)
  const label = SECTION_LABELS[section.section_type] || section.section_type

  async function handleRegenerate() {
    setRegenerating(true)
    setError(null)
    try {
      await generateGuideSection(certId, domainName, section.section_type)
      onRegenerated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        <div className="flex items-center gap-2">
          {section.is_ai_generated && section.generated_at && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Clock size={10} />
              {new Date(section.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {section.is_ai_generated && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-blue transition-colors disabled:opacity-40"
            >
              <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
              {regenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      <StalenessWarning section={section} />

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {section.section_type === 'key_concepts' ? (
        <KeyConceptsList content={section.content} />
      ) : section.section_type === 'exam_focus' ? (
        <ExamFocusList content={section.content} />
      ) : (
        <MarkdownContent content={section.content} />
      )}
    </div>
  )
}

function GenerateButton({ certId, domainName, sectionType, onGenerated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const label = SECTION_LABELS[sectionType]

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      await generateGuideSection(certId, domainName, sectionType)
      onGenerated?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-muted">{label}</h3>
      </div>
      <div className="px-4 py-5 bg-bg-elevated/50 rounded-xl border border-bg-elevated border-dashed flex flex-col items-center gap-3 text-center">
        <p className="text-xs text-text-muted">AI-generated content not yet created for this section.</p>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-medium hover:bg-accent-blue/20 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating…' : `Generate ${label}`}
        </button>
      </div>
    </div>
  )
}

export default function DomainGuideSection({ cert, domainName, sections, onRefresh }) {
  const sectionMap = Object.fromEntries(sections.map(s => [s.section_type, s]))

  return (
    <div className="space-y-6">
      {SECTION_ORDER.map(type => {
        const section = sectionMap[type]
        const isAiType = type === 'ai_explanation' || type === 'common_pitfalls'

        if (section) {
          return (
            <div key={type}>
              <SectionBlock
                section={section}
                certId={cert.id}
                domainName={domainName}
                onRegenerated={onRefresh}
              />
              {type !== 'common_pitfalls' && <div className="border-t border-bg-elevated mt-6" />}
            </div>
          )
        }

        if (isAiType) {
          return (
            <div key={type}>
              <GenerateButton
                certId={cert.id}
                domainName={domainName}
                sectionType={type}
                onGenerated={onRefresh}
              />
              {type !== 'common_pitfalls' && <div className="border-t border-bg-elevated mt-6" />}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toolsByGroup } from '@/tools/registry'

const trustFacts = ['No accounts', 'No uploads', 'No tracking']

function ToolGroupDetails({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <details
      className="tool-group"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="tool-group__summary">
        <span>{label}</span>
        <svg
          className="tool-group__chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 3.5L11 8l-5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      {children}
    </details>
  )
}

export function HomePage() {
  return (
    <div>
      <div className="home-hero">
        <h1 className="home-hero__brand">GJB Toolbox</h1>
        <p className="home-hero__tagline">
          Small browser utilities that run entirely in this tab. Paste, get
          your answer, and go — nothing you enter is sent anywhere.
        </p>
        <ul className="trust-pills">
          {trustFacts.map((fact) => (
            <li key={fact} className="trust-pills__item">
              {fact}
            </li>
          ))}
        </ul>
        <p className="home-hero__origin">
          I built this after getting stuck on apps that only accept tax invoices as images — I had a PDF...
        </p>
      </div>
      <div className="tool-groups">
        {toolsByGroup().map(({ group, tools: groupTools }) => (
          <ToolGroupDetails key={group.id} label={group.label}>
            <ul className="tool-list">
              {groupTools.map((t) => (
                <li key={t.id} className="tool-row">
                  <Link to={`/tools/${t.id}`} className="tool-row__link">
                    <span className="tool-row__body">
                      <span className="tool-row__title">{t.title}</span>
                      <span className="tool-row__description">
                        {t.description}
                      </span>
                    </span>
                    <span className="tool-row__path" aria-hidden="true">
                      /tools/{t.id}
                    </span>
                    <svg
                      className="tool-row__chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 3.5L11 8l-5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </ToolGroupDetails>
        ))}
      </div>
    </div>
  )
}

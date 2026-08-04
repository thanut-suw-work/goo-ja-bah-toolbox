import { Link } from 'react-router-dom'
import { tools } from '@/tools/registry'

const trustFacts = ['No accounts', 'No uploads', 'No tracking']

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
      </div>
      <hr className="home-divider" />
      <ul className="tool-list">
        {tools.map((t) => (
          <li key={t.id} className="tool-row">
            <Link to={`/tools/${t.id}`} className="tool-row__link">
              <span className="tool-row__body">
                <span className="tool-row__title">{t.title}</span>
                <span className="tool-row__description">{t.description}</span>
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
    </div>
  )
}

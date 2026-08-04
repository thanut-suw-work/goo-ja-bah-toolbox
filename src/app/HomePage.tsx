import { Link } from 'react-router-dom'
import { tools } from '@/tools/registry'

export function HomePage() {
  return (
    <div>
      <h1>GJB Toolbox</h1>
      <p>Local browser utilities. Nothing leaves your machine.</p>
      <ul>
        {tools.map((t) => (
          <li key={t.id}>
            <Link to={`/tools/${t.id}`}>
              <span>{t.title}</span>
              <span>{t.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

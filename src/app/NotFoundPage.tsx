import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>Not found</h1>
      <Link to="/">Back home</Link>
    </div>
  )
}

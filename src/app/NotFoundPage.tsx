import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div>
      <h1>Not found</h1>
      <Link to="/">Back home</Link>
    </div>
  )
}

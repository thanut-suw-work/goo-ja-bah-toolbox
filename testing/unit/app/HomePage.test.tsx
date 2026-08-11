import '@testing-library/jest-dom/vitest'

import { render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '@/app/HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

function detailsFor(label: string): HTMLDetailsElement {
  for (const summary of document.querySelectorAll('summary')) {
    if (summary.textContent?.trim() === label) {
      const details = summary.closest('details')
      if (details) return details
    }
  }
  throw new Error(`no details for ${label}`)
}

describe('HomePage', () => {
  it('renders four open groups with catalog labels', () => {
    renderHome()
    for (const label of ['Text', 'IDs & time', 'Files', 'Diagrams']) {
      expect(detailsFor(label)).toHaveAttribute('open')
    }
  })

  it('puts JSON formatter under Text and PlantUML under Diagrams', () => {
    renderHome()
    expect(
      within(detailsFor('Text')).getByRole('link', {
        name: /JSON formatter/i,
      }),
    ).toHaveAttribute('href', '/tools/json-formatter')
    expect(
      within(detailsFor('Diagrams')).getByRole('link', {
        name: /PlantUML/i,
      }),
    ).toHaveAttribute('href', '/tools/plantuml')
    expect(
      within(detailsFor('Text')).queryByRole('link', { name: /PlantUML/i }),
    ).toBeNull()
  })

  it('states that theme stays and paste does not', () => {
    renderHome()
    expect(document.body.textContent).toMatch(
      /Theme choice stays in this browser\. Everything you paste still dies on refresh\./,
    )
  })

  it('lets the user collapse a group', async () => {
    const user = userEvent.setup()
    renderHome()
    const text = detailsFor('Text')
    const summary = text.querySelector('summary')
    if (!summary) throw new Error('no summary for Text')
    await user.click(summary)
    expect(text).not.toHaveAttribute('open')
    expect(detailsFor('Diagrams')).toHaveAttribute('open')
  })
})

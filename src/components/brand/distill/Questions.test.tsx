import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GapQuestions } from './Questions'

describe('the gap questions', () => {
  it('fill in the answers the run already holds (CON-477)', () => {
    render(
      <GapQuestions
        questions={[
          {
            id: 'q1',
            text: 'Who is it not for?',
            section: 'audiences',
            why: '',
          },
          {
            id: 'q2',
            text: 'A word you never use?',
            section: 'guardrails',
            why: '',
          },
        ]}
        answered={[
          {
            questionId: 'q1',
            question: 'Who is it not for?',
            answer: 'Families',
          },
          // An answer to a question this round doesn't ask fills nothing.
          { questionId: 'q9', question: 'Old', answer: 'Gone' },
        ]}
        route="document"
        busy={false}
        onAsk={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByLabelText('Who is it not for?')).toHaveProperty(
      'value',
      'Families',
    )
    expect(screen.getByLabelText('A word you never use?')).toHaveProperty(
      'value',
      '',
    )
    expect(
      screen.getByText('2 questions · answers fill in as you confirm'),
    ).toBeTruthy()
    expect(screen.getAllByPlaceholderText('Your answer…')).toHaveLength(2)
  })
})

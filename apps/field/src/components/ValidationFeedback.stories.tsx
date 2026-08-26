import type { Meta, StoryObj } from '@storybook/react-vite'

import { ValidationFeedback } from './ValidationFeedback'

const meta = {
  title: 'Field/Validation feedback',
  component: ValidationFeedback,
  args: {
    id: 'record-validation-bp',
  },
} satisfies Meta<typeof ValidationFeedback>

export default meta

type Story = StoryObj<typeof meta>

export const BroodPatchConflict: Story = {
  args: {
    message: 'Sex=M conflicts with Brood Patch 3/4',
  },
}

export const MeasurementOutOfRange: Story = {
  args: {
    id: 'record-validation-wing',
    message: 'Wing 40 outside expected female range (52–83)',
  },
}

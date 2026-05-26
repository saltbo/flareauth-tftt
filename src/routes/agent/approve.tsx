import { createFileRoute } from '@tanstack/react-router'
import { AgentApproval } from '@/features/agents/agent-approval'
import { requireAccountProfile } from '../-auth'

export const Route = createFileRoute('/agent/approve')({
  beforeLoad: async ({ location }) => {
    await requireAccountProfile(location.href)
  },
  component: AgentApproval,
})

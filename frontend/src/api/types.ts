export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type UserRef = { id: number; username: string; first_name: string; last_name: string; email: string }

export type Account = {
  id: number
  name: string
  parent_account: { id: number; name: string } | null
  website: string
  industry: string
  owner: UserRef
  created_by: UserRef
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: number
  name: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  start_date: string | null
  end_date: string | null
  budget: string
  created_at: string
  updated_at: string
}

export type Lead = {
  id: number
  first_name: string
  last_name: string
  company: string
  title: string
  email: string
  phone: string
  status: 'new' | 'working' | 'qualified' | 'disqualified' | 'converted'
  source: 'campaign' | 'web' | 'email' | 'phone' | 'referral' | 'other'
  campaign: number | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export type Contact = {
  id: number
  first_name: string
  last_name: string
  account_name: string
  account: { id: number; name: string } | null
  title: string
  email: string
  phone: string
  manager: { id: number; first_name: string; last_name: string; email: string } | null
  relationship_tag: 'decision_maker' | 'influencer' | 'blocker' | 'unknown'
  created_at: string
  updated_at: string
}

export type Product = {
  id: number
  sku: string
  name: string
  description: string
  active: boolean
  currency: string
  unit_price: string
  tax_rate: string
  created_at: string
  updated_at: string
}

export type Opportunity = {
  id: number
  name: string
  account_name: string
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  amount: string
  close_date: string | null
  lead: number | null
  campaign: number | null
  primary_contact: Contact | null
  contacts: OpportunityContactLink[]
  line_items: OpportunityLineItem[]
  created_at: string
  updated_at: string
}

export type OpportunityContactLink = {
  id: number
  contact: Contact
  role: 'primary' | 'decision_maker' | 'influencer' | 'other'
}

export type OpportunityLineItem = {
  id: number
  opportunity: number
  product: number
  product_sku: string
  product_name: string
  quantity: number
  unit_price: string
  discount_pct: string
  subtotal: string
  discount_amount: string
  total: string
}

export type Case = {
  id: number
  subject: string
  description: string
  status: 'new' | 'in_progress' | 'waiting_on_customer' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  contact: number
  product: number | null
  sla_minutes: number
  sla_due_at: string
  sla_remaining_seconds: number
  sla_breached: boolean
  created_at: string
  updated_at: string
}

export type LeadConversion = {
  id: number
  contact: Contact
  opportunity: Opportunity
  converted_at: string
}

export type Incident = {
  id: number
  title: string
  description: string
  status: 'open' | 'investigating' | 'mitigating' | 'resolved'
  severity: 'sev1' | 'sev2' | 'sev3' | 'sev4'
  created_at: string
  updated_at: string
}

export type IncidentMessage = {
  id: number
  incident: number
  author: UserRef
  message: string
  created_at: string
  updated_at: string
}

export type Attachment = {
  id: number
  content_type: number
  object_id: number
  filename: string
  file_url: string
  uploaded_by: UserRef
  created_at: string
  updated_at: string
}

export type AuditLog = {
  id: number
  created_at: string
  actor: UserRef
  action: 'create' | 'update' | 'delete'
  entity_type: string
  entity_id: number
  entity_label: string
  changes: Record<string, unknown>
}

export type GamificationBadge = {
  id: number
  module: 'sales' | 'service' | 'marketing'
  name: string
  description: string
  icon: string
  color_primary: string
  color_secondary: string
  created_at: string
  updated_at: string
}

export type GamificationChallenge = {
  id: number
  module: 'sales' | 'service' | 'marketing'
  mode: 'individual' | 'team'
  name: string
  description: string
  start_at: string
  end_at: string
  target_points: number
  rules: Array<{ entity_type: string; action: string; points: number }>
  reward_title: string
  reward_badge: GamificationBadge | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type GamificationChallengeProgress = {
  challenge_id: number
  mode: 'individual' | 'team'
  joined: boolean
  team_id: number | null
  points: number
  events_count: number
  target_points: number
  percent: number
  badge_awarded: boolean
}

export type GamificationBadgeAward = {
  id: number
  created_at: string
  badge: GamificationBadge
  challenge: number | null
  points_at_award: number
}

export type KnowledgeArticle = {
  id: number
  title: string
  summary: string
  content: string
  tags: string
  status: 'draft' | 'published' | 'archived'
  created_by: UserRef
  updated_by: UserRef
  created_at: string
  updated_at: string
}

export type ArticleLink = {
  id: number
  created_at: string
  article: KnowledgeArticle
}

export type Template = {
  id: number
  name: string
  type: 'email' | 'signature' | 'mailmerge' | 'word'
  subject: string
  body: string
  is_active: boolean
  created_by: UserRef
  updated_by: UserRef
  created_at: string
  updated_at: string
}

export type ReportDefinition = {
  id: number
  name: string
  entity_type: string
  columns: string[]
  filters: Array<{ field: string; op: 'eq' | 'contains' | 'gte' | 'lte' | 'in'; value: unknown }>
  is_shared: boolean
  created_by: UserRef
  updated_by: UserRef
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_staff: boolean
  is_active: boolean
  groups: string[]
}

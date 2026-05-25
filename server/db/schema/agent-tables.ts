import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth-tables'

export const agentHost = sqliteTable(
  'agent_host',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    defaultCapabilities: text('default_capabilities'),
    publicKey: text('public_key'),
    kid: text('kid'),
    jwksUrl: text('jwks_url'),
    enrollmentTokenHash: text('enrollment_token_hash'),
    enrollmentTokenExpiresAt: integer('enrollment_token_expires_at', { mode: 'timestamp_ms' }),
    status: text('status').notNull().default('active'),
    activatedAt: integer('activated_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('agentHost_userId_idx').on(table.userId),
    index('agentHost_kid_idx').on(table.kid),
    index('agentHost_enrollmentTokenHash_idx').on(table.enrollmentTokenHash),
    index('agentHost_status_idx').on(table.status),
  ],
)

export const agent = sqliteTable(
  'agent',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    hostId: text('host_id')
      .notNull()
      .references(() => agentHost.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('active'),
    mode: text('mode').notNull().default('delegated'),
    publicKey: text('public_key').notNull(),
    kid: text('kid'),
    jwksUrl: text('jwks_url'),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    activatedAt: integer('activated_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('agent_userId_idx').on(table.userId),
    index('agent_hostId_idx').on(table.hostId),
    index('agent_status_idx').on(table.status),
    index('agent_kid_idx').on(table.kid),
  ],
)

export const agentCapabilityGrant = sqliteTable(
  'agent_capability_grant',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agent.id, { onDelete: 'cascade' }),
    capability: text('capability').notNull(),
    deniedBy: text('denied_by').references(() => user.id, { onDelete: 'cascade' }),
    grantedBy: text('granted_by').references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    status: text('status').notNull().default('active'),
    reason: text('reason'),
    constraints: text('constraints', { mode: 'json' }).$type<Record<string, unknown>>(),
  },
  (table) => [
    index('agentCapabilityGrant_agentId_idx').on(table.agentId),
    index('agentCapabilityGrant_capability_idx').on(table.capability),
    index('agentCapabilityGrant_grantedBy_idx').on(table.grantedBy),
    index('agentCapabilityGrant_status_idx').on(table.status),
  ],
)

export const approvalRequest = sqliteTable(
  'approval_request',
  {
    id: text('id').primaryKey(),
    method: text('method').notNull(),
    agentId: text('agent_id').references(() => agent.id, { onDelete: 'cascade' }),
    hostId: text('host_id').references(() => agentHost.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    capabilities: text('capabilities'),
    status: text('status').notNull().default('pending'),
    userCodeHash: text('user_code_hash'),
    loginHint: text('login_hint'),
    bindingMessage: text('binding_message'),
    clientNotificationToken: text('client_notification_token'),
    clientNotificationEndpoint: text('client_notification_endpoint'),
    deliveryMode: text('delivery_mode'),
    interval: integer('interval').notNull(),
    lastPolledAt: integer('last_polled_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('approvalRequest_agentId_idx').on(table.agentId),
    index('approvalRequest_hostId_idx').on(table.hostId),
    index('approvalRequest_userId_idx').on(table.userId),
    index('approvalRequest_status_idx').on(table.status),
  ],
)

export const uploadedAsset = sqliteTable(
  'uploaded_asset',
  {
    id: text('id').primaryKey(),
    purpose: text('purpose').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    publicUrl: text('public_url'),
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    checksumSha256: text('checksum_sha256'),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index('uploadedAsset_purpose_idx').on(table.purpose),
    index('uploadedAsset_createdByUserId_idx').on(table.createdByUserId),
  ],
)

export type ZernioState = 'disabled' | 'degraded' | 'ok'

export type ZernioHealth = {
  enabled: boolean
  state: ZernioState
  profileId?: string
  lastSyncAt?: string
  lastSyncStatus?: string
  accountCount: number
}

export type ZernioAccount = {
  id: string
  platform: string
  username: string
  displayName: string
  avatarUrl: string
  isActive: boolean
  connectedAt: string
  lastSyncedAt: string
}

export type ZernioAccountsResponse = {
  accounts: ZernioAccount[]
  lastSyncAt?: string
  lastSyncStatus?: string
}

export type ConnectLinkResponse = {
  platform: string
  connectUrl: string
  expiresAt: string
}

/**
 * What kind of thing a connect target is (CON-217). Purely a label for the
 * picker: "Company page" reads very differently from "Your personal profile"
 * when both are in the same list, and the id alone says nothing.
 *
 * Optional on the wire — the backend stamps a default per platform but can't
 * always classify — so the badge is omitted rather than guessed.
 */
export type ConnectTargetKind = 'organization' | 'page' | 'personal'

/**
 * One thing the authorized account could publish as: a Facebook Page, a
 * LinkedIn organization, the personal profile (CON-217).
 *
 * Display fields only. The Zernio tokens that make the selection work are held
 * server-side for the 15 minutes the session lives and never cross to the
 * browser — which is half the point of the headless flow.
 */
export type ConnectTarget = {
  id: string
  name: string
  kind?: ConnectTargetKind
  username?: string
  avatarUrl?: string
}

/** The choice awaiting the user, keyed by an opaque single-use connection id. */
export type PendingConnection = {
  /** Zernio's platform id (`linkedin`, `facebook`, …), not our internal one. */
  platform: string
  options: ConnectTarget[]
}

export type ZernioErrorCode =
  | 'integration_disabled'
  | 'integration_degraded'
  | 'rate_limited'
  | 'invalid_platform'
  // Disconnect only (CON-133). `account_not_found` also covers "already
  // disconnected" — the server can't tell the two apart and neither can we.
  | 'account_not_found'
  | 'account_has_scheduled_posts'
  // The headless connect picker (CON-217). `connection_not_found` is the only
  // answer the server gives for unknown, expired, already-used *and*
  // another tenant's connection — deliberately, so the id can't be probed. To
  // the user all four mean the same thing: start the connect again.
  | 'connection_not_found'
  | 'invalid_target'
  | 'unknown'

export class ZernioError extends Error {
  code: ZernioErrorCode
  status: number
  retryAfterSeconds?: number
  /**
   * Only set alongside `account_has_scheduled_posts`: how many scheduled posts
   * still publish as the account, which the confirm dialog shows before
   * offering to force the disconnect.
   */
  scheduledPosts?: number

  constructor(
    code: ZernioErrorCode,
    status: number,
    message: string,
    extra?: { retryAfterSeconds?: number; scheduledPosts?: number },
  ) {
    super(message)
    this.name = 'ZernioError'
    this.code = code
    this.status = status
    this.retryAfterSeconds = extra?.retryAfterSeconds
    this.scheduledPosts = extra?.scheduledPosts
  }
}

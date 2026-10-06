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

/* ------------------------------------------------------------------------ *
 * Figma plugin (CON-338/339): the pairing a plugin asks the user to approve,
 * and the connections that approval leaves behind.
 * ------------------------------------------------------------------------ */

/**
 * Where a pairing is in the handshake. Expiry is not a status — an expired or
 * already-collected pairing is simply gone, and the preview answers 410.
 */
export type PluginPairingStatus = 'pending' | 'approved' | 'denied'

/** What the approval page shows before the user allows or denies the plugin. */
export type PluginPairingPreview = {
  client: string
  /** Chosen by the plugin, e.g. "Figma · Jane Doe" — the plugin's word, not ours. */
  client_label: string
  status: PluginPairingStatus
  /** The address the plugin asked from, so a pairing you didn't start looks foreign. */
  created_ip: string
  created_at: string
  expires_at: string
}

/** The member a connection acts as. Sent on every row of the list. */
export type PluginConnectionUser = {
  id: string
  name: string
  email?: string
}

/** One plugin install that holds a token for this workspace. */
export type PluginConnection = {
  id: string
  client: string
  label: string
  user?: PluginConnectionUser
  created_at: string
  /** Null until the plugin first calls the API with its token. */
  last_used_at: string | null
}

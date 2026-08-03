export type ZernioState = "disabled" | "degraded" | "ok";

export type ZernioHealth = {
  enabled: boolean;
  state: ZernioState;
  profileId?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  accountCount: number;
};

export type ZernioAccount = {
  id: string;
  platform: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isActive: boolean;
  connectedAt: string;
  lastSyncedAt: string;
};

export type ZernioAccountsResponse = {
  accounts: ZernioAccount[];
  lastSyncAt?: string;
  lastSyncStatus?: string;
};

export type ConnectLinkResponse = {
  platform: string;
  connectUrl: string;
  expiresAt: string;
};

export type ZernioErrorCode =
  | "integration_disabled"
  | "integration_degraded"
  | "rate_limited"
  | "invalid_platform"
  // Disconnect only (CON-133). `account_not_found` also covers "already
  // disconnected" — the server can't tell the two apart and neither can we.
  | "account_not_found"
  | "account_has_scheduled_posts"
  | "unknown";

export class ZernioError extends Error {
  code: ZernioErrorCode;
  status: number;
  retryAfterSeconds?: number;
  /**
   * Only set alongside `account_has_scheduled_posts`: how many scheduled posts
   * still publish as the account, which the confirm dialog shows before
   * offering to force the disconnect.
   */
  scheduledPosts?: number;

  constructor(
    code: ZernioErrorCode,
    status: number,
    message: string,
    extra?: { retryAfterSeconds?: number; scheduledPosts?: number },
  ) {
    super(message);
    this.name = "ZernioError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.scheduledPosts = extra?.scheduledPosts;
  }
}

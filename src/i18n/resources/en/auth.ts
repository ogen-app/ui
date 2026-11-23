export const auth = {
  login: {
    title: 'Log in',
    subtitle: 'Log in to continue managing your content',
    submit: 'LOG IN',
    expired:
      'Your session expired — log in again to pick up where you left off',
    afterReset: 'Your password has been changed. Log in with the new one',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    // `resetLink`, not `link`: `link` is an HTML void element, so the Trans
    // parser self-closes it and the label falls outside the anchor.
    forgot: 'Forgot your password? <resetLink>Reset it here</resetLink>.',
    noAccount: "Don't have an account?",
    signUpLink: 'Sign up',
  },
  register: {
    title: 'Create your organization',
    subtitle: 'Sign up to start managing your content',
    submit: 'SIGN UP',
    organizationLabel: 'Organization Name',
    organizationPlaceholder: 'Enter your organization name',
    firstNameLabel: 'First Name',
    firstNamePlaceholder: 'Enter your first name',
    lastNameLabel: 'Last Name',
    lastNamePlaceholder: 'Enter your last name',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter password',
    haveAccount: 'Already have an account?',
    logInLink: 'Log in here',
  },
  /** A tester invite (CON-402): the register screen in invite mode, and what else `/signup?invite=` can say. */
  testerInvite: {
    title: 'Join the Ogen beta',
    subtitle:
      'You were invited by the Ogen team. Your workspace is complimentary.',
    /** Under the locked email field. */
    emailLocked: 'This is the address your invite was sent to.',
    /** Google came back with another address; the invite is untouched. */
    mismatch:
      'This invite is for <strong>{{email}}</strong>. Sign up with that address, or use the form below.',
    /** Every unusable token gets the same 410, so this lists the reasons rather than picking one. */
    expiredTitle: 'This invite has expired',
    expiredBody:
      'The link is no longer valid. It may have expired, been replaced by a newer invite, or already been used. Ask the Ogen team to send you a new one.',
    logInInstead: 'LOG IN INSTEAD',
    /** The preview failed for a reason that says nothing about the invite — retryable. */
    previewFailedTitle: "We couldn't check this invite",
    previewFailedSubtitle:
      'Something went wrong on our side — the link itself may still be fine',
    signedInTitle: "You're signed in as {{name}}",
    signedInBody:
      'This invite is for {{email}}. Sign out to accept it with that address. Your current workspaces stay exactly as they are.',
    signOutAndContinue: 'SIGN OUT AND CONTINUE',
    staySignedIn: 'STAY SIGNED IN',
  },
  /** Self-registration is switched off and there is no invite (CON-402). */
  privateBeta: {
    title: 'Ogen is in private beta',
    body: "We're letting people in by invitation while we finish the product. If you were invited, open the link in your invitation email to create your workspace.",
    /** Placeholder until product picks the request-access route. */
    contact:
      "No invite yet? Write to <mail>{{email}}</mail> and tell us what you'd use Ogen for.",
  },
  /** Sign in with Google (CON-396) — the button, the divider, and what each `?error=` says. */
  google: {
    /** Google's branding allows this wording; the caps are the app's CTA convention. */
    continue: 'CONTINUE WITH GOOGLE',
    orWithEmail: 'or with your email',
    orSignUpWithEmail: 'or sign up with your email',
    /** One sentence per callback code: plain, no blame, the next step included. */
    errors: {
      google_cancelled:
        "Google sign-in was cancelled. Try again whenever you're ready.",
      google_state_invalid:
        'That sign-in took too long or was opened in another browser. Try again.',
      google_email_unverified:
        "Google hasn't verified that email address yet, so we can't use it to sign you in.",
      google_unavailable:
        "We couldn't reach Google just now. Try again in a moment.",
      google_link_requires_password:
        'An Ogen account already uses this email. Log in with your password, then connect Google in Profile.',
      google_already_connected:
        'This Ogen account is connected to a different Google account. Use that one, or log in with your password.',
      google_linked_elsewhere:
        'That Google account already signs in to a different Ogen account.',
      no_active_workspace:
        "Your account isn't part of any workspace right now. Ask a workspace owner to invite you again.",
      signup_invite_only:
        'Sign-up is invite-only for now. Use the link from your invitation email.',
      invite_invalid:
        'This invitation link no longer works. Ask whoever invited you to send another.',
      invite_email_mismatch:
        'This invitation is for a different email. Continue with the Google account it was sent to.',
      invite_seats_full:
        'This workspace has no free seats. Ask an owner to free one, then open the link again.',
      throttled: 'Too many attempts. Wait a minute and try again.',
      /** A code this build predates. */
      unknown: "Google sign-in didn't finish. Try again.",
    },
  },
  /** The one-field step a newcomer finishes a Google sign-up on (CON-396). */
  googleSignup: {
    title: 'Name your workspace',
    subtitle: 'One last step — this is where your campaigns will live',
    organizationLabel: 'Organization name',
    organizationHint: 'You can rename it later in Workspace Settings.',
    submit: 'CREATE WORKSPACE',
    /** Restarts at Google's account chooser. */
    notYou: 'Not you?',
    logInLink: 'Log in',
    expiredTitle: 'This sign-up link has expired',
    expiredSubtitle:
      'Links last 15 minutes. Continue with Google again — it picks up right where you left off',
    expiredInline:
      'This sign-up link has expired. Continue with Google again to pick up where you left off.',
    /** 409 `email_in_use` / `google_already_linked`: a fresh Google sign-in finds the account. */
    accountExists:
      'An Ogen account already uses this email. Continue with Google to sign in to it.',
    startOver: 'Continue with Google',
    loadFailedTitle: "We couldn't load this sign-up",
    loadFailedSubtitle:
      'Something went wrong on our side — the link itself may still be fine',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: "We'll email you a link to set a new one",
    submit: 'SEND RESET LINK',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter your email',
    remembered: 'Remembered it?',
    logInLink: 'Log in',
    sentTitle: 'Check your inbox',
    /** Conditional on purpose: the endpoint answers identically for an
     *  address with no account, so promising delivery would be a claim we
     *  cannot make. */
    sentBody:
      'If <strong>{{email}}</strong> has an Ogen account, a link to set a new password is on its way. It expires in an hour.',
    resend: 'SEND IT AGAIN',
    resentNote: 'Sent again — give it a minute.',
    emailHint:
      'Use the address you log in with. The link stops working after an hour.',
    backToLogin: 'Back to log in',
  },
  reset: {
    title: 'Set a new password',
    subtitle: "Choose something you haven't used here before",
    submit: 'SET NEW PASSWORD',
    passwordLabel: 'New password',
    passwordPlaceholder: 'Enter a new password',
    confirmLabel: 'Confirm new password',
    confirmPlaceholder: 'Enter it again',
    confirmHint:
      'Type it again — a typo here locks you out of your own account.',
    requestNewLink: 'Request a new link',
    knowPassword: 'Know your password?',
    logInLink: 'Log in',
    brokenTitle: "This link doesn't work",
    brokenSubtitle:
      'It looks incomplete — mail clients sometimes cut long links in half',
    brokenBody:
      'Open the link straight from the email, or <request>request a new one</request>.',
  },
  /**
   * Where the "This wasn't me" link in the new-device sign-in email lands
   * (CON-318). `<reset>` goes to Forgot password — or to Profile for someone
   * still signed in, whom Forgot password would bounce.
   */
  secureAccount: {
    title: 'Secure your Ogen account',
    intro: 'We noticed a new sign-in to <strong>{{email}}</strong>:',
    detailsLabel: 'Sign-in details',
    whenLabel: 'When',
    deviceLabel: 'Device',
    ipLabel: 'IP address',
    locationLabel: 'Approximate location',
    /** Shown only for a sign-in that came through Google (CON-396). */
    methodLabel: 'Signed in with',
    methodGoogle: 'Google',
    googleNote:
      "<strong>Because this sign-in came through Google, we'll also disconnect Google.</strong> Connect it again from Profile once you're back in.",
    explainer:
      "If this wasn't you, secure your account. We'll sign out every session on every device — including this one — and you'll set a new password right away.",
    submit: 'SECURE MY ACCOUNT',
    wasMe: 'This was me',
    /** Network or server failure — nothing was revoked, so retrying is safe. */
    failed: "We couldn't reach Ogen, so nothing has changed yet. Try again.",
    rateLimited_one: 'Too many attempts. Try again in {{count}} minute.',
    rateLimited_other: 'Too many attempts. Try again in {{count}} minutes.',
    loadFailedTitle: "We couldn't check this link",
    loadFailedSubtitle:
      'Something went wrong on our side — the link itself may still be fine',
    usedTitle: 'This link has already been used',
    usedBody: 'Your account was secured and all sessions were signed out.',
    usedReset:
      'Still need to set a new password? <reset>Reset it here</reset>.',
    expiredTitle: 'This link has expired',
    expiredBody:
      'Links are valid for 24 hours. Resetting your password also signs out every session.',
    expiredSubmit: 'RESET MY PASSWORD',
    invalidTitle: "This link isn't valid",
    invalidBody: 'Check you opened the full link from the email.',
    invalidReset:
      'Worried about your account? <reset>Reset your password</reset>.',
  },
  /** The emailed invitation's landing page (CON-26). */
  invite: {
    title: 'Join the workspace',
    /** Who invited you and where — the two facts that decide whether this link was meant for you. */
    subtitle: '{{inviter}} invited you to {{workspace}}',
    emailLabel: 'Your email',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Choose a password',
    submit: 'JOIN THE WORKSPACE',
    haveAccount: 'Already have an Ogen account?',
    logInLink: 'Log in',
    brokenTitle: 'This invitation link no longer works',
    brokenSubtitle:
      'Invitations expire after seven days, and each one can only be used once',
    brokenBody:
      'Ask whoever invited you to send another. If you already accepted, <login>log in</login> instead.',
    /** The preview request failed for a reason that says nothing about the token — retryable. */
    previewFailedTitle: "We couldn't check this invitation",
    previewFailedSubtitle:
      'Something went wrong on our side — the link itself may still be fine',
    /** Already signed in as the invited address: nothing to create, one thing to confirm. */
    joinBody:
      "You're signed in as {{email}}, which is who this invitation is for. Accepting adds this workspace to your account.",
    joinSubmit: 'ACCEPT INVITATION',
    /** Signed in as somebody else — no form on this page can fix that. */
    wrongAccountBody:
      'This invitation is for {{invited}}, but you are signed in as {{current}}. Log out and open the link again to accept it.',
    logOutLink: 'Log out',
    /** The server's answer when the invited address already has an account. */
    existingAccountBody:
      '{{email}} already has an Ogen account. Log in as that account and this invitation will be waiting.',
    /** Said before the click, not after a failed round trip (CON-396). */
    googleHint: 'Use the Google account for <strong>{{email}}</strong>.',
    orSetPassword: 'or set a password',
  },
  logout: {
    pendingTitle: 'Logging Out...',
    pendingMessage: 'This may take a few seconds',
    doneTitle: "You've Been Logged Out",
    doneMessage: 'See you next time!',
    home: 'TAKE ME HOME',
    footer: 'LOGOUT',
  },
}

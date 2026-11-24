/**
 * The Figma plugin (CON-339): the page a pairing request opens in the
 * browser, and the card in Workspace Settings that lists what was approved.
 */
export const integrations = {
  figma: {
    connect: {
      title: 'Connect the Figma plugin',
      /** `time` is a formatted date and time; `ip` is where the plugin asked from. */
      requestedFrom: 'Requested {{time}} from {{ip}}',
      requestedAt: 'Requested {{time}}',
      workspaceLabel: 'Send images to',
      workspacesFailed:
        'Your workspaces could not be loaded. Reload the page to try again.',
      /**
       * The anti-phishing warning — required, and always shown. The whole
       * flow's defence against a forwarded link rests on this sentence.
       */
      warning:
        'Only allow this if you just clicked <strong>Connect</strong> in the Ogen plugin inside Figma. This lets the plugin add images to <strong>{{workspace}}</strong> and see your draft post titles.',
      allow: 'Allow',
      deny: 'Deny',
      answerFailed:
        'That didn’t go through. Check your connection and try again.',
      signedInAs: 'Signed in as {{email}}',
      expired: {
        title: 'This link has expired',
        body: 'Connection links only last a few minutes. Go back to Figma and click Connect in the Ogen plugin again.',
      },
      answered: {
        title: 'Already answered',
        body: 'This connection request was already allowed or denied. If the plugin is still asking you to connect, click Connect in Figma again.',
      },
      denied: {
        title: 'Request denied',
        body: 'The plugin was not connected. You can close this tab.',
      },
      success: {
        title: 'Connected',
        body: 'The Figma plugin can now send images to <strong>{{workspace}}</strong>. Return to Figma — you can close this tab.',
      },
      loadFailed: {
        title: 'Something went wrong',
        body: 'The connection request could not be loaded.',
      },
    },
    settings: {
      title: 'Figma plugin',
      loadFailed: 'Figma connections could not be loaded.',
      empty: {
        body: 'Send frames from Figma straight into this workspace’s assets, or onto a draft post, without exporting them first.',
        steps:
          'To connect, open Figma and go to <strong>Plugins → Ogen → Connect</strong>.',
        communityLink: 'Get the plugin on Figma Community',
      },
      /** Shown to an owner only, whose list holds every member's connections. */
      member: '{{name}}',
      connectedOn: 'Connected {{date}}',
      lastUsed: 'Last used {{date}}',
      neverUsed: 'Not used yet',
      disconnect: 'Disconnect',
    },
    disconnect: {
      title: 'Disconnect {{label}}?',
      body: '<strong>{{label}}</strong> will stop being able to send images. The next time someone uses it, Figma will ask to connect again.',
      keepsImages: 'Images it already sent stay in your assets.',
      forbidden:
        'Only the member who connected this plugin, or a workspace owner, can disconnect it.',
      failed: 'The plugin could not be disconnected. Try again in a moment.',
      keep: 'Keep connected',
      confirm: 'Disconnect',
      succeeded: '{{label}} disconnected',
    },
  },
}

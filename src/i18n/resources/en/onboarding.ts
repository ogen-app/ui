export const onboarding = {
  progress: 'Setup',
  skip: 'Skip setup',
  back: 'Back',
  continue: 'Continue',
  stages: {
    you: 'About you',
    sources: 'What Ogen reads',
    brand: 'The brand',
    accounts: 'Accounts',
  },
  stageDone: '{{stage}}, done',
  stageCurrent: '{{stage}}, current step',
  saving: 'Saving…',
  saved: 'Saved',
  you: {
    title: 'Who is Ogen writing for?',
    lead: 'A workspace holds one brand: its voice, audiences, accounts and campaigns. Working for several clients? Each gets a workspace of its own.',
    client: {
      title: 'A client',
      body: 'You market other businesses, as a freelancer or an agency.',
    },
    own: {
      title: 'My own business',
      body: 'You market the business you run or work for.',
    },
    nameClient: 'Client’s name',
    nameOwn: 'Business name',
    nameHint: 'Optional. It becomes the workspace’s name.',
  },
  sources: {
    title: 'What can Ogen read about {{name}}?',
    lead: 'Ogen learns how they sound from what already exists. Add whatever you have; each one is read as soon as it is added, and none of it is required.',
    website: {
      title: 'Website',
      body: 'Ogen reads up to 10 of its pages.',
    },
    documents: {
      title: 'Documents',
      body: 'A brand book, a press kit, offers.',
      more: 'More documents',
    },
    questions: {
      title: 'A few questions',
      body: 'Little written down? A sentence each.',
    },
    websiteLabel: 'Website address',
    websiteHint: 'Ogen reads the home page and up to 9 pages under it.',
    add: 'Add the website',
    drop: 'Drop files here, or',
    choose: 'choose them',
    formats: 'PDF, Word or Markdown',
    answerLabel: 'Your answer',
    addAnswers: 'Add the answers',
    cancel: 'Close',
    remove: 'Remove {{name}}',
    pages_one: '{{formatted}} page',
    pages_other: '{{formatted}} pages',
    uploading: 'Uploading',
    reading: 'Reading, about a minute',
    done: 'Read',
    failed: 'Couldn’t be uploaded',
    readFailed: 'Couldn’t be read',
    added: 'Adds {{needs}}',
    addedNothing: 'Read, nothing new',
    /** What one source went towards, as a phrase inside `added`. */
    adds: {
      apart: 'what sets them apart',
      voice: 'tone of voice',
      audience: 'who they talk to',
      onlyThey: 'things only they can say',
      never: 'what they never say',
    },
    retry: 'Read again',
    /** A document that couldn't be read is chosen again, not re-read. */
    uploadAgain: 'Upload again',
    answered_one: '{{formatted}} answer',
    answered_other: '{{formatted}} answers',
    continue: 'Continue',
    readingHint:
      'Each takes about a minute. You can wait here, or add more while you do.',
    readHint:
      'Next you see what Ogen took from them. Nothing goes into the brand until you review it.',
    later: 'Do this later',
    tryAgain: 'Try again',
    withoutRead: 'Continue without reading',
    nothingRead:
      'Nothing you added gave Ogen anything to read. Add a document or answer a few questions.',
    stillReading:
      'Ogen is still reading one of these. Wait for it, or remove it.',
    stop: {
      body: 'Ogen is still reading. Going on now stops it, and the sheet on the right is not filled in from what you added. You can read it again from Foundation later.',
      keep: 'Keep reading',
      go: 'Go on anyway',
    },
  },
  brand: {
    readingTitle: 'Reading what you gave',
    readingLead:
      'You can stay and watch, or come back; the read carries on either way.',
    reviewTitle: 'What Ogen took from it',
    reviewLead:
      'Everything starts kept. Drop what is wrong, fix what is close. Nothing is saved until you continue.',
    nameLabel: 'Name',
    namedByYou: 'Named by you',
    namedFrom: 'From {{source}}',
    siteSays: 'The website says “{{name}}”.',
    useSite: 'Use that',
    keep: 'Save to the brand',
    kept: '{{kept}} of {{total}} kept',
    failedTitle: 'Ogen couldn’t read the brand',
    failedLead:
      'Nothing was saved. You can read it again from Foundation once setup is done.',
    closedTitle: 'This read is over',
    closedLead:
      'It was saved, discarded or ran out of time. Foundation has whatever was kept.',
    saveFailed: 'The brand wasn’t saved. Try again.',
  },
  accounts: {
    title: 'Where does {{name}} post?',
    leadClient:
      'Connect the accounts you run for them. If the client holds a login, skip it for now and connect it later in Settings.',
    leadOwn: 'Connect the accounts you post from.',
    connect: 'Connect',
    connected: 'Connected',
    later: 'You can connect more at any time in Workspace Settings.',
    finish: 'Finish setup',
    none: 'Finish without accounts',
    connectFailed:
      'That account didn’t connect. Try again, or connect it later in Workspace Settings.',
    linkFailed:
      'Couldn’t start connecting {{platform}}. Try again in a minute.',
  },
  sheet: {
    title: 'What Ogen needs',
    to: 'to sound like {{name}}',
    unnamedClient: 'your client',
    unnamedOwn: 'your business',
    meter: '{{count}} of {{total}} enough',
    verdict: {
      none: 'Nothing to go on yet.',
      some: 'A start. Posts would still read like anyone’s.',
      most: 'Enough to start writing.',
      all: 'Enough to sound like them.',
    },
    levels: {
      missing: 'Missing',
      thin: 'Thin',
      enough: 'Enough',
    },
    needs: {
      apart: {
        label: 'What sets them apart',
        hint: 'The website’s home and about pages, or a brand book.',
      },
      voice: {
        label: 'Tone of voice',
        hint: 'Posts they have published, or the tone section of a brand book.',
      },
      audience: {
        label: 'Who they talk to',
        hint: 'An about page, a press kit, or the questions.',
      },
      onlyThey: {
        label: 'Things only they can say',
        hint: 'Facts, figures and offers: a press kit or an offer sheet.',
      },
      never: {
        label: 'What they never say',
        hint: 'The don’ts in a brand book, or your own notes.',
      },
      channels: {
        label: 'Where they post',
        hint: 'Connect an account.',
      },
    },
  },
}

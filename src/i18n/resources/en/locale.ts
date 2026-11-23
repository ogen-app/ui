// The switching screen's own copy is deliberately NOT here — it lives in
// `i18n/bootMessages.ts`, in the main chunk, because it has to render while
// this file's counterpart for another language is still being fetched.
export const locale = {
  section: {
    title: 'Language',
    label: 'Interface language',
    description:
      'Applies to this browser only — it is not shared with the rest of your workspace. English is built in; other languages are downloaded the first time you choose them.',
  },
}

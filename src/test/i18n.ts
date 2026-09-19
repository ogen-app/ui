import { i18next } from '@/i18n'

/**
 * The `t` to hand to a function under test that takes one.
 *
 * Every helper on the analytics surfaces that produces words takes `t` rather
 * than reading a module-level label map — see the note at the top of
 * `components/analytics/format.ts`. Their tests need one, and this is it:
 * i18next is already initialised with the bundled English catalogue by
 * `test/setup.ts`, so what comes back is the real copy rather than a stub, and
 * a test asserting on a sentence is asserting on the sentence that ships.
 *
 * Pin a different language by calling `i18next.changeLanguage` in the test —
 * `t` reads it at call time.
 */
export const t = i18next.t

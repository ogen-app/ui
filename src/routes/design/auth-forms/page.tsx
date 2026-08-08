import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

import { AuthLoginForm } from '@/components/forms/authLoginForm'
import { AuthRegisterForm } from '@/components/forms/authRegisterForm'
import { AuthForgotPasswordForm } from '@/components/forms/authForgotPasswordForm'
import { AuthResetPasswordForm } from '@/components/forms/authResetPasswordForm'
import { PasswordSection } from '@/components/profile/PasswordSection'
import { FormError } from '@/components/forms/shared/FormError'
import { PasswordRules } from '@/components/forms/shared/PasswordRules'
import { loginSubtitle } from '@/routes/auth/login/page'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/user'
// The `-` prefix is the router plugin's opt-out: everything under `routes/`
// is a route file unless it says otherwise, and this one exports no Route.
import { installFakeApi } from './-fakeApi'

const DESIGN_USER = {
  id: 'u_design',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  created_at: '2026-08-08T09:00:00Z',
  updated_at: '2026-08-08T09:00:00Z',
} satisfies User

/**
 * TEMPORARY design harness — every auth form the app has, on one page, live,
 * at the width the real screen gives them.
 *
 * They are the real components against a fake backend (`fakeApi.ts`), not
 * screenshots or fixtures, so what you type reaches the same code the product
 * runs: the validation, the pending state, the refusal and the recovery are
 * all the ones users get. Each specimen is mounted in its own memory router,
 * which is what keeps a successful login from navigating the harness away and
 * lets the login form be shown at `?expired=1` without a session.
 *
 * Not covered here, because they are pages rather than forms: the missing-token
 * screen at `/auth/reset` and the `/auth/logout` teardown.
 *
 * Delete `routes/design/` and the `/design` exemption in `__root.tsx` when the
 * design is settled.
 */
export function AuthFormsDesignHarness() {
  // Both of these are global, so both are undone on the way out. The route
  // tree imports this module on app boot whether or not anyone opens the
  // harness; only mounting it may change anything outside the page.
  useEffect(() => installFakeApi(), [])

  // `PasswordSection` mails whoever is in the store, so the card needs one to
  // render at all. Put back on the way out — the store
  // persists, and leaving a fake user behind would have the real app paint a
  // signed-in sidebar for the instant before its guard resolves.
  useEffect(() => {
    const previous = useAuthStore.getState().user
    useAuthStore.setState({ user: DESIGN_USER })
    return () => {
      useAuthStore.setState({ user: previous })
    }
  }, [])

  return (
    <div className="min-h-svh bg-background px-8 py-8 text-foreground">
      <header className="mb-8 flex max-w-200 flex-col gap-3">
        <h1 className="text-xl font-display font-medium tracking-tight">Auth forms</h1>
        <p className="text-sm text-tertiary-foreground">
          Every form in the auth flow, live against a fake API. Temporary — delete with{' '}
          <code className="text-xs">routes/design/</code>.
        </p>
        <Legend />
        {/* Worth knowing before it looks like a bug in the forms. The fields
            carry hardcoded ids (`id="email"`), which is fine when a form has a
            screen to itself and not fine on a page holding nine of them —
            every `<label for="email">` resolves to the first one. */}
        <p className="text-xs text-quaternary-foreground">
          Click <em>into</em> a field rather than on its label: the forms use fixed field ids, so
          with several on one page a label click focuses the first form&apos;s copy. Only the
          harness suffers from it — each form is alone on its own screen in the app.
        </p>
      </header>

      <Section
        title="Log in"
        note="Three arrivals at the same screen, told apart by the subtitle alone — a login screen you didn't ask for otherwise reads as the app having logged you out. Compare the three: the difference should register without colour doing the work."
      >
        <Specimen label="Straight to it" note="the ordinary visit">
          <Panel>
            <Heading title="Log in" subtitle={loginSubtitle({})} />
            <Sandbox at="/auth/login/" render={() => <AuthLoginForm />} />
          </Panel>
        </Specimen>

        <Specimen label="Session expired" note="?expired=1 — the guard bounced them here">
          <Panel>
            <Heading title="Log in" subtitle={loginSubtitle({ expired: true })} />
            <Sandbox at="/auth/login/?expired=1" render={() => <AuthLoginForm />} />
          </Panel>
        </Specimen>

        <Specimen label="After a reset" note="?reset=true — arrived from the emailed link">
          <Panel>
            <Heading title="Log in" subtitle={loginSubtitle({ reset: true })} />
            <Sandbox at="/auth/login/?reset=true" render={() => <AuthLoginForm />} />
          </Panel>
        </Specimen>
      </Section>

      <Section
        title="Sign up"
        note="The longest form in the product, and the only one where the password rules are the instruction rather than a complaint. Try taken@example.com."
      >
        <Specimen label="Organization + first admin" note="one step; opens a session on success">
          <Panel>
            <Heading title="Sign up" subtitle="Create your workspace and your admin account" />
            <Sandbox at="/auth/register/" render={() => <AuthRegisterForm />} />
          </Panel>
        </Specimen>
      </Section>

      <Section
        title="Forgot password"
        note="Submit to reach the confirmation — it replaces the form rather than sitting under it, because the next action is in the inbox. Then try the resend, and try it as limited@example.com."
      >
        <Specimen label="Step one" note="submit to swap in the confirmation panel">
          <Panel>
            <Heading title="Forgot password?" subtitle="We'll email you a link to set a new one" />
            <Sandbox at="/auth/forgot/" render={() => <AuthForgotPasswordForm />} />
          </Panel>
        </Specimen>

        <Specimen
          label="Rate-limited resend"
          note="type limited@example.com, send, then resend — the panel must survive the refusal"
        >
          <Panel>
            <Heading title="Forgot password?" subtitle="We'll email you a link to set a new one" />
            <Sandbox at="/auth/forgot/" render={() => <AuthForgotPasswordForm />} />
          </Panel>
        </Specimen>
      </Section>

      <Section
        title="Set a new password"
        note="Step two, reached from the emailed link. On success it sends the user to log in rather than opening a session — the sandbox shows where it went."
      >
        <Specimen label="A live link" note="token from ?token=, never typed">
          <Panel>
            <Heading
              title="Set a new password"
              subtitle="Choose something you haven't used here before"
            />
            <Sandbox
              at="/auth/reset/"
              render={() => <AuthResetPasswordForm token="tok_live" />}
            />
          </Panel>
        </Specimen>

        <Specimen label="A spent link" note="the one failure here the user can act on">
          <Panel>
            <Heading
              title="Set a new password"
              subtitle="Choose something you haven't used here before"
            />
            <Sandbox
              at="/auth/reset/"
              render={() => <AuthResetPasswordForm token="tok_expired" />}
            />
          </Panel>
        </Specimen>
      </Section>

      <Section
        title="Password, on /profile"
        note="No longer a form. The in-app change asked for no current password server-side and revoked no sessions (CON-193), so it is gone and the emailed reset is the only route — click through to the sent state, then the resend."
      >
        <Specimen label="The Password card" note="the address comes from the session, never typed">
          <div className="w-180 max-w-full">
            <Sandbox at="/profile/" render={() => <PasswordSection />} />
          </div>
        </Specimen>
      </Section>

      <Section
        title="The shared pieces"
        note="Both of these were four hand-rolled copies each until recently, and the copies had drifted."
      >
        <Specimen label="FormError" note="empty, filled, and with a way out">
          <Frame>
            <FormError message={undefined} />
            <FormError message="Invalid email or password" />
            <FormError message="This link has expired">
              <span className="text-primary-foreground text-[13px] font-medium">
                Request a new link
              </span>
            </FormError>
          </Frame>
        </Specimen>

        <Specimen label="PasswordRules" note="one sentence colouring itself in; green is the whole reward">
          <Frame>
            <PasswordRules value="" />
            <PasswordRules value="short" />
            <PasswordRules value="longenough" />
            <PasswordRules value="Password1" />
          </Frame>
        </Specimen>
      </Section>
    </div>
  )
}

function Legend() {
  const rules: Array<[string, string]> = [
    ['any password containing “wrong”', 'refused credential (log in, change password)'],
    ['taken@example.com', 'that email is already registered (sign up)'],
    ['limited@example.com, sent twice', 'the resend is rate-limited — 429 (forgot password)'],
    ['the “spent link” specimen', 'expired reset token'],
    ['anything else', 'succeeds, after ~0.7s'],
  ]
  return (
    <dl className="flex flex-col gap-1 border-l-2 border-quinary pl-3 text-xs">
      {rules.map(([input, outcome]) => (
        <div key={input} className="flex gap-2">
          <dt className="w-64 shrink-0 text-foreground">{input}</dt>
          <dd className="text-quaternary-foreground">{outcome}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One form, in its own router.
 *
 * Two things need this. The login form reads `?expired=` and `?reset=` with
 * `useSearch({ from: '/auth/login/' })`, which throws anywhere that route id
 * isn't matched — so it cannot render on `/design/*` at all without one. And
 * every form here navigates on success; against the page's real router that
 * would take the harness with it, so the destinations are stubbed instead and
 * the specimen reports where it went.
 */
function Sandbox({ at, render }: { at: string; render: () => ReactNode }) {
  const latest = useRef(render)
  latest.current = render

  const [router] = useState(() => {
    const [path, search = ''] = at.split(/(?=\?)/)
    const root = createRootRoute()
    const validateSearch = (raw: Record<string, unknown>) => raw

    const routes = [
      createRoute({
        getParentRoute: () => root,
        path,
        validateSearch,
        component: () => <>{latest.current()}</>,
      }),
    ]
    for (const other of ['/', '/auth/login/', '/auth/forgot/', '/profile/']) {
      if (other === path) continue
      routes.push(
        createRoute({
          getParentRoute: () => root,
          path: other,
          validateSearch,
          component: () => <Landed at={other} />,
        }),
      )
    }

    return createRouter({
      routeTree: root.addChildren(routes),
      history: createMemoryHistory({ initialEntries: [`${path}${search}`] }),
    })
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a router
  // built at runtime can't match the app's generated route types, and nothing
  // in the harness depends on them.
  return <RouterProvider router={router as any} />
}

/** Where a successful submit ended up, in place of the app it would have opened. */
function Landed({ at }: { at: string }) {
  return (
    <div className="border border-dashed border-quinary px-3 py-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.08em] text-quaternary-foreground">
        navigated to
      </p>
      <p className="font-mono text-[13px] text-foreground">{at}</p>
    </div>
  )
}

/** `AppAuth`'s inner card — the width and padding the forms really get. */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-[528px] max-w-full flex-col gap-6 bg-primary px-10 py-12">
      {children}
    </div>
  )
}

/** The title block `AppAuth` puts above every form. */
function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[2rem] leading-12 font-medium font-display tracking-tight">{title}</h2>
      <p className="pt-1 text-[13px] leading-4 text-secondary-foreground">{subtitle}</p>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex max-w-200 flex-col gap-1">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="text-xs text-quaternary-foreground">{note}</p>
      </div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-10">{children}</div>
    </section>
  )
}

function Specimen({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <header className="flex max-w-[528px] flex-col">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {label}
        </h3>
        <p className="text-[11px] text-quaternary-foreground">{note}</p>
      </header>
      {children}
    </div>
  )
}

/** A plain surface for the pieces that aren't a whole screen. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-[528px] max-w-full flex-col gap-4 bg-primary px-10 py-8">
      {children}
    </div>
  )
}

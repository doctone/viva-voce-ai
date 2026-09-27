# Sign in

A teacher logs in with email and password to reach the submissions workspace. A new teacher can sign up. Logging out returns to the login page. Every `/_authed` route (`/submissions*`, `/student-records`) redirects to `/login` when there is no session.

## Sub-features

- `login-ok` logs in with valid credentials and lands on `/submissions`.
- `login-bad` shows the auth error and offers "Sign Up Instead" for unknown credentials.
- `signup` creates an account from `/signup`.
- `logout` ends the session and returns to `/login`.
- `guard` redirects unauthenticated visits to protected routes to `/login`.

## How to get to it (user POV)

- Visit `/login` directly, or any protected route while logged out.
- Choose the "Sign up" link under the login form to reach `/signup`.
- Choose "Logout" at the foot of the sidebar once logged in.

## Driving it with verify.sh

Preconditions:

- Baseline from [README.md](README.md). No session cookies in this run's browser session (a fresh `$V up` has none).

- **Guard.** Visit a protected route logged out. Run `$V ab open http://localhost:3100/submissions` then `$V ab wait --fn "location.pathname === '/login'"`. The URL is `/login` and `heading "Log in"` is present.
- **Log in.** Run `$V login`. It waits for hydration, fills `Email`/`Password` with the seed teacher, clicks `Log in`, and waits for `/submissions`. It prints `Logged in as will@viva-voce.org`.
- **Confirm the session.** Run `$V ab wait --text "5 submissions"` and `$V shot sign-in-after`. The ARIA snapshot shows `heading "Submissions"` and the sidebar shows `will@viva-voce.org`.
- **Bad credentials.** Log out first (next bullet), then run:
  - `$V ab open http://localhost:3100/login`
  - `$V ab wait --fn "Object.keys(document.querySelector('form') || {}).some((k) => k.startsWith('__reactFiber'))"`
  - `$V ab fill "#email" "will@viva-voce.org"`
  - `$V ab fill "#password" "wrong-password"`
  - `$V ab find role button click --name "Log in"`
  - `$V ab wait --text "Invalid login credentials"`

  The error text and a `Sign Up Instead` button appear, and the URL stays `/login`.
- **Log out.** Run `$V ab find role link click --name "Logout"` then `$V ab wait --fn "location.pathname === '/login'"`. Revisiting `/submissions` redirects to `/login` again.
- **Sign up.** Run:
  - `$V ab open http://localhost:3100/signup`
  - wait for hydration as above
  - `$V ab fill "#email" "verify+<run-id>@viva-voce.test"`
  - `$V ab fill "#password" "verify-password-1"`
  - `$V ab find role button click --name "Sign up"`

  Email confirmations are off locally (`enable_confirmations = false`), so the server function redirects to `/`. Prove it with `$V sql "select email, email_confirmed_at is not null from auth.users where email = 'verify+<run-id>@viva-voce.test'"`.

## Gotchas

- Clicking `Log in` before hydration submits the form as a native GET. That puts the password in the URL (`/login?email=...&password=...`) and never logs in. Always wait for hydration.
- Snapshots show `button "LOG IN"`, but `find --name` needs `"Log in"`.
- Sign-up rows are real `auth.users`. Remove them during cleanup: `$V sql "delete from auth.users where email like 'verify+%@viva-voce.test' returning email"`.
- The seed user is shared with the user's own local session. Never change its password.

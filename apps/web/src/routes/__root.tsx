/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import * as React from "react";
import { AppProviders } from "../components/AppProviders";
import { DefaultCatchBoundary } from "../components/DefaultCatchBoundary";
import { NotFound } from "../components/NotFound";
import appCss from "../styles/app.css?url";
import {
  brandTitleClassName,
  cn,
  eyebrowClassName,
  mutedTextClassName,
  pageFrameClassName,
  pageShellClassName,
} from "../styles/classes";
import { seo } from "../utils/seo";
import { getSupabaseServerClient } from "../utils/supabase-server";

const fetchUser = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error: _error } = await supabase.auth.getUser();

  if (!data.user?.email) {
    return null;
  }

  return {
    email: data.user.email,
  };
});

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const user = await fetchUser();
    const isAuthPage =
      location.pathname === "/login" || location.pathname === "/signup";

    if (!user && !isAuthPage) {
      throw redirect({
        to: "/login",
      });
    }

    if (user && isAuthPage) {
      throw redirect({
        to: "/",
      });
    }

    return {
      publicEnv: {
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
        SUPABASE_URL: process.env.SUPABASE_URL!,
      },
      user,
    };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      ...seo({
        title: "Viva Voce AI | Academic Assessment Workspace",
        description:
          "A paper-and-ink assessment workspace for teachers, oral exams, and thoughtful academic review.",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

export function getShouldShowTopbar(
  pathname: string,
  routeIds: readonly string[],
) {
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAuthenticatedRoute = routeIds.includes("/_authed");

  return !isAuthPage && !isAuthenticatedRoute;
}

function RootComponent() {
  return (
    <AppProviders>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </AppProviders>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { publicEnv, user } = Route.useRouteContext();
  const publicEnvScript = JSON.stringify(publicEnv);
  const navLinkClassName =
    "border border-outline-variant bg-surface-container-lowest px-[14px] py-[10px] text-[13px] font-bold uppercase tracking-[0.05em] text-on-surface-variant";
  const navLinkActiveClassName = "border-primary bg-primary text-on-primary";
  const shouldShowTopbar = useRouterState({
    select: (state) =>
      getShouldShowTopbar(
        state.location.pathname,
        state.matches.map((match) => match.routeId),
      ),
  });

  return (
    <html>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PUBLIC_ENV__ = ${publicEnvScript};`,
          }}
        />
      </head>
      <body>
        <div className={pageShellClassName}>
          <div className={shouldShowTopbar ? pageFrameClassName : ""}>
            {shouldShowTopbar ? (
              <header className="mb-16 flex flex-wrap items-center gap-4 border-b border-outline-variant pb-4">
                <div className="grid gap-1">
                  <span className={eyebrowClassName}>Academic Minimalist</span>
                  <Link to="/" className={brandTitleClassName}>
                    Viva Voce AI
                  </Link>
                  <p
                    className={cn("max-w-[42rem] text-sm", mutedTextClassName)}
                  >
                    Quiet software for grading, transcripts, and oral assessment
                    workflows.
                  </p>
                </div>
                <nav className="ml-auto flex flex-wrap items-center gap-2">
                  <Link
                    to="/"
                    className={navLinkClassName}
                    activeProps={{
                      className: cn(navLinkClassName, navLinkActiveClassName),
                    }}
                    activeOptions={{ exact: true }}
                  >
                    Home
                  </Link>
                  {user ? (
                    <>
                      <span className="border border-outline-variant bg-surface-container-low px-[14px] py-[10px] text-sm text-on-surface-variant">
                        {user.email}{" "}
                      </span>{" "}
                      <Link to="/logout" className={navLinkClassName}>
                        {" "}
                        Logout
                      </Link>
                    </>
                  ) : (
                    <Link to="/login" className={navLinkClassName}>
                      Login
                    </Link>
                  )}
                </nav>
              </header>
            ) : null}
            {children}
          </div>
        </div>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

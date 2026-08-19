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
import { MobileNavDrawer } from "../components/navigation/MobileNavDrawer";
import { MobileNavHeader } from "../components/navigation/MobileNavHeader";
import appCss from "../styles/app.css?url";
import { cn } from "~/lib/utils";
import {
  brandTitleClassName,
  eyebrowClassName,
  mobileNavFooterLinkClassName,
  mutedTextClassName,
  pageFrameClassName,
  pageShellClassName,
} from "~/lib/class-names";
import { seo } from "../utils/seo";
import { getSupabaseServerClient } from "../utils/supabase-server";

const publicMobileNavItems = [
  { label: "Home", to: "/" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Built for teachers", href: "#built-for-teachers" },
  { label: "Why it matters", href: "#why-it-matters" },
] as const;

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
    const isPublicPage = isAuthPage || location.pathname === "/";

    if (!user && !isPublicPage) {
      throw redirect({
        to: "/login",
      });
    }

    if (user && isAuthPage) {
      throw redirect({
        to: "/submissions",
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
      {
        name: "theme-color",
        content: "#1f4d45",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
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
        href: "/icon.svg",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.svg",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#faf9f5" },
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
    "border border-outline-variant bg-surface-container-lowest px-[14px] py-[10px] text-[13px] font-bold uppercase tracking-[0.05em]";
  const navLinkInactiveClassName = "text-on-surface-variant";
  const navLinkActiveClassName = "border-primary bg-primary text-on-primary";
  const shouldShowTopbar = useRouterState({
    select: (state) =>
      getShouldShowTopbar(
        state.location.pathname,
        state.matches.map((match) => match.routeId),
      ),
  });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed", error);
      });
    }
  }, []);

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
              <>
                <header className="mb-16 flex flex-wrap items-center gap-4 border-b border-outline-variant pb-4">
                  <MobileNavHeader
                    isMenuOpen={isMobileNavOpen}
                    onOpenMenu={() => setIsMobileNavOpen(true)}
                  />

                  <div className="hidden lg:contents">
                    <div className="grid gap-1">
                      <span className={eyebrowClassName}>
                        Academic Minimalist
                      </span>
                      <Link to="/" className={brandTitleClassName}>
                        Viva Voce AI
                      </Link>
                      <p
                        className={cn(
                          "max-w-[42rem] text-sm",
                          mutedTextClassName,
                        )}
                      >
                        Quiet software for grading, transcripts, and oral
                        assessment workflows.
                      </p>
                    </div>
                    <nav className="ml-auto flex flex-wrap items-center gap-2">
                      <Link
                        to="/"
                        className={navLinkClassName}
                        activeProps={{
                          className: navLinkActiveClassName,
                        }}
                        inactiveProps={{
                          className: navLinkInactiveClassName,
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
                          <Link
                            to="/logout"
                            className={cn(navLinkClassName, navLinkInactiveClassName)}
                          >
                            {" "}
                            Logout
                          </Link>
                        </>
                      ) : (
                        <Link
                          to="/login"
                          className={cn(navLinkClassName, navLinkInactiveClassName)}
                        >
                          Login
                        </Link>
                      )}
                    </nav>
                  </div>
                </header>

                <MobileNavDrawer
                  items={publicMobileNavItems}
                  open={isMobileNavOpen}
                  onOpenChange={setIsMobileNavOpen}
                  footer={
                    user ? (
                      <>
                        <p className={eyebrowClassName}>Signed in as</p>
                        <p className="text-sm text-on-surface [overflow-wrap:anywhere]">
                          {user.email}
                        </p>
                        <Link
                          to="/logout"
                          className={mobileNavFooterLinkClassName}
                        >
                          Logout
                        </Link>
                      </>
                    ) : (
                      <div className="grid gap-2">
                        <Link
                          to="/login"
                          className={mobileNavFooterLinkClassName}
                        >
                          Login
                        </Link>
                        <Link
                          to="/signup"
                          className={mobileNavFooterLinkClassName}
                        >
                          Sign Up
                        </Link>
                      </div>
                    )
                  }
                />
              </>
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

import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "../routeTree.gen";
import { server } from "../test/server";

const getUser = vi.fn();

vi.mock("../utils/supabase-server", () => ({
  getSupabaseServerClient: () => ({
    auth: {
      getUser,
    },
  }),
}));

// TanStack Start's client-side `createServerFn` stub expects to run inside a
// full Start request/response lifecycle (dev server or SSR), which isn't
// present when rendering the route tree under Vitest. Replace it with a
// stub that just calls the handler directly, so the real `beforeLoad`
// guards in `__root.tsx` / `_authed.tsx` run against our mocked
// `getSupabaseServerClient` above instead of crashing on missing request
// context.
vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();

  function fakeCreateServerFn() {
    let validate = (data: unknown) => data;
    const api = {
      inputValidator(fn: (data: unknown) => unknown) {
        validate = fn;
        return api;
      },
      handler(fn: (opts: { data: unknown }) => unknown) {
        return async (opts?: { data?: unknown }) => fn({ data: validate(opts?.data) });
      },
    };
    return api;
  }

  return {
    ...actual,
    createServerFn: fakeCreateServerFn,
  };
});

function renderApp(initialPath: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(<RouterProvider router={router} />);

  return router;
}

function mockUnauthenticated() {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
}

function mockAuthenticated(email = "teacher@example.com") {
  getUser.mockResolvedValue({ data: { user: { email } }, error: null });
}

describe("protected route access and redirects", () => {
  beforeEach(() => {
    getUser.mockReset();
    server.use(
      http.get("https://example-project.supabase.co/rest/v1/submissions", () => {
        return HttpResponse.json([]);
      }),
    );
  });

  describe("landing page access", () => {
    it("shows the landing page to unauthenticated visitors at /", async () => {
      mockUnauthenticated();

      const router = renderApp("/");

      expect(
        await screen.findByRole("heading", {
          name: /prepare viva questions in seconds, not hours/i,
        }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/");
    });

    it("redirects authenticated visitors from / to /submissions", async () => {
      mockAuthenticated();

      const router = renderApp("/");

      await screen.findByRole("heading", { name: "Submissions" });
      expect(router.state.location.pathname).toBe("/submissions");
    });
  });

  describe("unauthenticated access", () => {
    it("redirects /submissions to /login", async () => {
      mockUnauthenticated();

      const router = renderApp("/submissions");

      expect(
        await screen.findByRole("heading", { name: "Log in" }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/login");
    });

    it("redirects /submissions/new to /login", async () => {
      mockUnauthenticated();

      const router = renderApp("/submissions/new");

      expect(
        await screen.findByRole("heading", { name: "Log in" }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/login");
    });

    it("redirects /submissions/:id to /login", async () => {
      mockUnauthenticated();

      const router = renderApp(
        "/submissions/30420000-0000-0000-0000-000000000000",
      );

      expect(
        await screen.findByRole("heading", { name: "Log in" }),
      ).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/login");
    });
  });

  describe("authenticated access", () => {
    it("renders the submissions page content for /submissions", async () => {
      mockAuthenticated();

      renderApp("/submissions");

      expect(
        await screen.findByRole("heading", { name: "Submissions" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "New Submission" }),
      ).toBeInTheDocument();
    });

    it("shows the sidebar navigation with links to Submissions and Student Records", async () => {
      mockAuthenticated();

      renderApp("/submissions");

      await screen.findByRole("heading", { name: "Submissions" });

      const primaryNav = screen.getByRole("navigation", { name: "Primary" });
      expect(
        within(primaryNav).getByRole("link", { name: "Submissions" }),
      ).toBeInTheDocument();
      expect(
        within(primaryNav).getByRole("link", { name: "Student Records" }),
      ).toBeInTheDocument();
    });
  });

  describe("topbar visibility", () => {
    it("hides the public topbar on authenticated pages such as /submissions", async () => {
      mockAuthenticated();

      renderApp("/submissions");

      await screen.findByRole("heading", { name: "Submissions" });

      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });

    it("hides the public topbar on /login", async () => {
      mockUnauthenticated();

      renderApp("/login");

      await screen.findByRole("heading", { name: "Log in" });

      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });

    it("hides the public topbar on /signup", async () => {
      mockUnauthenticated();

      renderApp("/signup");

      await screen.findByRole("heading", { name: "Sign up" });

      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });
  });

  describe("mobile navigation on the landing page", () => {
    it("opens the drawer with route, anchor, login, and sign up links, then closes it", async () => {
      mockUnauthenticated();

      renderApp("/");

      await screen.findByRole("heading", {
        name: /prepare viva questions in seconds, not hours/i,
      });

      const menuButton = await screen.findByRole("button", {
        name: "Open navigation menu",
      });
      expect(menuButton).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(menuButton);
      });

      expect(menuButton).toHaveAttribute("aria-expanded", "true");
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByRole("link", { name: "Home" })).toHaveAttribute(
        "href",
        "/",
      );
      expect(
        within(dialog).getByRole("link", { name: "How it works" }),
      ).toHaveAttribute("href", "#how-it-works");
      expect(
        within(dialog).getByRole("link", { name: "Built for teachers" }),
      ).toHaveAttribute("href", "#built-for-teachers");
      expect(
        within(dialog).getByRole("link", { name: "Why it matters" }),
      ).toHaveAttribute("href", "#why-it-matters");
      expect(within(dialog).getByRole("link", { name: "Login" })).toHaveAttribute(
        "href",
        "/login",
      );
      expect(
        within(dialog).getByRole("link", { name: "Sign Up" }),
      ).toHaveAttribute("href", "/signup");

      await act(async () => {
        fireEvent.click(
          within(dialog).getByRole("button", { name: "Close navigation menu" }),
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });
});

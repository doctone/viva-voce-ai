import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { NewSubmissionPage } from "./submissions.new";
import { submissionCreateHandler } from "../../test/handlers";
import { renderWithRouter } from "../../test/router";
import { server } from "../../test/server";

describe("NewSubmissionPage", () => {
  it("requests students and renders the submission form fields", async () => {
    let requestedStudents = false;

    server.use(
      http.get("https://example-project.supabase.co/rest/v1/students", () => {
        requestedStudents = true;

        return HttpResponse.json([
          { id: "10420000-0000-0000-0000-000000000000" },
        ]);
      }),
    );

    renderWithRouter(<NewSubmissionPage />, "/submissions/new");

    await waitFor(() => {
      expect(requestedStudents).toBe(true);
    });

    expect(
      screen.getByRole("heading", { name: "New submission" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Student")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Submission text")).toBeInTheDocument();
    expect(
      await screen.findByRole("option", {
        name: "10420000-0000-0000-0000-000000000000",
      }),
    ).toBeInTheDocument();
  });

  it("updates the advisory word count as the submission text changes", async () => {
    server.use(
      http.get("https://example-project.supabase.co/rest/v1/students", () => {
        return HttpResponse.json([
          { id: "10420000-0000-0000-0000-000000000000" },
        ]);
      }),
    );

    const user = userEvent.setup();

    renderWithRouter(<NewSubmissionPage />, "/submissions/new");

    const textArea = await screen.findByLabelText("Submission text");

    await user.type(textArea, "One two three four");

    expect(
      screen.getByText("4 words, guidance: around 400."),
    ).toBeInTheDocument();
  });

  it("shows and clears inline validation errors for required fields", async () => {
    server.use(
      http.get("https://example-project.supabase.co/rest/v1/students", () => {
        return HttpResponse.json([
          { id: "10420000-0000-0000-0000-000000000000" },
        ]);
      }),
    );

    const user = userEvent.setup();

    renderWithRouter(<NewSubmissionPage />, "/submissions/new");

    await screen.findByRole("option", {
      name: "10420000-0000-0000-0000-000000000000",
    });

    await user.click(
      screen.getByRole("button", { name: "Generate viva questions" }),
    );

    expect(await screen.findByText("Select a student.")).toBeInTheDocument();
    expect(screen.getByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByText("Enter the submission text.")).toBeInTheDocument();

    expect(screen.getByLabelText("Student")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Title")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Submission text")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await user.selectOptions(
      screen.getByLabelText("Student"),
      "10420000-0000-0000-0000-000000000000",
    );
    await user.type(screen.getByLabelText("Title"), "Economic policy reflection");
    await user.type(
      screen.getByLabelText("Submission text"),
      "This submission examines monetary policy and public argument.",
    );

    await waitFor(() => {
      expect(screen.queryByText("Select a student.")).not.toBeInTheDocument();
      expect(screen.queryByText("Enter a title.")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Enter the submission text."),
      ).not.toBeInTheDocument();
    });
  });

  it("creates the submission and navigates immediately to the submission detail page", async () => {
    let postedBody: Record<string, unknown> | undefined;

    server.use(
      http.get("https://example-project.supabase.co/rest/v1/students", () => {
        return HttpResponse.json([
          { id: "10420000-0000-0000-0000-000000000000" },
        ]);
      }),
      submissionCreateHandler({
        onRequest: (body) => {
          postedBody = body;
        },
      }),
    );

    const user = userEvent.setup();

    renderWithRouter(<NewSubmissionPage />, "/submissions/new", {
      "/submissions/$submissionId": <div>Submission detail</div>,
    });

    await screen.findByRole("option", {
      name: "10420000-0000-0000-0000-000000000000",
    });

    await user.selectOptions(
      await screen.findByLabelText("Student"),
      "10420000-0000-0000-0000-000000000000",
    );
    await user.type(
      screen.getByLabelText("Title"),
      "Economic policy reflection",
    );
    await user.type(
      screen.getByLabelText("Submission text"),
      "This submission examines monetary policy and public argument.",
    );
    await user.click(
      screen.getByRole("button", { name: "Generate viva questions" }),
    );

    await waitFor(() => {
      expect(postedBody).toEqual({
        student_id: "10420000-0000-0000-0000-000000000000",
        submission_title: "Economic policy reflection",
        submission_text:
          "This submission examines monetary policy and public argument.",
      });
    });

    expect(await screen.findByText("Submission detail")).toBeInTheDocument();
  });

  it("shows an inline error when submission creation fails", async () => {
    server.use(
      http.get("https://example-project.supabase.co/rest/v1/students", () => {
        return HttpResponse.json([
          { id: "10420000-0000-0000-0000-000000000000" },
        ]);
      }),
      http.post(
        "https://example-project.supabase.co/rest/v1/submissions",
        () => {
          return HttpResponse.json(
            { message: "Insert failed" },
            { status: 500 },
          );
        },
      ),
    );

    const user = userEvent.setup();

    renderWithRouter(<NewSubmissionPage />, "/submissions/new");

    await screen.findByRole("option", {
      name: "10420000-0000-0000-0000-000000000000",
    });

    await user.selectOptions(
      await screen.findByLabelText("Student"),
      "10420000-0000-0000-0000-000000000000",
    );
    await user.type(
      screen.getByLabelText("Title"),
      "Economic policy reflection",
    );
    await user.type(
      screen.getByLabelText("Submission text"),
      "Short text for failure path.",
    );
    await user.click(
      screen.getByRole("button", { name: "Generate viva questions" }),
    );

    expect(
      await screen.findByText(
        "We could not create the submission. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "New submission" }),
    ).toBeInTheDocument();
  });
});

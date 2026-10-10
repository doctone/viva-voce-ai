import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Breadcrumb, Card } from "../../components/ui";
import { cn } from "~/lib/utils";
import { eyebrowClassName, mutedTextClassName } from "~/lib/class-names";
import { computeTalkTime } from "../../features/submissions/talkTime";
import { fetchStoredUtterances } from "../../features/submissions/transcriptUtterances";
import { createSupabaseVivaRecordRepository } from "../../features/submissions/vivaRecord";
import { createSupabaseVivaRecordAmendmentRepository } from "../../features/submissions/vivaRecordAmendment";
import {
  buildRecordPageModel,
  isSignedRecord,
} from "../../features/submissions/vivaRecordPage";
import { getSupabaseBrowserClient } from "../../utils/supabase-browser";
import { VivaRecordPage } from "./submissions/-VivaRecordPage";

export const Route = createFileRoute(
  "/_authed/submissions/$submissionId/record",
)({
  component: VivaRecordRoute,
});

async function fetchRecordPageSource(submissionId: string) {
  const supabase = getSupabaseBrowserClient();
  const submission = await supabase
    .from("submissions")
    .select("id, student_id, submission_title")
    .eq("id", submissionId);
  const submissionRow = (
    submission.data as Array<{
      student_id: string;
      submission_title: string;
    }> | null
  )?.[0];

  if (submission.error || !submissionRow) {
    throw new Error("We could not load the submission.");
  }

  const sets = await supabase
    .from("viva_question_sets")
    .select("id")
    .eq("submission_id", submissionId);
  const setId = (sets.data as Array<{ id: string }> | null)?.[0]?.id;

  if (sets.error) {
    throw new Error("We could not load the Viva Question Set.");
  }

  const sessions = setId
    ? await supabase
        .from("viva_sessions")
        .select("id")
        .eq("viva_question_set_id", setId)
        .eq("status", "ended")
        .order("ended_at", { ascending: false })
        .limit(1)
    : { data: [], error: null };

  if (sessions.error) {
    throw new Error("We could not load the ended Viva Session.");
  }

  const sessionId =
    (sessions.data as Array<{ id: string }> | null)?.[0]?.id ?? null;
  const record = sessionId
    ? await createSupabaseVivaRecordRepository(supabase).find(sessionId)
    : null;

  if (!isSignedRecord(record) || !sessionId) {
    return { page: null };
  }

  const teacher = record.snapshot.teacher;
  const amendments = await createSupabaseVivaRecordAmendmentRepository(
    supabase,
    (id) => (id === teacher.id ? teacher.name : id),
  ).list(record.id);
  // Speaker data is optional: a missing transcript leaves talk time off the page.
  const utterances = await fetchStoredUtterances(supabase, sessionId).catch(
    () => [],
  );

  return {
    page: buildRecordPageModel(record, {
      amendments,
      studentName: submissionRow.student_id,
      submissionTitle: submissionRow.submission_title,
      talkTimeSharePercent: computeTalkTime(utterances).studentSharePercent,
    }),
    title: submissionRow.submission_title,
  };
}

export function VivaRecordRoute() {
  const { submissionId } = Route.useParams();
  const query = useQuery({
    queryFn: () => fetchRecordPageSource(submissionId),
    queryKey: ["viva-record-page", submissionId],
  });

  const breadcrumb = (
    <div className="record-no-print">
      <Breadcrumb
        items={[
          { label: "Submissions", to: "/submissions" },
          { label: "Submission", to: "/submissions/$submissionId" },
          { label: "Viva record" },
        ]}
      />
    </div>
  );

  if (query.isLoading) {
    return (
      <div className="grid gap-6">
        {breadcrumb}
        <Card as="section" className="gap-4">
          <span className={eyebrowClassName}>Viva record</span>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>Loading…</p>
        </Card>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="grid gap-6">
        {breadcrumb}
        <p className="text-sm leading-6 text-error" role="alert">
          {query.error.message}
        </p>
      </div>
    );
  }

  const page = query.data?.page ?? null;

  return (
    <div className="grid gap-6">
      {breadcrumb}
      {page ? (
        <VivaRecordPage model={page} state="signed" />
      ) : (
        <VivaRecordPage state="unsigned" />
      )}
    </div>
  );
}

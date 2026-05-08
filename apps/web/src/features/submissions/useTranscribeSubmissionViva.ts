import { useServerFn } from "@tanstack/react-start";
import { transcribeSubmissionVivaFn } from "./transcribeSubmissionVivaServerFn";

export function useTranscribeSubmissionViva() {
  const transcribeSubmissionViva = useServerFn(transcribeSubmissionVivaFn);

  return async (data: { submissionVivaId: string; audioUrl: string }) => {
    return transcribeSubmissionViva({ data });
  };
}

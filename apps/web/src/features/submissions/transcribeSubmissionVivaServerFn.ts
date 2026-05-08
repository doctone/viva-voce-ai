import { createServerFn } from "@tanstack/react-start";
import { transcribeSubmissionViva } from "./transcribeSubmissionViva";

export const transcribeSubmissionVivaFn = createServerFn({ method: "POST" })
  .inputValidator((data: { submissionVivaId: string; audioUrl: string }) => data)
  .handler(async ({ data }) => {
    return transcribeSubmissionViva(data);
  });

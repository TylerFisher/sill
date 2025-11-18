import type { Submission } from "@conform-to/react";
import { z } from "zod";
import { VerifySchema } from "~/routes/accounts/verify";

export type VerifyFunctionArgs = {
  request: Request;
  submission: Submission<
    z.input<typeof VerifySchema>,
    string[],
    z.output<typeof VerifySchema>
  >;
  body: FormData | URLSearchParams;
};

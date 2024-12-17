import { z } from "zod";

export const NotificationSchema = z.object({
	format: z.string(),
	queryItems: z.array(z.object({})),
	name: z.string(),
});

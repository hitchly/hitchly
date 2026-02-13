import { EmailClient } from "@hitchly/emails";

import { env } from "../config/env";

export const emailClient = new EmailClient(env.email.user, env.email.password);

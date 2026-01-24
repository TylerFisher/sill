import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod";
import {
  deleteSession,
  getPasswordHash,
  getUserIdFromSession,
  getUserProfile,
  login,
  resetUserPassword,
  signup,
  verifyUserPassword,
  checkUserExists,
  deleteVerification,
  isCodeValid,
  prepareVerification,
  createOAuthClient,
} from "@sill/auth";
import { db, password, termsAgreement, termsUpdate, user } from "@sill/schema";
import { getActiveSyncs } from "./sync.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendEmailChangeEmail,
  sendEmailChangeNoticeEmail,
  sendPasswordResetEmail,
} from "@sill/emails";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional().default(false),
  redirectTo: z.string().optional(),
});

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

const SignupInitiateSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const VerifySchema = z.object({
  code: z.string().min(6).max(6),
  type: z.enum(["onboarding", "reset-password", "change-email", "add-email", "2fa"]),
  target: z.string(),
  redirectTo: z.string().optional(),
});

const VerifyPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const ChangePasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const SearchUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const ResetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const ChangeEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const UpdateEmailSchema = z.object({
  oldEmail: z.string().email("Invalid email address"),
  newEmail: z.string().email("Invalid email address"),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const auth = new Hono()
  // POST /api/auth/login
  .post("/login", zValidator("json", LoginSchema), async (c) => {
    const { email, password, remember, redirectTo } = c.req.valid("json");

    try {
      const session = await login({ email, password });

      if (!session) {
        return c.json(
          {
            error: "Invalid email or password",
            field: "credentials",
          },
          401
        );
      }

      // Set session cookie
      // If remember is false, still set a reasonable expiration (7 days) to persist across PWA restarts
      const expirationDate = remember
        ? new Date(session.expirationDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      setCookie(c, "sessionId", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expirationDate,
      });

      return c.json({
        success: true,
        session: {
          id: session.id,
          userId: session.userId,
          expirationDate: session.expirationDate,
        },
        redirectTo: redirectTo || "/links",
      });
    } catch (error) {
      console.error("Login error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/signup
  .post("/signup", zValidator("json", SignupSchema), async (c) => {
    const { email, password, name } = c.req.valid("json");

    try {
      const session = await signup({
        email,
        sentPassword: password,
        name,
      });

      if (!session) {
        return c.json(
          {
            error: "Failed to create account",
          },
          400
        );
      }

      // Set session cookie
      setCookie(c, "sessionId", session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(session.expirationDate),
      });

      // Send verification email
      await sendWelcomeEmail({
        to: email,
        name,
      });

      return c.json({
        success: true,
        session: {
          id: session.id,
          userId: session.userId,
          expirationDate: session.expirationDate,
        },
        redirectTo: "/accounts/onboarding/social",
      });
    } catch (error) {
      console.error("Signup error:", error);
      // Check if it's a unique constraint error (email already exists)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        return c.json(
          {
            error: "An account with this email already exists",
            field: "email",
          },
          409
        );
      }
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/logout
  .post("/logout", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      // Get session ID from cookie to delete it
      const sessionId = getSessionIdFromCookie(c.req.header("cookie"));
      if (sessionId) {
        await deleteSession(sessionId);
      }

      // Clear session cookie
      c.header(
        "Set-Cookie",
        "sessionId=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );

      return c.json({
        success: true,
        redirectTo: "/",
      });
    } catch (error) {
      console.error("Logout error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/signup/initiate - Initiate signup with verification
  .post(
    "/signup/initiate",
    zValidator("json", SignupInitiateSchema),
    async (c) => {
      const { email } = c.req.valid("json");

      try {
        // Check if user already exists
        const existingUser = await checkUserExists(email);
        if (existingUser) {
          return c.json(
            {
              error: "A user already exists with this email",
              field: "email",
            },
            409
          );
        }

        // Generate verification code and prepare verification
        const { otp, verifyUrl } = await prepareVerification({
          period: 10 * 60,
          type: "onboarding",
          target: email,
          request: c.req.raw,
        });

        // Send verification email
        await sendVerificationEmail({
          to: email,
          otp,
        });

        return c.json({
          success: true,
          verifyUrl: verifyUrl.toString(),
          message: "Verification code sent to email",
        });
      } catch (error) {
        console.error("Signup initiate error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    }
  )
  // POST /api/auth/verify - Verify email code
  .post("/verify", zValidator("json", VerifySchema), async (c) => {
    const { code, type, target, redirectTo } = c.req.valid("json");

    try {
      // Check if code is valid
      const codeIsValid = await isCodeValid({ code, type, target });

      if (!codeIsValid) {
        return c.json(
          {
            error: "Invalid code",
            field: "code",
          },
          400
        );
      }

      // Handle different verification types
      if (type === "onboarding") {
        // Delete verification record
        await deleteVerification(type, target);

        // Return success - the web package will handle onboarding completion
        return c.json({
          success: true,
          type,
          target,
          redirectTo: redirectTo || "/accounts/onboarding",
        });
      }

      // For other verification types, we'll handle them later
      return c.json({
        success: true,
        type,
        target,
        redirectTo: redirectTo || "/",
      });
    } catch (error) {
      console.error("Verification error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // GET /api/auth/me - Get current user info
  .get("/me", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    return c.json({
      userId,
      authenticated: true,
    });
  })
  // GET /api/auth/profile - Get user profile with social accounts and terms agreement
  .get("/profile", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      const userProfile = await getUserProfile(userId);

      if (!userProfile) {
        return c.json({ error: "User not found" }, 404);
      }

      // Get latest terms update and check if user has agreed
      let agreedToLatestTerms = true;
      try {
        const latestTerms = await db.query.termsUpdate.findFirst({
          orderBy: desc(termsUpdate.termsDate),
        });

        if (latestTerms) {
          const agreement = await db.query.termsAgreement.findFirst({
            where: and(
              eq(termsAgreement.termsUpdateId, latestTerms.id),
              eq(termsAgreement.userId, userId)
            ),
          });
          agreedToLatestTerms = !!agreement;
        }
      } catch (error) {
        console.error("Error checking terms agreement:", error);
        // Don't fail the entire request if terms check fails
      }

      // Get active and recently completed syncs
      let activeSyncs: Array<{
        syncId: string;
        label: string;
        status: string;
      }> = [];
      try {
        activeSyncs = await getActiveSyncs(userId);
      } catch (error) {
        console.error("Error fetching active syncs:", error);
        // Don't fail if sync fetch fails
      }

      return c.json({
        ...userProfile,
        agreedToLatestTerms,
        activeSyncs,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // DELETE /api/auth/user - Delete current user account
  .delete("/user", async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    try {
      // Delete the user (cascade deletes will handle related data)
      await db.delete(user).where(eq(user.id, userId));

      // Get session ID from cookie to delete it
      const sessionId = getSessionIdFromCookie(c.req.header("cookie"));
      if (sessionId) {
        await deleteSession(sessionId);
      }

      // Clear session cookie
      c.header(
        "Set-Cookie",
        "sessionId=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );

      return c.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/verify-password - Verify current password
  .post(
    "/verify-password",
    zValidator("json", VerifyPasswordSchema),
    async (c) => {
      const userId = await getUserIdFromSession(c.req.raw);

      if (!userId) {
        return c.json({ error: "Not authenticated" }, 401);
      }

      const { password } = c.req.valid("json");

      try {
        const user = await verifyUserPassword({ userId }, password);

        if (!user) {
          return c.json({ valid: false });
        }

        return c.json({ valid: true });
      } catch (error) {
        console.error("Verify password error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    }
  )
  // PUT /api/auth/password - Change user password
  .put("/password", zValidator("json", ChangePasswordSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { newPassword } = c.req.valid("json");

    try {
      // Hash new password and update
      const hashedNewPassword = await getPasswordHash(newPassword);

      await db
        .update(password)
        .set({
          hash: hashedNewPassword,
        })
        .where(eq(password.userId, userId));

      return c.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/search-user - Search for a user by email
  .post("/search-user", zValidator("json", SearchUserSchema), async (c) => {
    const { email } = c.req.valid("json");

    try {
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email.toLowerCase()),
        columns: { id: true, email: true },
      });

      if (!existingUser) {
        return c.json({ error: "User not found" }, 404);
      }

      return c.json({
        user: {
          id: existingUser.id,
          email: existingUser.email,
        },
      });
    } catch (error) {
      console.error("Search user error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/reset-password - Reset user password
  .post(
    "/reset-password",
    zValidator("json", ResetPasswordSchema),
    async (c) => {
      const { email, newPassword } = c.req.valid("json");

      try {
        // First, find the user by email
        const existingUser = await db.query.user.findFirst({
          where: eq(user.email, email.toLowerCase()),
          columns: { id: true },
        });

        if (!existingUser) {
          return c.json({ error: "User not found" }, 404);
        }

        // Reset the user's password using the auth function
        await resetUserPassword({
          userId: existingUser.id,
          newPassword,
        });

        return c.json({ success: true });
      } catch (error) {
        console.error("Password reset failed:", error);
        return c.json({ error: "Failed to reset password" }, 500);
      }
    }
  )
  // POST /api/auth/change-email - Initiate email change with verification
  .post("/change-email", zValidator("json", ChangeEmailSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { email } = c.req.valid("json");

    try {
      // Check if the new email is already in use
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email.toLowerCase()),
      });

      if (existingUser) {
        return c.json(
          {
            error: "This email is already in use",
            field: "email",
          },
          409
        );
      }

      // Get current user for old email address
      const currentUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { email: true },
      });

      if (!currentUser) {
        return c.json({ error: "User not found" }, 404);
      }

      if (!currentUser.email) {
        return c.json(
          { error: "Cannot change email - no current email set" },
          400
        );
      }

      // Generate verification code and prepare verification
      const { otp, verifyUrl } = await prepareVerification({
        period: 10 * 60,
        type: "change-email",
        target: currentUser.email,
        request: c.req.raw,
      });

      // Send verification email to new email address
      await sendEmailChangeEmail({
        to: email,
        otp,
      });

      return c.json({
        success: true,
        verifyUrl: verifyUrl.toString(),
        newEmail: email,
        message: "Verification code sent to new email address",
      });
    } catch (error) {
      console.error("Change email error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  .put("/update-email", zValidator("json", UpdateEmailSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { oldEmail, newEmail } = c.req.valid("json");

    try {
      await db
        .update(user)
        .set({
          email: newEmail,
        })
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          email: user.email,
        });

      await sendEmailChangeNoticeEmail({
        to: oldEmail,
        userId,
      });

      return c.json({
        success: true,
        newEmail,
      });
    } catch (error) {
      console.error("Update email error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // POST /api/auth/add-email - Add email for users who signed up via OAuth without email
  .post("/add-email", zValidator("json", ChangeEmailSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);

    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { email } = c.req.valid("json");

    try {
      // Check if the email is already in use
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email.toLowerCase()),
      });

      if (existingUser) {
        return c.json(
          {
            error: "This email is already in use",
            field: "email",
          },
          409
        );
      }

      // Get current user to check they don't already have an email
      const currentUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { email: true },
      });

      if (!currentUser) {
        return c.json({ error: "User not found" }, 404);
      }

      if (currentUser.email) {
        return c.json(
          { error: "You already have an email set. Use change-email instead." },
          400
        );
      }

      // Generate verification code and prepare verification
      const { otp, verifyUrl } = await prepareVerification({
        period: 10 * 60,
        type: "add-email",
        target: email.toLowerCase(),
        request: c.req.raw,
      });

      // Send verification email
      await sendEmailChangeEmail({
        to: email,
        otp,
      });

      return c.json({
        success: true,
        verifyUrl: verifyUrl.toString(),
        newEmail: email,
        message: "Verification code sent to email address",
      });
    } catch (error) {
      console.error("Add email error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  // PUT /api/auth/set-email - Set email after verification (for users without existing email)
  .put("/set-email", zValidator("json", ChangeEmailSchema), async (c) => {
    const userId = await getUserIdFromSession(c.req.raw);
    if (!userId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { email } = c.req.valid("json");

    try {
      await db
        .update(user)
        .set({
          email: email.toLowerCase(),
        })
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          email: user.email,
        });

      return c.json({
        success: true,
        email: email.toLowerCase(),
      });
    } catch (error) {
      console.error("Set email error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })
  .post(
    "/forgot-password",
    zValidator("json", ForgotPasswordSchema),
    async (c) => {
      const { email } = c.req.valid("json");

      try {
        const { otp, verifyUrl } = await prepareVerification({
          period: 10 * 60,
          request: c.req.raw,
          type: "reset-password",
          target: email,
        });

        await sendPasswordResetEmail({
          to: email,
          otp,
        });
        return c.json({
          success: true,
          verifyUrl: verifyUrl.toString(),
          email,
        });
      } catch (error) {
        return c.json(
          {
            error: "Internal server error",
          },
          500
        );
      }
    }
  )
  // GET /api/auth/client-metadata - Get OAuth client metadata
  .get("/client-metadata", async (c) => {
    try {
      const oauthClient = await createOAuthClient(c.req.raw);

      return c.json(oauthClient.clientMetadata, {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error("Failed to get client metadata:", error);
      return c.json(
        {
          error: "Internal server error",
        },
        500
      );
    }
  })
  // GET /api/auth/jwks - Get OAuth JWKs
  .get("/jwks", async (c) => {
    try {
      const oauthClient = await createOAuthClient(c.req.raw);

      return c.json(oauthClient.jwks, {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error("Failed to get jwks:", error);
      return c.json(
        {
          error: "Internal server error",
        },
        500
      );
    }
  });

/**
 * Extracts session ID from cookie header
 */
function getSessionIdFromCookie(
  cookieHeader: string | undefined
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === "sessionId") {
      return value;
    }
  }
  return null;
}

export default auth;

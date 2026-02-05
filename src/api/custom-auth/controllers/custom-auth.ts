import { Core } from "@strapi/strapi";
import crypto from "crypto";

const VERIFICATION_CODE_EXPIRY = 1 * 70 * 1000; // 70 seconds (1 minute 10 seconds)
const VERIFICATION_RESET_CODE_EXPIRY = 3 * 60 * 1000; // 3 minutes

const bcrypt = require("bcryptjs");

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async register(ctx) {
    try {
      const { email, password, username, firstName, lastName } =
        ctx.request.body;

      // Check if user exists
      const existingUser = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { email: email.toLowerCase() },
        });

      if (existingUser) {
        return ctx.badRequest("Email already registered");
      }

      // Get the public role
      const publicRole = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { type: "public" },
        });

      if (!publicRole) {
        return ctx.internalServerError("Public role not found");
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const codeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

      // Create user with public role and unconfirmed status
      const user = await strapi
        .plugin("users-permissions")
        .service("user")
        .add({
          username: username || email,
          email: email.toLowerCase(),
          password,
          firstName,
          lastName,
          provider: "local",
          confirmed: false,
          blocked: false,
          role: publicRole.id,
          verificationCode,
          verificationCodeExpiry: codeExpiry,
        });

      // Send verification email
      try {
        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: email,
            subject: "Verify your email",
            html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f9f9f9; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h2 style="text-align: center; color: #222;">Welcome to ShopHub 👋</h2>
              <p style="font-size: 16px;">Thank you for signing up! Please use the verification code below to complete your registration:</p>
              <div style="margin: 24px 0; text-align: center;">
                <span style="display: inline-block; font-size: 36px; font-weight: bold; background: #eef1f8; color: #2b2b2b; padding: 16px 32px; border-radius: 8px; letter-spacing: 6px;">
                  ${verificationCode}
                </span>
              </div>
              <p style="font-size: 14px; color: #555;">This code will expire in <strong>1 minute</strong>. If you didn't sign up for this, you can safely ignore this email.</p>
              <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999; text-align: center;">© ${new Date().getFullYear()} ShopHub. All rights reserved.</p>
            </div>
          </div>
        `,
          });
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Delete the user if email fails
        await strapi.db
          .query("plugin::users-permissions.user")
          .delete({ where: { id: user.id } });
        return ctx.internalServerError("Failed to send verification email");
      }

      return ctx.send({
        message:
          "Registration successful. Please check your email for verification code.",
        email: user.email,
      });
    } catch (error) {
      console.error("Registration error:", error);
      return ctx.internalServerError("Registration failed");
    }
  },

  async verifyEmail(ctx) {
    try {
      const { email, code } = ctx.request.body;

      if (!email || !code) {
        return ctx.badRequest("Email and verification code are required");
      }

      // Find user with verification code
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email.toLowerCase(),
            verificationCode: code,
          },
        });

      if (!user) {
        return ctx.badRequest("Invalid verification code");
      }

      // Check if code is expired
      if (new Date() > new Date(user.verificationCodeExpiry)) {
        return ctx.badRequest("Verification code has expired");
      }

      // Get customer role (default for new users)
      const customerRole = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { type: "customer" },
        });

      if (!customerRole) {
        return ctx.internalServerError("Customer role not found. Please ensure a role with type 'customer' exists.");
      }

      // Update user: confirm email, change role, clear verification code
      const updatedUser = await strapi.db
        .query("plugin::users-permissions.user")
        .update({
          where: { id: user.id },
          data: {
            confirmed: true,
            role: customerRole.id,
            verificationCode: null,
            verificationCodeExpiry: null,
          },
        });

      // Generate JWT token
      const token = strapi
        .plugin("users-permissions")
        .service("jwt")
        .issue({ id: user.id });

      return ctx.send({
        jwt: token,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          confirmed: updatedUser.confirmed,
          role: customerRole.name,
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      return ctx.internalServerError(error instanceof Error ? error.message : "Email verification failed");
    }
  },

  async resendCode(ctx) {
    try {
      const { email } = ctx.request.body;

      if (!email) {
        return ctx.badRequest("Email is required");
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email.toLowerCase(),
            confirmed: false,
          },
        });

      if (!user) {
        return ctx.badRequest("User not found or already verified");
      }

      // Generate new 6-digit verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const codeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

      // Update user with new code
      await strapi.db.query("plugin::users-permissions.user").update({
        where: { id: user.id },
        data: {
          verificationCode,
          verificationCodeExpiry: codeExpiry,
        },
      });

      // Send verification email
      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: email,
          subject: "Verify your email - New code",
          html: `
          <h1>Email Verification</h1>
          <p>Your new verification code is:</p>
          <h2 style="background: #f4f4f4; padding: 10px; text-align: center; font-size: 32px; letter-spacing: 5px;">${verificationCode}</h2>
          <p>This code will expire in 1 minute.</p>
        `,
        });

      return ctx.send({
        message: "Verification code sent successfully",
      });
    } catch (error) {
      console.error("Resend code error:", error);
      return ctx.internalServerError("Failed to resend verification code");
    }
  },

  async forgotPassword(ctx) {
    try {
      const { email } = ctx.request.body;

      if (!email) {
        return ctx.badRequest("Email is required");
      }

      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email.toLowerCase(),
            confirmed: true,
          },
        });

      if (!user) {
        // Don't reveal if email exists or not for security
        return ctx.send({
          message: "If the email exists, a password reset code has been sent.",
        });
      }

      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

      // Generate secure token for URL-based reset (alternative method)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

      // Store both reset code and token
      await strapi.db.query("plugin::users-permissions.user").update({
        where: { id: user.id },
        data: {
          verificationCode: resetCode,
          verificationCodeExpiry: codeExpiry,
          resetPasswordToken: resetToken,
          resetPasswordExpiry: tokenExpiry,
        },
      });

      // Get frontend URL from environment or config
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      // Send password reset email
      await strapi
        .plugin("email")
        .service("email")
        .send({
          to: email,
          subject: "Reset Your Password - ShopHub",
          html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #f9f9f9; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <h2 style="text-align: center; color: #222;">Password Reset Request 🔒</h2>
              
              <p style="font-size: 16px;">We received a request to reset your password. You can reset your password using the code:</p>
              
              <div style="margin: 24px 0;">
                <p style="font-size: 14px; margin-bottom: 12px;">Enter this 6-digit code in the app:</p>
                <div style="text-align: center; margin: 16px 0;">
                  <span style="display: inline-block; font-size: 32px; font-weight: bold; background: #eef1f8; color: #2b2b2b; padding: 16px 32px; border-radius: 8px; letter-spacing: 6px;">
                    ${resetCode}
                  </span>
                </div>
              </div>

              <div style="margin: 24px 0; padding: 16px; background: #fff3cd; border-radius: 6px; border: 1px solid #ffeaa7;">
                <p style="font-size: 14px; color: #856404; margin: 0;">
                  <strong>⚠️ Security Notice:</strong><br>
                  • This code will expire in <strong>1 minute</strong><br>
                  • If you didn't request this reset, please ignore this email<br>
                  • Your password will remain unchanged unless you complete the reset process
                </p>
              </div>

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} ShopHub. All rights reserved.<br>
                This email was sent to ${email}
              </p>
            </div>
          </div>
        `,
        });

      return ctx.send({
        message:
          "If the email exists, a password reset code has been sent.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return ctx.internalServerError(
        "Failed to process password reset request"
      );
    }
  },

  async validateResetCode(ctx) {
    try {
      const { email, code } = ctx.request.body;

      if (!email || !code) {
        return ctx.badRequest("Email and code are required");
      }

      // Find user with reset code
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email.toLowerCase(),
            verificationCode: code,
          },
        });

      if (!user) {
        return ctx.send({ valid: false });
      }

      // Check if code is expired
      if (new Date() > new Date(user.verificationCodeExpiry)) {
        return ctx.send({ valid: false });
      } else {
        // Extend expiry time after validation
        const codeExpiry = new Date(
          Date.now() + VERIFICATION_RESET_CODE_EXPIRY
        );
        await strapi.plugin("users-permissions").service("user").edit(user.id, {
          verificationCodeExpiry: codeExpiry,
        });
      }

      return ctx.send({ valid: true });
    } catch (error) {
      console.error("Validate reset code error:", error);
      return ctx.internalServerError("Failed to validate reset code");
    }
  },

  async resetPassword(ctx) {
    try {
      const { email, code, password } = ctx.request.body;

      if (!email || !code || !password) {
        return ctx.badRequest("Email, code, and new password are required");
      }

      // Validate password strength
      if (password.length < 6) {
        return ctx.badRequest("Password must be at least 6 characters long");
      }

      // Find user with reset code
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            email: email.toLowerCase(),
            verificationCode: code,
          },
        });

      if (!user) {
        return ctx.badRequest("Invalid reset code");
      }

      // Check if code is expired
      if (new Date() > new Date(user.verificationCodeExpiry)) {
        return ctx.badRequest("Reset code has expired");
      }

      // Check if new password is same as current
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return ctx.badRequest(
          "New password cannot be the same as the current password"
        );
      }

      // Update password
      await strapi.plugin("users-permissions").service("user").edit(user.id, {
        password,
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      return ctx.send({
        message: "Password has been reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return ctx.internalServerError("Failed to reset password");
    }
  },

  async login(ctx) {
    try {
      const { identifier, password } = ctx.request.body;

      if (!identifier || !password) {
        return ctx.badRequest("Email and password are required");
      }

      // Find user with role populated
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: {
            $or: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
          populate: ["role"],
        });

      if (!user) {
        return ctx.badRequest("Invalid credentials");
      }

      // Verify password
      const validPassword = await strapi.plugins[
        "users-permissions"
      ].services.user.validatePassword(password, user.password);

      if (!validPassword) {
        return ctx.badRequest("Invalid credentials");
      }

      // Check if user is confirmed
      if (!user.confirmed) {
        return ctx.badRequest(
          "Email not confirmed. Please verify your email first."
        );
      }

      // Check if user is blocked
      if (user.blocked) {
        return ctx.badRequest("Account is blocked. Please contact support.");
      }

      // Generate JWT token
      const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
        id: user.id,
      });

      // Return user data with role information
      return ctx.send({
        jwt,
        user: {
          id: user.id,
          documentId: user.documentId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          confirmed: user.confirmed,
          blocked: user.blocked,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Custom login error:", error);
      return ctx.internalServerError("Login failed");
    }
  },

  async updateProfile(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      const { username, email, firstName, lastName } = ctx.request.body;
      const updateData: any = {};

      if (username !== undefined) updateData.username = username;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

      // Email check
      if (email !== undefined && email !== "") {
        const normalizedEmail = email.toLowerCase();
        const existingEmail = await strapi.db
          .query("plugin::users-permissions.user")
          .findOne({
            where: { email: normalizedEmail, id: { $ne: userId } },
          });

        if (existingEmail) {
          return ctx.badRequest("This email is already in use");
        }

        updateData.email = normalizedEmail;
      }

      // Update user
      const updatedUser = await strapi.entityService.update(
        "plugin::users-permissions.user",
        userId,
        { data: updateData }
      );

      // Strip sensitive fields
      const {
        password,
        resetPasswordToken,
        confirmationToken,
        ...sanitizedUser
      } = updatedUser;

      return ctx.send({ user: sanitizedUser });
    } catch (error) {
      console.error("Update profile error:", error);
      return ctx.internalServerError("Failed to update profile");
    }
  },

  async changePassword(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      const { currentPassword, newPassword } = ctx.request.body;

      if (!currentPassword || !newPassword) {
        return ctx.badRequest("Current and new passwords are required");
      }

      if (newPassword.length < 8) {
        return ctx.badRequest(
          "New password must be at least 8 characters long"
        );
      }

      // Get user
      const user = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({ where: { id: userId } });

      if (!user) {
        return ctx.notFound("User not found");
      }

      // Validate current password
      const validPassword = await strapi
        .plugin("users-permissions")
        .service("user")
        .validatePassword(currentPassword, user.password);

      if (!validPassword) {
        return ctx.badRequest("Current password is incorrect");
      }

      // Update to new password
      await strapi
        .plugin("users-permissions")
        .service("user")
        .edit(userId, { password: newPassword });

      return ctx.send({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      return ctx.internalServerError("Failed to change password");
    }
  },

  async deleteAccount(ctx) {
    try {
      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized("User not authenticated");
      }

      // Delete user account
      await strapi.db
        .query("plugin::users-permissions.user")
        .delete({ where: { id: userId } });

      return ctx.send({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      return ctx.internalServerError("Failed to delete account");
    }
  },
});

export default ({ env }) => ({
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: env("SMTP_HOST", "smtp.gmail.com"),
        port: env.int("SMTP_PORT", 587),
        secure: false, // true for 465, false for 587
        auth: {
          user: env("SMTP_USERNAME"),
          pass: env("SMTP_PASSWORD"),
        },
        tls: {
          rejectUnauthorized: false, // Accept self-signed certificates
        },
      },
      settings: {
        defaultFrom: env("SMTP_FROM_EMAIL", "noreply@example.com"),
        defaultReplyTo: env("SMTP_FROM_EMAIL", "noreply@example.com"),
      },
    },
  },
});

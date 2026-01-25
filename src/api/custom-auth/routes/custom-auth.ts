export default {
  routes: [
    {
      method: "POST",
      path: "/custom-auth/register",
      handler: "custom-auth.register",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "POST",
      path: "/custom-auth/verify-email",
      handler: "custom-auth.verifyEmail",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "POST",
      path: "/custom-auth/resend-code",
      handler: "custom-auth.resendCode",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "POST",
      path: "/custom-auth/login",
      handler: "custom-auth.login",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "POST",
      path: "/custom-auth/forgot-password",
      handler: "custom-auth.forgotPassword",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "POST",
      path: "/custom-auth/validate-reset-code",
      handler: "custom-auth.validateResetCode",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "POST",
      path: "/custom-auth/reset-password",
      handler: "custom-auth.resetPassword",
      config: { 
        auth: false,
        policies: []
      },
    },
    {
      method: "PUT",
      path: "/custom-auth/update-profile",
      handler: "custom-auth.updateProfile",
      config: { 
        policies: []
      },
    },
    {
      method: "PUT",
      path: "/custom-auth/change-password",
      handler: "custom-auth.changePassword",
      config: { 
        policies: []
      },
    },
    {
      method: "DELETE",
      path: "/custom-auth/delete-account",
      handler: "custom-auth.deleteAccount",
      config: { 
        policies: []
      },
    },
  ],
};


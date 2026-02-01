// Convex authentication configuration for Clerk
// This tells Convex how to validate Clerk JWTs

export default {
  providers: [
    {
      // Clerk domain - replace with your actual Clerk domain
      // You'll get this from your Clerk dashboard
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

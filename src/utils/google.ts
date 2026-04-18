import { OAuth2Client, TokenPayload } from "google-auth-library";

const client = new OAuth2Client();

export const verifyGoogleIdToken = async (idToken: string) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: googleClientId
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google token payload");
  }

  return payload as TokenPayload;
};

import { createRemoteJWKSet, jwtVerify } from "jose";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";

const OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL!;

interface OidcConfig {
  jwks_uri: string;
  userinfo_endpoint: string;
}

let oidcConfig: OidcConfig | null = null;
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

async function getOidcConfig(): Promise<OidcConfig> {
  if (oidcConfig) return oidcConfig;
  const res = await fetch(
    `${OIDC_ISSUER_URL}/.well-known/openid-configuration`,
  );
  oidcConfig = (await res.json()) as OidcConfig;
  return oidcConfig;
}

async function getJWKS() {
  if (JWKS) return JWKS;
  const config = await getOidcConfig();
  JWKS = createRemoteJWKSet(new URL(config.jwks_uri));
  return JWKS;
}

async function getUserinfoEndpoint(): Promise<string> {
  const config = await getOidcConfig();
  return config.userinfo_endpoint;
}

export async function verifyOidcToken(
  token: string,
): Promise<{ userId: string; username: string }> {
  const jwksSet = await getJWKS();
  const { payload } = await jwtVerify(token, jwksSet, {
    issuer: OIDC_ISSUER_URL,
  });

  const oidcSub = payload.sub!;

  // Fetch profile from userinfo endpoint — access token claims only contain sub
  let username = oidcSub;
  try {
    const userinfoRes = await fetch(await getUserinfoEndpoint(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (userinfoRes.ok) {
      const userinfo = await userinfoRes.json();
      username = (userinfo.preferred_username ??
        userinfo.name ??
        userinfo.email ??
        oidcSub) as string;
    } else {
      console.warn("Userinfo endpoint returned", userinfoRes.status);
    }
  } catch (err) {
    console.warn("Userinfo fetch failed, falling back to sub:", err);
  }

  // Upsert: create user on first login, update username if changed
  const user = await prisma.user.upsert({
    where: { oidcSub },
    update: { username },
    create: { oidcSub, username },
    select: { id: true, username: true },
  });

  return { userId: user.id, username: user.username };
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header missing" });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Token missing" });
    return;
  }
  try {
    const decoded = await verifyOidcToken(token);
    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

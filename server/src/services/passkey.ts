import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/types";
import { prisma } from "../prisma";

const rpID = process.env.RP_ID || "localhost";
const rpName = process.env.RP_NAME || "Skedoodle";
const rpOrigin = process.env.RP_ORIGIN || "";

// In-memory challenge store (per-user, short-lived)
const challengeStore = new Map<string, string>();

export async function getRegistrationOptions(username: string) {
  const existingUser = await prisma.user.findUnique({
    where: { username },
    include: { credentials: true },
  });

  if (existingUser) {
    throw new Error("Username already taken");
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  challengeStore.set(`reg:${username}`, options.challenge);
  return options;
}

export async function verifyRegistration(
  username: string,
  response: RegistrationResponseJSON
) {
  const expectedChallenge = challengeStore.get(`reg:${username}`);
  if (!expectedChallenge) {
    throw new Error("Registration challenge not found or expired");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  challengeStore.delete(`reg:${username}`);

  const { credential } = verification.registrationInfo;

  const user = await prisma.user.create({
    data: {
      username,
      credentials: {
        create: {
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: response.response.transports
            ? JSON.stringify(response.response.transports)
            : null,
        },
      },
    },
  });

  return user;
}

export async function getLoginOptions(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { credentials: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.credentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports
        ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    userVerification: "preferred",
  });

  challengeStore.set(`auth:${user.id}`, options.challenge);
  return { options, userId: user.id };
}

export async function verifyLogin(
  username: string,
  response: AuthenticationResponseJSON
) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { credentials: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const expectedChallenge = challengeStore.get(`auth:${user.id}`);
  if (!expectedChallenge) {
    throw new Error("Authentication challenge not found or expired");
  }

  const credential = user.credentials.find(
    (c) => c.credentialId === response.id
  );
  if (!credential) {
    throw new Error("Credential not found");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: Number(credential.counter),
      transports: credential.transports
        ? (JSON.parse(credential.transports) as AuthenticatorTransportFuture[])
        : undefined,
    },
  });

  if (!verification.verified) {
    throw new Error("Authentication verification failed");
  }

  challengeStore.delete(`auth:${user.id}`);

  // Update counter
  await prisma.credential.update({
    where: { id: credential.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  return user;
}

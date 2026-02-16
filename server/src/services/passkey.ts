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
import { PrismaClient, Credential as PrismaCredential } from "@prisma/client";

const prisma = new PrismaClient();

const rpID = "localhost";
const rpName = "Skedoodle";
const rpOrigin = "http://localhost:5173";

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

  await prisma.challenge.create({
    data: {
        challenge: options.challenge,
    },
  });

  return options;
}

export async function verifyRegistration(
  username: string,
  response: RegistrationResponseJSON
) {
  const challenge = await prisma.challenge.findFirst({
    where: { challenge: response.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    throw new Error("Registration challenge not found or expired");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  await prisma.challenge.delete({ where: { id: challenge.id } });

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
    allowCredentials: user.credentials.map((cred: PrismaCredential) => ({
      id: cred.credentialId,
      transports: cred.transports
        ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
        : undefined,
    })),
    userVerification: "preferred",
  });

  await prisma.challenge.create({
    data: {
      challenge: options.challenge,
    },
  });

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

  const challenge = await prisma.challenge.findFirst({
    where: {
        challenge: response.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    throw new Error("Authentication challenge not found or expired");
  }
  
  const credential = user.credentials.find(
    (c: PrismaCredential) => c.credentialId === response.id
  );
  if (!credential) {
    throw new Error("Credential not found");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
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

  await prisma.challenge.delete({ where: { id: challenge.id } });

  // Update counter
  await prisma.credential.update({
    where: { id: credential.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  return user;
}
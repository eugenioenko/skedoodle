import { ProfileSchema } from "@/schemas/profile-schema";
import prisma from "@/services/prisma.client";
import { validateSchemaOrThrow } from "@/utils/validate-request";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const req = await request.json();
    const content = validateSchemaOrThrow(ProfileSchema, req);

    const profile = {};
    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (err: any) {
    const error = "Unexpected error when updating profile";
    return NextResponse.json({ error, data: null }, { status: 409 });
  }
}

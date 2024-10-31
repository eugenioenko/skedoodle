import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({ data: {} }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: "Profile not found" },
      { status: 404 }
    );
  }
}

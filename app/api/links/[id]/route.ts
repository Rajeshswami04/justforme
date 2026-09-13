import { NextRequest, NextResponse } from "next/server";
import { deleteEntry, checkAuth } from "@/lib/store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!checkAuth(req.headers.get("x-app-password"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await deleteEntry(params.id);
  return NextResponse.json({ ok: true });
}

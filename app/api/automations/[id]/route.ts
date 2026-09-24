import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.ativa === "boolean") {
    await query("update automations set ativa = $1 where id = $2", [
      body.ativa,
      id,
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await query("delete from automations where id = $1", [id]);
  return NextResponse.json({ ok: true });
}

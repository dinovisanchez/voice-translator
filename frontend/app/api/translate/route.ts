import { NextResponse } from "next/server";
import { API_URL } from "../../../services/config";

export async function POST(req: Request) {
  const body = await req.json();

  const response = await fetch(`${API_URL}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return NextResponse.json(data);
}

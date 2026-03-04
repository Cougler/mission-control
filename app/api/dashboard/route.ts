import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

type MarketMetadata = {
  marketId: number;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt?: number;
};

export async function POST(request: Request) {
  try {
    if (!redis) {
      return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
    }

    const body = (await request.json()) as MarketMetadata;
    if (!body || typeof body.marketId !== "number") {
      return NextResponse.json({ error: "marketId is required" }, { status: 400 });
    }

    const key = `market:meta:${body.marketId}`;
    const payload: Record<string, string> = {
      marketId: String(body.marketId),
      title: body.title ?? "",
      description: body.description ?? "",
      tags: body.tags ? JSON.stringify(body.tags) : "[]",
      createdAt: String(body.createdAt ?? Date.now()),
    };

    await redis.hset(key, payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}




import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Security check: prevent directory traversal
    const safeSegments = pathSegments.filter((seg) => !seg.includes("..") && !seg.includes("/") && !seg.includes("\\"));
    if (safeSegments.length !== pathSegments.length) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const relativeSubPath = safeSegments.join(path.sep);

    // Check multiple potential locations on disk:
    // 1. public/uploads/...
    // 2. uploads/...
    const candidatePaths = [
      path.join(process.cwd(), "public", "uploads", relativeSubPath),
      path.join(process.cwd(), "uploads", relativeSubPath),
    ];

    let foundPath: string | null = null;
    for (const candidate of candidatePaths) {
      try {
        const fileStat = await stat(candidate);
        if (fileStat.isFile()) {
          foundPath = candidate;
          break;
        }
      } catch {
        // File does not exist at this candidate path
      }
    }

    if (!foundPath) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const ext = path.extname(foundPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const fileBuffer = await readFile(foundPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error serving uploaded asset:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

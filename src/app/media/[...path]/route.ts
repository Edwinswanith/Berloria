import { getAdminSession } from "@/lib/auth/admin";
import { PRIVATE_FOLDERS, readImage, urlToKey, type Folder } from "@/lib/storage";

/**
 * Serves stored images. Gallery images are public; source photos and unreviewed AI
 * candidates are only visible to signed-in staff.
 */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const key = urlToKey(`/media/${path.join("/")}`);
  if (!key) return new Response("Not found", { status: 404 });

  const isPrivate = PRIVATE_FOLDERS.includes(key.split("/")[0] as Folder);
  // Answer 404 (not 401) so private file names can't be probed.
  if (isPrivate && !(await getAdminSession())) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readImage(key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

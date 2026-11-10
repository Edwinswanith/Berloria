import { SOURCE_VIEWS, type SourceView } from "@/lib/db/models";
import { fail, guard, ok, toErrorResponse } from "@/lib/admin/http";
import { addSourcePhoto } from "@/lib/admin/products";
import { MAX_UPLOAD_BYTES } from "@/lib/media/process";

/** Upload one photo of the real garment (front, back or side). */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/products/[id]/photos">) {
  try {
    await guard(request);
    const { id } = await ctx.params;
    const form = await request.formData();
    const view = form.get("view");
    const file = form.get("file");
    if (typeof view !== "string" || !SOURCE_VIEWS.includes(view as SourceView)) return fail("Choose front, back or side.", 400);
    if (!(file instanceof File) || file.size === 0) return fail("Choose a photo to upload.", 400);
    if (file.size > MAX_UPLOAD_BYTES) return fail("That photo is larger than 12 MB. Please use a smaller file.", 413);

    const url = await addSourcePhoto(id, view as SourceView, Buffer.from(await file.arrayBuffer()));
    return ok({ url, view });
  } catch (error: unknown) {
    return toErrorResponse("api.admin.photos", error);
  }
}

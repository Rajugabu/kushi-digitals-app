import { supabase } from "./supabase";

export const STUDIO_TEMPLATE_ASSET_BUCKET = "studio-template-assets";
export const STUDIO_TEMPLATE_MAX_ASSET_SIZE = 20 * 1024 * 1024;
export const STUDIO_TEMPLATE_ALLOWED_ASSET_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const templateFields = `
  id,
  slug,
  title,
  category,
  type,
  is_premium,
  status,
  canvas,
  background_path,
  foreground_overlay_path,
  photo_slot,
  name_slot,
  sort_order,
  created_by,
  created_at,
  updated_at,
  published_at
`;

const getAssetPublicUrl = (path) => {
  if (!path) {
    return "";
  }

  const { data } = supabase.storage
    .from(STUDIO_TEMPLATE_ASSET_BUCKET)
    .getPublicUrl(path);

  return data?.publicUrl || "";
};

export const mapStudioTemplateRecord = (record) => ({
  id: record.id,
  slug: record.slug,
  type: record.type || "photo",
  title: record.title,
  category: record.category,
  isPremium: Boolean(record.is_premium),
  status: record.status,
  canvas: record.canvas || { width: 1080, height: 1350, ratio: "4:5" },
  backgroundPath: record.background_path || "",
  backgroundImage: getAssetPublicUrl(record.background_path),
  foregroundOverlayPath: record.foreground_overlay_path || "",
  foregroundOverlayImage: getAssetPublicUrl(record.foreground_overlay_path),
  photoSlot: record.photo_slot || {},
  nameSlot: record.name_slot || {},
  sortOrder: Number(record.sort_order) || 0,
  createdBy: record.created_by,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
  publishedAt: record.published_at,
  showDesignText: false,
  source: "admin-published",
});

export async function getPublishedStudioTemplates() {
  const { data, error } = await supabase
    .from("studio_templates")
    .select(templateFields)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapStudioTemplateRecord);
}

export async function getAdminStudioTemplates() {
  const { data, error } = await supabase
    .from("studio_templates")
    .select(templateFields)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapStudioTemplateRecord);
}

export function validateStudioTemplateAsset(file, label = "Asset") {
  if (!STUDIO_TEMPLATE_ALLOWED_ASSET_TYPES.includes(file?.type)) {
    throw new Error(`${label} must be a JPG, PNG or WEBP image.`);
  }

  if (file.size > STUDIO_TEMPLATE_MAX_ASSET_SIZE) {
    throw new Error(`${label} must be 20 MB or smaller.`);
  }
}

const safeFilename = (name = "asset") =>
  name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "asset";

export async function uploadStudioTemplateAsset(file, templateId, kind) {
  validateStudioTemplateAsset(
    file,
    kind === "background" ? "Template background" : "Foreground overlay",
  );

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const uniquePart = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  const path = `${templateId}/${kind}/${Date.now()}-${uniquePart}-${safeFilename(
    file.name,
  )}.${extension}`;

  const { error } = await supabase.storage
    .from(STUDIO_TEMPLATE_ASSET_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    path,
    publicUrl: getAssetPublicUrl(path),
  };
}

export async function removeStudioTemplateAssets(paths = []) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (!uniquePaths.length) {
    return;
  }

  const { error } = await supabase.storage
    .from(STUDIO_TEMPLATE_ASSET_BUCKET)
    .remove(uniquePaths);

  if (error) {
    throw error;
  }
}

export const slugifyStudioTemplate = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "studio-template";

export async function saveStudioTemplate({ id, values }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Your admin session has expired. Please sign in again.");
  }

  const payload = {
    slug: values.slug,
    title: values.title,
    category: values.category,
    type: values.type,
    is_premium: values.isPremium,
    status: values.status,
    canvas: values.canvas,
    background_path: values.backgroundPath || null,
    foreground_overlay_path: values.foregroundOverlayPath || null,
    photo_slot: values.photoSlot,
    name_slot: values.nameSlot,
    sort_order: values.sortOrder,
  };

  if (values.isExisting) {
    const { data, error } = await supabase
      .from("studio_templates")
      .update(payload)
      .eq("id", id)
      .select(templateFields)
      .single();

    if (error) {
      throw error;
    }

    return mapStudioTemplateRecord(data);
  }

  const { data, error } = await supabase
    .from("studio_templates")
    .insert({
      id,
      ...payload,
      created_by: user.id,
    })
    .select(templateFields)
    .single();

  if (error) {
    throw error;
  }

  return mapStudioTemplateRecord(data);
}

export async function setStudioTemplateStatus(template, status) {
  const { data, error } = await supabase
    .from("studio_templates")
    .update({ status })
    .eq("id", template.id)
    .select(templateFields)
    .single();

  if (error) {
    throw error;
  }

  return mapStudioTemplateRecord(data);
}

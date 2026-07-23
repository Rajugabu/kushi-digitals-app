import {
  ADMIN_BLOG_PAGE_SIZE,
  BLOG_ALLOWED_IMAGE_TYPES,
  BLOG_IMAGE_BUCKET,
  BLOG_MAX_IMAGE_SIZE,
  BLOG_PAGE_SIZE,
} from "../config/blog";
import { supabase } from "./supabase";

const publicPostFields = `
  id,
  title,
  slug,
  excerpt,
  cover_image_url,
  category_id,
  is_featured,
  published_at,
  updated_at,
  reading_time_minutes,
  tags,
  view_count,
  blog_categories (
    id,
    name,
    slug
  )
`;

const adminPostFields = `
  id,
  title,
  slug,
  excerpt,
  content,
  cover_image_url,
  cover_image_path,
  category_id,
  author_id,
  status,
  is_featured,
  published_at,
  scheduled_at,
  seo_title,
  seo_description,
  canonical_url,
  reading_time_minutes,
  view_count,
  tags,
  created_at,
  updated_at,
  blog_categories (
    id,
    name,
    slug
  )
`;

const sanitizeSearchTerm = (value = "") =>
  value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export async function getBlogCategories() {
  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPublishedPosts({
  page = 1,
  pageSize = BLOG_PAGE_SIZE,
  search = "",
  categoryId = "",
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const safeSearch = sanitizeSearchTerm(search);

  let query = supabase
    .from("blog_posts")
    .select(publicPostFields, {
      count: "exact",
    })
    .eq("status", "published")
    .lte(
      "published_at",
      new Date().toISOString(),
    )
    .order("published_at", {
      ascending: false,
    })
    .range(from, to);

  if (safeSearch) {
    query = query.or(
      `title.ilike.%${safeSearch}%,excerpt.ilike.%${safeSearch}%`,
    );
  }

  if (categoryId) {
    query = query.eq(
      "category_id",
      categoryId,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    posts: data || [],
    count: count || 0,
  };
}

export async function getFeaturedPost() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(publicPostFields)
    .eq("status", "published")
    .eq("is_featured", true)
    .lte(
      "published_at",
      new Date().toISOString(),
    )
    .order("published_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function getLatestPosts(limit = 3) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(publicPostFields)
    .eq("status", "published")
    .lte(
      "published_at",
      new Date().toISOString(),
    )
    .order("published_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getPublishedPostBySlug(
  slug,
) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(adminPostFields)
    .eq("slug", slug)
    .eq("status", "published")
    .lte(
      "published_at",
      new Date().toISOString(),
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function getRelatedPosts(post) {
  const now = new Date().toISOString();
  const related = [];

  if (post.category_id) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select(publicPostFields)
      .eq("status", "published")
      .eq("category_id", post.category_id)
      .neq("id", post.id)
      .lte("published_at", now)
      .order("published_at", {
        ascending: false,
      })
      .limit(3);

    if (error) {
      throw error;
    }

    related.push(...(data || []));
  }

  if (related.length < 3) {
    let query = supabase
      .from("blog_posts")
      .select(publicPostFields)
      .eq("status", "published")
      .neq("id", post.id)
      .lte("published_at", now)
      .order("published_at", {
        ascending: false,
      })
      .limit(6);

    if (related.length > 0) {
      query = query.not(
        "id",
        "in",
        `(${related
          .map((item) => item.id)
          .join(",")})`,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    related.push(...(data || []));
  }

  return related.slice(0, 3);
}

export async function incrementPostView(slug) {
  const { error } = await supabase.rpc(
    "increment_blog_post_view",
    {
      p_slug: slug,
    },
  );

  if (error) {
    console.error(
      "Unable to increment blog post view:",
      error,
    );
  }
}

export async function getAdminBlogStats() {
  const now = new Date().toISOString();
  const base = () =>
    supabase
      .from("blog_posts")
      .select("id", {
        count: "exact",
        head: true,
      });

  const [
    totalResult,
    publishedResult,
    draftResult,
    featuredResult,
    scheduledResult,
  ] = await Promise.all([
    base(),
    base()
      .eq("status", "published")
      .lte("published_at", now),
    base().eq("status", "draft"),
    base().eq("is_featured", true),
    base()
      .eq("status", "published")
      .gt("published_at", now),
  ]);

  const results = [
    totalResult,
    publishedResult,
    draftResult,
    featuredResult,
    scheduledResult,
  ];
  const failed = results.find(
    (result) => result.error,
  );

  if (failed) {
    throw failed.error;
  }

  return {
    total: totalResult.count || 0,
    published:
      publishedResult.count || 0,
    drafts: draftResult.count || 0,
    featured: featuredResult.count || 0,
    scheduled:
      scheduledResult.count || 0,
  };
}

export async function getAdminPosts({
  page = 1,
  pageSize = ADMIN_BLOG_PAGE_SIZE,
  search = "",
  status = "all",
  categoryId = "",
} = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const safeSearch = sanitizeSearchTerm(search);

  let query = supabase
    .from("blog_posts")
    .select(adminPostFields, {
      count: "exact",
    })
    .order("updated_at", {
      ascending: false,
    })
    .range(from, to);

  if (safeSearch) {
    query = query.or(
      `title.ilike.%${safeSearch}%,excerpt.ilike.%${safeSearch}%,slug.ilike.%${safeSearch}%`,
    );
  }

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (categoryId) {
    query = query.eq(
      "category_id",
      categoryId,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    posts: data || [],
    count: count || 0,
  };
}

export async function getAdminPostById(id) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(adminPostFields)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function isBlogSlugAvailable(
  slug,
  excludedId = null,
) {
  let query = supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", slug)
    .limit(1);

  if (excludedId) {
    query = query.neq("id", excludedId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []).length === 0;
}

export async function saveBlogPost({
  id,
  values,
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Your admin session has expired. Please sign in again.",
    );
  }

  const payload = {
    ...values,
    author_id: user.id,
  };

  if (id) {
    const { data, error } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", id)
      .select(adminPostFields)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .insert(payload)
    .select(adminPostFields)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBlogPost(
  id,
  values,
) {
  const { data, error } = await supabase
    .from("blog_posts")
    .update(values)
    .eq("id", id)
    .select(adminPostFields)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function validateBlogImage(file) {
  if (!BLOG_ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "Cover image must be a JPG, PNG or WEBP file.",
    );
  }

  if (file.size > BLOG_MAX_IMAGE_SIZE) {
    throw new Error(
      "Cover image must be 5 MB or smaller.",
    );
  }
}

export async function uploadBlogImage(
  file,
  postId,
) {
  validateBlogImage(file);

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "jpg";
  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const uniqueName = `${Date.now()}-${
    crypto.randomUUID?.() ||
    Math.random().toString(36).slice(2)
  }-${baseName || "cover"}.${extension}`;
  const path = `blog/${postId}/${uniqueName}`;

  const { error } = await supabase.storage
    .from(BLOG_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(BLOG_IMAGE_BUCKET)
    .getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}

export async function removeBlogImageIfUnused(
  path,
) {
  if (!path) {
    return;
  }

  const { count, error: countError } =
    await supabase
      .from("blog_posts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("cover_image_path", path);

  if (countError) {
    throw countError;
  }

  if ((count || 0) > 0) {
    return;
  }

  const { error } = await supabase.storage
    .from(BLOG_IMAGE_BUCKET)
    .remove([path]);

  if (error) {
    throw error;
  }
}

export async function deleteBlogPost(post) {
  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", post.id);

  if (error) {
    throw error;
  }

  if (post.cover_image_path) {
    try {
      await removeBlogImageIfUnused(
        post.cover_image_path,
      );
    } catch (cleanupError) {
      console.error(
        "Deleted post image could not be cleaned up:",
        cleanupError,
      );
    }
  }
}

export async function createBlogCategory({
  name,
  slug,
  description,
}) {
  const { data, error } = await supabase
    .from("blog_categories")
    .insert({
      name: name.trim(),
      slug,
      description:
        description.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBlogCategory(
  id,
  values,
) {
  const { data, error } = await supabase
    .from("blog_categories")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteBlogCategory(id) {
  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", id);

  if (error) {
    if (
      error.code === "23503"
    ) {
      throw new Error(
        "This category is used by one or more posts. Reassign those posts before deleting it.",
      );
    }

    throw error;
  }
}

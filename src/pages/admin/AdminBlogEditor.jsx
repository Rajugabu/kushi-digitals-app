import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileText,
  ImagePlus,
  Search,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import MarkdownRenderer from "../../components/blog/MarkdownRenderer";
import {
  BLOG_STATUS_OPTIONS,
  calculateReadingTime,
  isSafeUrl,
  isValidBlogSlug,
  normalizeTags,
  slugify,
} from "../../config/blog";
import {
  getAdminPostById,
  getBlogCategories,
  isBlogSlugAvailable,
  removeBlogImageIfUnused,
  saveBlogPost,
  uploadBlogImage,
  validateBlogImage,
} from "../../services/blog";

const initialValues = {
  title: "",
  slug: "",
  category_id: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  cover_image_path: "",
  tags: "",
  seo_title: "",
  seo_description: "",
  canonical_url: "",
  is_featured: false,
  status: "draft",
  published_at: "",
  scheduled_at: "",
};

const toDateTimeLocal = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
};

function AdminBlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [values, setValues] =
    useState(initialValues);
  const [categories, setCategories] =
    useState([]);
  const [originalPost, setOriginalPost] =
    useState(null);
  const [slugEdited, setSlugEdited] =
    useState(false);
  const [coverFile, setCoverFile] =
    useState(null);
  const [coverPreview, setCoverPreview] =
    useState("");
  const [removeCover, setRemoveCover] =
    useState(false);
  const [previewMode, setPreviewMode] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(isEditing);
  const [isSaving, setIsSaving] =
    useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");
  const [requestVersion, setRequestVersion] =
    useState(0);
  const [temporaryImageId] = useState(
    () =>
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
  );

  useEffect(() => {
    let isMounted = true;

    const loadEditor = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [categoryData, postData] =
          await Promise.all([
            getBlogCategories(),
            isEditing
              ? getAdminPostById(id)
              : Promise.resolve(null),
          ]);

        if (!isMounted) {
          return;
        }

        setCategories(categoryData);

        if (isEditing) {
          if (!postData) {
            throw new Error(
              "This blog post could not be found.",
            );
          }

          setOriginalPost(postData);
          setValues({
            title: postData.title || "",
            slug: postData.slug || "",
            category_id:
              postData.category_id || "",
            excerpt:
              postData.excerpt || "",
            content:
              postData.content || "",
            cover_image_url:
              postData.cover_image_url ||
              "",
            cover_image_path:
              postData.cover_image_path ||
              "",
            tags:
              postData.tags?.join(", ") ||
              "",
            seo_title:
              postData.seo_title || "",
            seo_description:
              postData.seo_description ||
              "",
            canonical_url:
              postData.canonical_url || "",
            is_featured:
              Boolean(
                postData.is_featured,
              ),
            status:
              postData.status || "draft",
            published_at:
              toDateTimeLocal(
                postData.published_at,
              ),
            scheduled_at:
              toDateTimeLocal(
                postData.scheduled_at,
              ),
          });
          setCoverPreview(
            postData.cover_image_url || "",
          );
          setSlugEdited(true);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load the blog editor.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEditor();

    return () => {
      isMounted = false;
    };
  }, [id, isEditing, requestVersion]);

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const updateValue = (
    field,
    value,
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
    setSuccessMessage("");
  };

  const handleTitleChange = (event) => {
    const title = event.target.value;

    setValues((current) => ({
      ...current,
      title,
      ...(!slugEdited
        ? {
            slug: slugify(title),
          }
        : {}),
    }));
  };

  const handleCoverChange = (event) => {
    const file =
      event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      validateBlogImage(file);

      if (
        coverPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(coverPreview);
      }

      setCoverFile(file);
      setCoverPreview(
        URL.createObjectURL(file),
      );
      setRemoveCover(false);
      setError("");
    } catch (imageError) {
      setError(imageError.message);
    }
  };

  const clearCover = () => {
    if (
      coverPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverFile(null);
    setCoverPreview("");
    setRemoveCover(true);
  };

  const validateForm = (mode) => {
    if (!values.title.trim()) {
      return "Please enter a post title.";
    }

    if (
      !isValidBlogSlug(values.slug)
    ) {
      return "Use a lowercase, hyphen-separated slug with letters and numbers.";
    }

    if (!values.category_id) {
      return "Please choose a category.";
    }

    if (!values.content.trim()) {
      return "Please add article content.";
    }

    if (
      values.excerpt.length > 240
    ) {
      return "Excerpt must be 240 characters or fewer.";
    }

    if (
      values.seo_title.length > 70
    ) {
      return "SEO title must be 70 characters or fewer.";
    }

    if (
      values.seo_description.length >
      180
    ) {
      return "SEO description must be 180 characters or fewer.";
    }

    if (
      values.canonical_url &&
      (!isSafeUrl(
        values.canonical_url,
        {
          allowRelative: false,
        },
      ) ||
        !values.canonical_url.startsWith(
          "https://",
        ))
    ) {
      return "Canonical URL must be a complete HTTPS URL.";
    }

    const willPublish =
      ["publish", "schedule"].includes(
        mode,
      ) ||
      (mode === "update" &&
        values.status === "published" &&
        originalPost?.status ===
          "published");
    const hasCover =
      Boolean(coverFile) ||
      Boolean(
        values.cover_image_url &&
          !removeCover,
      );

    if (
      willPublish &&
      !values.excerpt.trim()
    ) {
      return "Add a short excerpt before publishing.";
    }

    if (willPublish && !hasCover) {
      return "A cover image is required before publishing.";
    }

    if (mode === "schedule") {
      if (!values.scheduled_at) {
        return "Choose a scheduled publish date.";
      }

      if (
        new Date(
          values.scheduled_at,
        ).getTime() <= Date.now()
      ) {
        return "Scheduled publish time must be in the future.";
      }
    }

    if (
      mode === "update" &&
      values.status === "published" &&
      originalPost?.status !==
        "published"
    ) {
      return "Use Publish Now or Schedule to publish a draft explicitly.";
    }

    return "";
  };

  const savePost = async (mode) => {
    const validationError =
      validateForm(mode);

    if (validationError) {
      setError(validationError);
      return;
    }

    let uploadedImage = null;

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      const slugAvailable =
        await isBlogSlugAvailable(
          values.slug,
          id || null,
        );

      if (!slugAvailable) {
        throw new Error(
          "This slug is already in use. Choose another URL slug.",
        );
      }

      if (coverFile) {
        uploadedImage =
          await uploadBlogImage(
            coverFile,
            id || temporaryImageId,
          );
      }

      let status = values.status;
      let publishedAt =
        values.published_at
          ? new Date(
              values.published_at,
            ).toISOString()
          : null;
      let scheduledAt =
        values.scheduled_at
          ? new Date(
              values.scheduled_at,
            ).toISOString()
          : null;

      if (mode === "draft") {
        status = "draft";
        publishedAt = null;
        scheduledAt = null;
      } else if (mode === "publish") {
        status = "published";
        publishedAt =
          new Date().toISOString();
        scheduledAt = null;
      } else if (mode === "schedule") {
        status = "published";
        publishedAt = scheduledAt;
      } else if (
        status !== "published"
      ) {
        publishedAt = null;
        scheduledAt = null;
      }

      const nextCoverUrl = uploadedImage
        ? uploadedImage.publicUrl
        : removeCover
          ? null
          : values.cover_image_url ||
            null;
      const nextCoverPath =
        uploadedImage
          ? uploadedImage.path
          : removeCover
            ? null
            : values.cover_image_path ||
              null;

      const savedPost = await saveBlogPost({
        id: id || null,
        values: {
          title: values.title.trim(),
          slug: values.slug,
          category_id:
            values.category_id,
          excerpt:
            values.excerpt.trim() ||
            null,
          content: values.content.trim(),
          cover_image_url: nextCoverUrl,
          cover_image_path:
            nextCoverPath,
          tags: normalizeTags(values.tags),
          seo_title:
            values.seo_title.trim() ||
            null,
          seo_description:
            values.seo_description.trim() ||
            null,
          canonical_url:
            values.canonical_url.trim() ||
            null,
          is_featured:
            values.is_featured,
          status,
          published_at: publishedAt,
          scheduled_at: scheduledAt,
          reading_time_minutes:
            calculateReadingTime(
              values.content,
            ),
        },
      });

      const oldPath =
        originalPost?.cover_image_path;

      if (
        oldPath &&
        oldPath !== nextCoverPath
      ) {
        try {
          await removeBlogImageIfUnused(
            oldPath,
          );
        } catch (cleanupError) {
          console.error(
            "Replaced blog image could not be cleaned up:",
            cleanupError,
          );
        }
      }

      setOriginalPost(savedPost);
      setCoverFile(null);
      setRemoveCover(false);
      setSuccessMessage(
        mode === "publish"
          ? "Post published successfully."
          : mode === "schedule"
            ? "Post scheduled successfully."
            : mode === "draft"
              ? "Draft saved successfully."
              : "Post updated successfully.",
      );

      if (!id) {
        navigate(
          `/admin/blog/${savedPost.id}/edit`,
          { replace: true },
        );
      } else {
        setRequestVersion(
          (version) => version + 1,
        );
      }
    } catch (saveError) {
      if (uploadedImage?.path) {
        try {
          await removeBlogImageIfUnused(
            uploadedImage.path,
          );
        } catch (cleanupError) {
          console.error(
            "Unable to clean up unused blog image:",
            cleanupError,
          );
        }
      }

      setError(
        saveError.code === "23505"
          ? "This slug is already in use. Choose another URL slug."
          : saveError.message ||
              "Unable to save this post.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading-state">
        Loading blog editor...
      </div>
    );
  }

  return (
    <div className="admin-blog-editor-page">
      <header className="admin-blog-editor-header">
        <div>
          <Link to="/admin/blog">
            <ArrowLeft size={17} />
            Back to Blog
          </Link>
          <span>
            {isEditing
              ? "EDIT ARTICLE"
              : "NEW ARTICLE"}
          </span>
          <h1>
            {isEditing
              ? "Edit Blog Post"
              : "Create Blog Post"}
          </h1>
        </div>

        {isEditing && (
          <Link
            to={`/admin/blog/${id}/preview`}
            className="secondary-button"
          >
            <Eye size={17} />
            Full Preview
          </Link>
        )}
      </header>

      {error && (
        <div
          className="admin-order-message error"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="admin-order-message success"
          role="status"
        >
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      <div className="admin-blog-editor-layout">
        <div className="admin-blog-editor-main">
          <section className="admin-blog-editor-card">
            <div className="admin-blog-card-heading">
              <FileText size={20} />
              <div>
                <strong>
                  Article Content
                </strong>
                <span>
                  Title, URL and Markdown
                  content
                </span>
              </div>
            </div>

            <div className="admin-blog-form-grid">
              <label className="admin-blog-full-field">
                <span>Title</span>
                <input
                  type="text"
                  value={values.title}
                  onChange={
                    handleTitleChange
                  }
                  maxLength="120"
                  required
                />
                <small>
                  {values.title.length}/120
                </small>
              </label>

              <label className="admin-blog-full-field">
                <span>Slug</span>
                <div className="admin-blog-slug-input">
                  <span>/blog/</span>
                  <input
                    type="text"
                    value={values.slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      updateValue(
                        "slug",
                        slugify(
                          event.target.value,
                        ),
                      );
                    }}
                    required
                  />
                </div>
                <small>
                  Lowercase letters, numbers and
                  hyphens only.
                </small>
              </label>

              <label>
                <span>Category</span>
                <select
                  value={values.category_id}
                  onChange={(event) =>
                    updateValue(
                      "category_id",
                      event.target.value,
                    )
                  }
                  required
                >
                  <option value="">
                    Choose category
                  </option>
                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>Tags</span>
                <input
                  type="text"
                  value={values.tags}
                  onChange={(event) =>
                    updateValue(
                      "tags",
                      event.target.value,
                    )
                  }
                  placeholder="passport, photos, guide"
                />
                <small>
                  Separate tags with commas.
                </small>
              </label>

              <label className="admin-blog-full-field">
                <span>Excerpt</span>
                <textarea
                  rows="4"
                  value={values.excerpt}
                  onChange={(event) =>
                    updateValue(
                      "excerpt",
                      event.target.value,
                    )
                  }
                  maxLength="240"
                  placeholder="A concise summary shown on listing cards."
                />
                <small>
                  {values.excerpt.length}/240
                </small>
              </label>

              <div className="admin-blog-full-field admin-markdown-editor">
                <div className="admin-markdown-tabs">
                  <button
                    type="button"
                    className={
                      !previewMode
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPreviewMode(false)
                    }
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={
                      previewMode
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setPreviewMode(true)
                    }
                  >
                    Preview
                  </button>
                </div>

                {previewMode ? (
                  <MarkdownRenderer
                    content={values.content}
                    className="admin-markdown-preview"
                  />
                ) : (
                  <textarea
                    rows="22"
                    value={values.content}
                    onChange={(event) =>
                      updateValue(
                        "content",
                        event.target.value,
                      )
                    }
                    placeholder={"## Article heading\n\nWrite your article using Markdown..."}
                    required
                  />
                )}

                <small>
                  Markdown: ## heading, **bold**,
                  *italic*, - lists, [links](https://...)
                  and ![images](https://...).
                </small>
              </div>
            </div>
          </section>

          <section className="admin-blog-editor-card">
            <div className="admin-blog-card-heading">
              <ImagePlus size={20} />
              <div>
                <strong>Cover Image</strong>
                <span>
                  JPG, PNG or WEBP · maximum 5
                  MB
                </span>
              </div>
            </div>

            <div className="admin-blog-cover-editor">
              {coverPreview ? (
                <div className="admin-blog-cover-preview">
                  <img
                    src={coverPreview}
                    alt="Blog cover preview"
                  />
                  <button
                    type="button"
                    onClick={clearCover}
                  >
                    <Trash2 size={17} />
                    Remove
                  </button>
                </div>
              ) : (
                <label className="admin-blog-cover-upload">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleCoverChange
                    }
                  />
                  <ImagePlus size={30} />
                  <strong>
                    Choose a 16:9 cover image
                  </strong>
                  <span>
                    Required before publishing
                  </span>
                </label>
              )}

              {coverPreview && (
                <label className="secondary-button admin-blog-replace-image">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleCoverChange
                    }
                  />
                  <ImagePlus size={17} />
                  Replace Image
                </label>
              )}
            </div>
          </section>

          <section className="admin-blog-editor-card">
            <div className="admin-blog-card-heading">
              <Search size={20} />
              <div>
                <strong>Search & Sharing</strong>
                <span>
                  Optional SEO overrides
                </span>
              </div>
            </div>

            <div className="admin-blog-form-grid">
              <label className="admin-blog-full-field">
                <span>SEO Title</span>
                <input
                  type="text"
                  value={values.seo_title}
                  onChange={(event) =>
                    updateValue(
                      "seo_title",
                      event.target.value,
                    )
                  }
                  maxLength="70"
                />
                <small>
                  {values.seo_title.length}/70 ·
                  recommended around 60
                </small>
              </label>

              <label className="admin-blog-full-field">
                <span>SEO Description</span>
                <textarea
                  rows="4"
                  value={
                    values.seo_description
                  }
                  onChange={(event) =>
                    updateValue(
                      "seo_description",
                      event.target.value,
                    )
                  }
                  maxLength="180"
                />
                <small>
                  {
                    values.seo_description
                      .length
                  }
                  /180 · recommended around 160
                </small>
              </label>

              <label className="admin-blog-full-field">
                <span>Canonical URL</span>
                <input
                  type="url"
                  value={values.canonical_url}
                  onChange={(event) =>
                    updateValue(
                      "canonical_url",
                      event.target.value,
                    )
                  }
                  placeholder="Leave blank to use the standard blog URL"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="admin-blog-editor-sidebar">
          <section className="admin-blog-editor-card">
            <div className="admin-blog-card-heading">
              <CalendarClock size={20} />
              <div>
                <strong>Publishing</strong>
                <span>
                  Status and timing
                </span>
              </div>
            </div>

            <div className="admin-blog-publish-fields">
              <label>
                <span>Status</span>
                <select
                  value={values.status}
                  onChange={(event) =>
                    updateValue(
                      "status",
                      event.target.value,
                    )
                  }
                >
                  {BLOG_STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>Publish Date</span>
                <input
                  type="datetime-local"
                  value={values.published_at}
                  onChange={(event) =>
                    updateValue(
                      "published_at",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Scheduled Publish Date
                </span>
                <input
                  type="datetime-local"
                  value={values.scheduled_at}
                  onChange={(event) =>
                    updateValue(
                      "scheduled_at",
                      event.target.value,
                    )
                  }
                />
              </label>

              <label className="admin-blog-toggle">
                <input
                  type="checkbox"
                  checked={
                    values.is_featured
                  }
                  onChange={(event) =>
                    updateValue(
                      "is_featured",
                      event.target.checked,
                    )
                  }
                />
                <span>
                  Feature this post
                </span>
              </label>
            </div>
          </section>

          <section className="admin-blog-editor-card admin-blog-save-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                savePost("draft")
              }
              disabled={isSaving}
            >
              <Save size={17} />
              {isSaving
                ? "Saving..."
                : "Save Draft"}
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                savePost("publish")
              }
              disabled={isSaving}
            >
              <Send size={17} />
              Publish Now
            </button>

            <button
              type="button"
              className="admin-blog-schedule-button"
              onClick={() =>
                savePost("schedule")
              }
              disabled={isSaving}
            >
              <CalendarClock size={17} />
              Schedule
            </button>

            {isEditing && (
              <button
                type="button"
                className="admin-blog-update-button"
                onClick={() =>
                  savePost("update")
                }
                disabled={isSaving}
              >
                <CheckCircle2 size={17} />
                Update Post
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AdminBlogEditor;

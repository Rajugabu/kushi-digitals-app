import {
  Archive,
  BookOpen,
  CalendarClock,
  Edit3,
  Eye,
  FileText,
  ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  ADMIN_BLOG_PAGE_SIZE,
  BLOG_STATUS_OPTIONS,
  formatBlogDate,
  slugify,
} from "../../config/blog";
import {
  createBlogCategory,
  deleteBlogCategory,
  deleteBlogPost,
  getAdminBlogStats,
  getAdminPosts,
  getBlogCategories,
  updateBlogCategory,
  updateBlogPost,
} from "../../services/blog";

const emptyStats = {
  total: 0,
  published: 0,
  drafts: 0,
  featured: 0,
  scheduled: 0,
};

function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] =
    useState([]);
  const [stats, setStats] =
    useState(emptyStats);
  const [searchDraft, setSearchDraft] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] =
    useState(0);
  const [isLoading, setIsLoading] =
    useState(true);
  const [actionId, setActionId] =
    useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");
  const [requestVersion, setRequestVersion] =
    useState(0);
  const [currentTime] = useState(
    () => Date.now(),
  );
  const [categoryForm, setCategoryForm] =
    useState({
      id: "",
      name: "",
      description: "",
    });
  const [
    isSavingCategory,
    setIsSavingCategory,
  ] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [
          postResult,
          categoryResult,
          statResult,
        ] = await Promise.all([
          getAdminPosts({
            page,
            search: searchTerm,
            status: statusFilter,
            categoryId: categoryFilter,
          }),
          getBlogCategories(),
          getAdminBlogStats(),
        ]);

        if (!isMounted) {
          return;
        }

        setPosts(postResult.posts);
        setTotalCount(postResult.count);
        setCategories(categoryResult);
        setStats(statResult);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load blog management.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [
    categoryFilter,
    page,
    requestVersion,
    searchTerm,
    statusFilter,
  ]);

  const refreshDashboard = () => {
    setRequestVersion(
      (version) => version + 1,
    );
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(
      () => setSuccessMessage(""),
      2800,
    );
  };

  const runPostAction = async (
    post,
    action,
  ) => {
    try {
      setActionId(post.id);
      setError("");

      if (action === "delete") {
        const confirmed = window.confirm(
          `Delete “${post.title}”? This cannot be undone.`,
        );

        if (!confirmed) {
          return;
        }

        await deleteBlogPost(post);
        showSuccess("Post deleted safely.");
      } else if (action === "publish") {
        if (!post.cover_image_url) {
          throw new Error(
            "Add a cover image before publishing this post.",
          );
        }

        await updateBlogPost(post.id, {
          status: "published",
          published_at:
            new Date().toISOString(),
          scheduled_at: null,
        });
        showSuccess("Post published.");
      } else if (action === "draft") {
        await updateBlogPost(post.id, {
          status: "draft",
          scheduled_at: null,
        });
        showSuccess(
          "Post moved back to draft.",
        );
      } else if (action === "feature") {
        await updateBlogPost(post.id, {
          is_featured:
            !post.is_featured,
        });
        showSuccess(
          post.is_featured
            ? "Post removed from featured."
            : "Post marked as featured.",
        );
      }

      refreshDashboard();
    } catch (actionError) {
      setError(
        actionError.message ||
          "Unable to update this post.",
      );
    } finally {
      setActionId("");
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(searchDraft.trim());
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      id: "",
      name: "",
      description: "",
    });
  };

  const saveCategory = async (event) => {
    event.preventDefault();

    if (!categoryForm.name.trim()) {
      setError(
        "Please enter a category name.",
      );
      return;
    }

    try {
      setIsSavingCategory(true);
      setError("");

      const values = {
        name: categoryForm.name.trim(),
        slug: slugify(
          categoryForm.name,
        ),
        description:
          categoryForm.description.trim() ||
          null,
      };

      if (categoryForm.id) {
        await updateBlogCategory(
          categoryForm.id,
          values,
        );
        showSuccess("Category updated.");
      } else {
        await createBlogCategory(values);
        showSuccess("Category created.");
      }

      resetCategoryForm();
      refreshDashboard();
    } catch (categoryError) {
      setError(
        categoryError.code === "23505"
          ? "A category with this name or slug already exists."
          : categoryError.message ||
              "Unable to save category.",
      );
    } finally {
      setIsSavingCategory(false);
    }
  };

  const removeCategory = async (
    category,
  ) => {
    const confirmed = window.confirm(
      `Delete the “${category.name}” category?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(category.id);
      setError("");
      await deleteBlogCategory(category.id);
      showSuccess("Category deleted.");
      refreshDashboard();
    } catch (categoryError) {
      setError(
        categoryError.message ||
          "Unable to delete category.",
      );
    } finally {
      setActionId("");
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalCount / ADMIN_BLOG_PAGE_SIZE,
    ),
  );

  return (
    <div className="admin-blog-page">
      <section className="admin-orders-hero">
        <div>
          <span>CONTENT MANAGEMENT</span>
          <h1>Blog Management</h1>
          <p>
            Create, review, schedule and publish
            helpful Kushi Digitals articles.
          </p>
        </div>

        <div className="admin-blog-hero-actions">
          <button
            type="button"
            className="admin-refresh-button"
            onClick={refreshDashboard}
            disabled={isLoading}
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          <Link
            to="/admin/blog/new"
            className="primary-button"
          >
            <Plus size={18} />
            New Post
          </Link>
        </div>
      </section>

      <section className="admin-order-summary-grid admin-blog-summary-grid">
        <article>
          <FileText size={22} />
          <div>
            <span>Total Posts</span>
            <strong>{stats.total}</strong>
          </div>
        </article>
        <article>
          <Eye size={22} />
          <div>
            <span>Published</span>
            <strong>{stats.published}</strong>
          </div>
        </article>
        <article>
          <Archive size={22} />
          <div>
            <span>Drafts</span>
            <strong>{stats.drafts}</strong>
          </div>
        </article>
        <article>
          <Star size={22} />
          <div>
            <span>Featured</span>
            <strong>{stats.featured}</strong>
          </div>
        </article>
      </section>

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
          {successMessage}
        </div>
      )}

      <section className="admin-orders-panel">
        <div className="admin-orders-toolbar admin-blog-toolbar">
          <form
            className="admin-orders-search"
            onSubmit={submitSearch}
          >
            <Search size={18} />
            <input
              type="search"
              value={searchDraft}
              onChange={(event) =>
                setSearchDraft(
                  event.target.value,
                )
              }
              placeholder="Search title or slug"
            />
          </form>

          <div className="admin-orders-filters">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value,
                );
                setPage(1);
              }}
            >
              <option value="all">
                All statuses
              </option>
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

            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(
                  event.target.value,
                );
                setPage(1);
              }}
            >
              <option value="">
                All categories
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
          </div>
        </div>

        {isLoading ? (
          <div className="admin-orders-loading">
            Loading blog posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="admin-orders-empty">
            <BookOpen size={34} />
            <h3>No blog posts found</h3>
            <p>
              Create the first post or adjust
              the current filters.
            </p>
          </div>
        ) : (
          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table admin-blog-table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Publish Date</th>
                  <th>Updated</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const scheduled =
                    post.status ===
                      "published" &&
                    new Date(
                      post.published_at,
                    ).getTime() >
                      currentTime;

                  return (
                    <tr key={post.id}>
                      <td>
                        <div className="admin-blog-post-cell">
                          <div className="admin-blog-thumbnail">
                            {post.cover_image_url ? (
                              <img
                                src={
                                  post.cover_image_url
                                }
                                alt=""
                              />
                            ) : (
                              <ImageIcon
                                size={20}
                              />
                            )}
                          </div>
                          <div>
                            <strong>
                              {post.title}
                            </strong>
                            <small>
                              /blog/{post.slug}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {post.blog_categories
                          ?.name ||
                          "Uncategorized"}
                      </td>
                      <td>
                        <span
                          className={`admin-blog-status ${scheduled ? "scheduled" : post.status}`}
                        >
                          {scheduled
                            ? "Scheduled"
                            : post.status}
                        </span>
                      </td>
                      <td>
                        {formatBlogDate(
                          post.published_at,
                          true,
                        )}
                      </td>
                      <td>
                        {formatBlogDate(
                          post.updated_at,
                        )}
                      </td>
                      <td>
                        <span
                          className={`admin-blog-featured ${post.is_featured ? "active" : ""}`}
                        >
                          <Star
                            size={15}
                            fill={
                              post.is_featured
                                ? "currentColor"
                                : "none"
                            }
                          />
                          {post.is_featured
                            ? "Yes"
                            : "No"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-blog-actions">
                          <Link
                            to={`/admin/blog/${post.id}/edit`}
                            title="Edit post"
                          >
                            <Edit3 size={16} />
                          </Link>
                          <Link
                            to={`/admin/blog/${post.id}/preview`}
                            title="Preview post"
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            title={
                              post.status ===
                              "published"
                                ? "Move to draft"
                                : "Publish now"
                            }
                            onClick={() =>
                              runPostAction(
                                post,
                                post.status ===
                                  "published"
                                  ? "draft"
                                  : "publish",
                              )
                            }
                            disabled={
                              actionId ===
                              post.id
                            }
                          >
                            <CalendarClock
                              size={16}
                            />
                          </button>
                          <button
                            type="button"
                            title={
                              post.is_featured
                                ? "Unfeature"
                                : "Feature"
                            }
                            onClick={() =>
                              runPostAction(
                                post,
                                "feature",
                              )
                            }
                            disabled={
                              actionId ===
                              post.id
                            }
                          >
                            <Star size={16} />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            title="Delete post"
                            onClick={() =>
                              runPostAction(
                                post,
                                "delete",
                              )
                            }
                            disabled={
                              actionId ===
                              post.id
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="admin-blog-pagination">
            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage(
                  (current) =>
                    current - 1,
                )
              }
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1,
                )
              }
            >
              Next
            </button>
          </div>
        )}
      </section>

      <section className="admin-panel admin-blog-categories">
        <div className="admin-panel-header">
          <div>
            <span>BLOG TAXONOMY</span>
            <h2>Categories</h2>
          </div>
        </div>

        <div className="admin-category-layout">
          <div className="admin-category-list">
            {categories.map((category) => (
              <article key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>/{category.slug}</span>
                  {category.description && (
                    <p>
                      {category.description}
                    </p>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm({
                        id: category.id,
                        name: category.name,
                        description:
                          category.description ||
                          "",
                      })
                    }
                  >
                    <Edit3 size={15} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      removeCategory(category)
                    }
                    disabled={
                      actionId === category.id
                    }
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          <form
            className="admin-category-form"
            onSubmit={saveCategory}
          >
            <h3>
              {categoryForm.id
                ? "Edit Category"
                : "Add Category"}
            </h3>

            <label>
              <span>Category Name</span>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm(
                    (current) => ({
                      ...current,
                      name: event.target.value,
                    }),
                  )
                }
                maxLength="80"
                required
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                rows="4"
                value={
                  categoryForm.description
                }
                onChange={(event) =>
                  setCategoryForm(
                    (current) => ({
                      ...current,
                      description:
                        event.target.value,
                    }),
                  )
                }
                maxLength="300"
              />
            </label>

            <div>
              <button
                type="submit"
                className="primary-button"
                disabled={isSavingCategory}
              >
                {isSavingCategory
                  ? "Saving..."
                  : categoryForm.id
                    ? "Update Category"
                    : "Add Category"}
              </button>

              {categoryForm.id && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetCategoryForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default AdminBlog;

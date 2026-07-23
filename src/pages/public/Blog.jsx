import {
  ArrowRight,
  BookOpen,
  Clock3,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

import SEO from "../../components/SEO";
import BlogCard from "../../components/blog/BlogCard";
import {
  BLOG_PAGE_SIZE,
  BLOG_SITE_URL,
  formatBlogDate,
} from "../../config/blog";
import {
  getBlogCategories,
  getFeaturedPost,
  getPublishedPosts,
} from "../../services/blog";

function Blog() {
  const [posts, setPosts] = useState([]);
  const [featuredPost, setFeaturedPost] =
    useState(null);
  const [categories, setCategories] =
    useState([]);
  const [searchDraft, setSearchDraft] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [categoryId, setCategoryId] =
    useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] =
    useState(0);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] =
    useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadBlog = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [
          postResult,
          featuredResult,
          categoryResult,
        ] = await Promise.all([
          getPublishedPosts({
            page,
            search: searchTerm,
            categoryId,
          }),
          getFeaturedPost(),
          getBlogCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        setPosts(postResult.posts);
        setTotalCount(postResult.count);
        setFeaturedPost(featuredResult);
        setCategories(categoryResult);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load blog posts right now.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBlog();

    return () => {
      isMounted = false;
    };
  }, [
    categoryId,
    page,
    requestVersion,
    searchTerm,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / BLOG_PAGE_SIZE),
  );
  const hasFilters =
    Boolean(searchTerm) ||
    Boolean(categoryId);
  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          category.id === categoryId,
      ),
    [categories, categoryId],
  );

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(searchDraft.trim());
  };

  const clearFilters = () => {
    setSearchDraft("");
    setSearchTerm("");
    setCategoryId("");
    setPage(1);
  };

  return (
    <>
      <SEO
        title="Kushi Digitals Blog | Photography Guides & Studio Insights"
        description="Photography, passport photo, restoration, frame, album and digital service guides from Kushi Digitals."
        canonical={`${BLOG_SITE_URL}/blog`}
      />

      <section className="blog-hero">
        <div className="container blog-hero-content">
          <div className="eyebrow">
            <BookOpen size={16} />
            <span>Ideas Worth Preserving</span>
          </div>

          <h1>
            Kushi Digitals
            <span className="gradient-text">
              {" "}
              Blog
            </span>
          </h1>

          <p>
            Practical guidance on photography,
            passport photos, restoration,
            premium frames, album designing and
            modern digital services.
          </p>
        </div>
      </section>

      <section className="blog-page-section">
        <div className="container">
          {!isLoading && featuredPost && (
            <article className="featured-blog-post">
              <div className="featured-blog-media">
                {featuredPost.cover_image_url ? (
                  <img
                    src={
                      featuredPost.cover_image_url
                    }
                    alt=""
                  />
                ) : (
                  <div className="blog-image-placeholder">
                    <BookOpen size={48} />
                  </div>
                )}
              </div>

              <div className="featured-blog-copy">
                <span className="featured-label">
                  Featured Article
                </span>

                {featuredPost.blog_categories
                  ?.name && (
                  <span className="blog-category-text">
                    {
                      featuredPost
                        .blog_categories.name
                    }
                  </span>
                )}

                <h2>{featuredPost.title}</h2>

                {featuredPost.excerpt && (
                  <p>{featuredPost.excerpt}</p>
                )}

                <div className="featured-blog-meta">
                  <span>
                    {formatBlogDate(
                      featuredPost.published_at,
                    )}
                  </span>
                  <span>
                    <Clock3 size={15} />
                    {featuredPost.reading_time_minutes ||
                      1}{" "}
                    min read
                  </span>
                </div>

                <Link
                  to={`/blog/${featuredPost.slug}`}
                  className="primary-button"
                >
                  Read Article
                  <ArrowRight size={18} />
                </Link>
              </div>
            </article>
          )}

          <div className="blog-toolbar">
            <form
              className="blog-search"
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
                placeholder="Search articles..."
                aria-label="Search blog articles"
              />
              <button type="submit">
                Search
              </button>
            </form>

            <label className="blog-category-filter">
              <SlidersHorizontal size={18} />
              <span className="sr-only">
                Filter by category
              </span>
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(
                    event.target.value,
                  );
                  setPage(1);
                }}
              >
                <option value="">
                  All Categories
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

            {hasFilters && (
              <button
                type="button"
                className="blog-clear-filters"
                onClick={clearFilters}
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
          </div>

          <div className="blog-results-heading">
            <div>
              <span>Recent Posts</span>
              <h2>
                {selectedCategory
                  ? selectedCategory.name
                  : searchTerm
                    ? `Results for “${searchTerm}”`
                    : "Latest Articles"}
              </h2>
            </div>

            {!isLoading && (
              <p>
                {totalCount}{" "}
                {totalCount === 1
                  ? "article"
                  : "articles"}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="blog-grid">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  className="blog-card-skeleton"
                  key={index}
                />
              ))}
            </div>
          ) : error ? (
            <div className="blog-state-card error">
              <BookOpen size={36} />
              <h2>
                We Couldn’t Load the Blog
              </h2>
              <p>{error}</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setRequestVersion(
                    (version) =>
                      version + 1,
                  )
                }
              >
                <RefreshCw size={17} />
                Try Again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="blog-state-card">
              <Search size={36} />
              <h2>No Posts Found</h2>
              <p>
                Try another search or clear
                the selected category.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="blog-grid">
                {posts.map((post) => (
                  <BlogCard
                    key={post.id}
                    post={post}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  className="blog-pagination"
                  aria-label="Blog pagination"
                >
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
                    Page {page} of{" "}
                    {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      page === totalPages
                    }
                    onClick={() =>
                      setPage(
                        (current) =>
                          current + 1,
                      )
                    }
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default Blog;

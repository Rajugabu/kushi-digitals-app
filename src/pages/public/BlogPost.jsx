import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Eye,
  ImageIcon,
  MessageCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  FaFacebookF,
  FaXTwitter,
} from "react-icons/fa6";

import SEO from "../../components/SEO";
import BlogCard from "../../components/blog/BlogCard";
import MarkdownRenderer from "../../components/blog/MarkdownRenderer";
import {
  BLOG_SITE_URL,
  formatBlogDate,
  getBlogCanonicalUrl,
  isValidBlogSlug,
} from "../../config/blog";
import {
  getPublishedPostBySlug,
  getRelatedPosts,
  incrementPostView,
} from "../../services/blog";

function BlogPost() {
  const { slug = "" } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] =
    useState([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] =
    useState(false);
  const [requestVersion, setRequestVersion] =
    useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadPost = async () => {
      if (!isValidBlogSlug(slug)) {
        setError(
          "This article is unavailable or the link is invalid.",
        );
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        const blogPost =
          await getPublishedPostBySlug(slug);

        if (!blogPost) {
          throw new Error(
            "This article is unavailable. It may be unpublished or the link may have changed.",
          );
        }

        const related =
          await getRelatedPosts(blogPost);

        if (!isMounted) {
          return;
        }

        setPost(blogPost);
        setRelatedPosts(related);

        try {
          const viewKey = `kushi-blog-viewed-${slug}`;

          if (
            !window.sessionStorage.getItem(
              viewKey,
            )
          ) {
            window.sessionStorage.setItem(
              viewKey,
              "1",
            );
            incrementPostView(slug);
          }
        } catch {
          incrementPostView(slug);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load this article.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPost();

    return () => {
      isMounted = false;
    };
  }, [requestVersion, slug]);

  const canonicalUrl = post
    ? post.canonical_url ||
      getBlogCanonicalUrl(post.slug)
    : getBlogCanonicalUrl(slug);
  const seoTitle = post
    ? `${
        post.seo_title || post.title
      } | Kushi Digitals`
    : "Kushi Digitals Blog";
  const seoDescription =
    post?.seo_description ||
    post?.excerpt ||
    "Photography and digital studio guidance from Kushi Digitals.";
  const jsonLd = useMemo(() => {
    if (!post) {
      return null;
    }

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: seoDescription,
      ...(post.cover_image_url
        ? {
            image: [post.cover_image_url],
          }
        : {}),
      datePublished: post.published_at,
      dateModified:
        post.updated_at ||
        post.published_at,
      author: {
        "@type": "Organization",
        name: "Kushi Digitals",
        url: BLOG_SITE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "Kushi Digitals",
        url: BLOG_SITE_URL,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
    };
  }, [
    canonicalUrl,
    post,
    seoDescription,
  ]);

  const shareText = post
    ? `${post.title} — Kushi Digitals`
    : "Kushi Digitals Blog";
  const encodedUrl =
    encodeURIComponent(
      window.location.href,
    );
  const encodedText =
    encodeURIComponent(shareText);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        canonicalUrl,
      );
      setCopied(true);
      window.setTimeout(
        () => setCopied(false),
        2200,
      );
    } catch {
      setError(
        "Unable to copy the link automatically. Please copy it from your browser address bar.",
      );
    }
  };

  if (isLoading) {
    return (
      <section className="blog-detail-state">
        <div className="container">
          <div className="blog-article-skeleton" />
        </div>
      </section>
    );
  }

  if (error || !post) {
    return (
      <section className="blog-detail-state">
        <div className="container">
          <SEO
            title="Article Unavailable | Kushi Digitals"
            description="The requested Kushi Digitals blog article is unavailable."
            canonical={`${BLOG_SITE_URL}/blog`}
          />

          <div className="blog-state-card error">
            <ImageIcon size={40} />
            <h1>Article Unavailable</h1>
            <p>
              {error ||
                "This article could not be found."}
            </p>

            <div className="blog-state-actions">
              <Link
                to="/blog"
                className="primary-button"
              >
                <ArrowLeft size={17} />
                Back to Blog
              </Link>

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
          </div>
        </div>
      </section>
    );
  }

  const updatedMeaningfully =
    post.updated_at &&
    Math.abs(
      new Date(post.updated_at).getTime() -
        new Date(
          post.published_at,
        ).getTime(),
    ) >
      24 * 60 * 60 * 1000;

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalUrl}
        image={post.cover_image_url}
        type="article"
        jsonLd={jsonLd}
      />

      <article className="blog-detail-page">
        <header className="blog-article-header">
          <div className="container blog-article-header-inner">
            <Link
              to="/blog"
              className="blog-back-link"
            >
              <ArrowLeft size={17} />
              Back to Blog
            </Link>

            {post.blog_categories?.name && (
              <span className="blog-category-text">
                {post.blog_categories.name}
              </span>
            )}

            <h1>{post.title}</h1>

            {post.excerpt && (
              <p>{post.excerpt}</p>
            )}

            <div className="blog-article-byline">
              <span>
                <UserRound size={16} />
                Kushi Digitals
              </span>
              <span>
                <CalendarDays size={16} />
                {formatBlogDate(
                  post.published_at,
                )}
              </span>
              <span>
                <Clock3 size={16} />
                {post.reading_time_minutes ||
                  1}{" "}
                min read
              </span>
              <span>
                <Eye size={16} />
                {post.view_count || 0} views
              </span>
            </div>
          </div>
        </header>

        <div className="container blog-article-container">
          <div className="blog-article-cover">
            {post.cover_image_url ? (
              <img
                src={post.cover_image_url}
                alt={`Cover for ${post.title}`}
              />
            ) : (
              <div className="blog-image-placeholder">
                <ImageIcon size={48} />
              </div>
            )}
          </div>

          <div className="blog-article-layout">
            <div>
              {updatedMeaningfully && (
                <p className="blog-updated-note">
                  Updated{" "}
                  {formatBlogDate(
                    post.updated_at,
                  )}
                </p>
              )}

              <MarkdownRenderer
                content={post.content}
              />

              {post.tags?.length > 0 && (
                <div className="blog-tag-list">
                  {post.tags.map((tag) => (
                    <span key={tag}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <aside className="blog-share-card">
              <span>Share this article</span>

              <a
                href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaFacebookF size={17} />
                Facebook
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaXTwitter size={17} />
                X / Twitter
              </a>

              <button
                type="button"
                onClick={copyLink}
              >
                {copied ? (
                  <Check size={18} />
                ) : (
                  <Copy size={18} />
                )}
                {copied
                  ? "Link Copied"
                  : "Copy Link"}
              </button>
            </aside>
          </div>
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="section-shell related-posts-section">
          <div className="container">
            <div className="blog-results-heading">
              <div>
                <span>Continue Reading</span>
                <h2>Related Posts</h2>
              </div>
            </div>

            <div className="blog-grid">
              {relatedPosts.map(
                (relatedPost) => (
                  <BlogCard
                    key={relatedPost.id}
                    post={relatedPost}
                    compact
                  />
                ),
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default BlogPost;

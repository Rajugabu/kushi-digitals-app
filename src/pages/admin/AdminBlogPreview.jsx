import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
  ImageIcon,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import MarkdownRenderer from "../../components/blog/MarkdownRenderer";
import { formatBlogDate } from "../../config/blog";
import { getAdminPostById } from "../../services/blog";

function AdminBlogPreview() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPost = async () => {
      try {
        const data =
          await getAdminPostById(id);

        if (!data) {
          throw new Error(
            "This post could not be found.",
          );
        }

        if (isMounted) {
          setPost(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load preview.",
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
  }, [id]);

  if (isLoading) {
    return (
      <div className="admin-loading-state">
        Loading secure preview...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="admin-empty-state">
        <h2>Preview Unavailable</h2>
        <p>{error}</p>
        <Link
          to="/admin/blog"
          className="secondary-button"
        >
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-blog-preview-page">
      <div className="admin-blog-preview-toolbar">
        <Link to="/admin/blog">
          <ArrowLeft size={17} />
          Blog Dashboard
        </Link>
        <span>
          Secure preview · {post.status}
        </span>
        <Link
          to={`/admin/blog/${post.id}/edit`}
          className="primary-button"
        >
          <Edit3 size={17} />
          Edit Post
        </Link>
      </div>

      <article className="admin-blog-preview-article">
        <header>
          {post.blog_categories?.name && (
            <span className="blog-category-text">
              {post.blog_categories.name}
            </span>
          )}
          <h1>{post.title}</h1>
          {post.excerpt && (
            <p>{post.excerpt}</p>
          )}
          <div>
            <span>
              <CalendarDays size={16} />
              {formatBlogDate(
                post.published_at ||
                  post.created_at,
              )}
            </span>
            <span>
              <Clock3 size={16} />
              {post.reading_time_minutes ||
                1}{" "}
              min read
            </span>
          </div>
        </header>

        <div className="admin-blog-preview-cover">
          {post.cover_image_url ? (
            <img
              src={post.cover_image_url}
              alt={`Cover for ${post.title}`}
            />
          ) : (
            <div className="blog-image-placeholder">
              <ImageIcon size={44} />
            </div>
          )}
        </div>

        <MarkdownRenderer
          content={post.content}
        />
      </article>
    </div>
  );
}

export default AdminBlogPreview;

import {
  ArrowRight,
  Clock3,
  ImageIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import { formatBlogDate } from "../../config/blog";

function BlogCard({
  post,
  compact = false,
}) {
  return (
    <article
      className={`blog-card ${
        compact ? "blog-card--compact" : ""
      }`}
    >
      <Link
        to={`/blog/${post.slug}`}
        className="blog-card-media"
        aria-label={`Read ${post.title}`}
      >
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="blog-image-placeholder">
            <ImageIcon size={34} />
          </span>
        )}

        {post.blog_categories?.name && (
          <span className="blog-category-badge">
            {post.blog_categories.name}
          </span>
        )}
      </Link>

      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span>
            {formatBlogDate(
              post.published_at,
            )}
          </span>
          <span>
            <Clock3 size={14} />
            {post.reading_time_minutes ||
              1}{" "}
            min read
          </span>
        </div>

        <h3>
          <Link to={`/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p>{post.excerpt}</p>
        )}

        <Link
          to={`/blog/${post.slug}`}
          className="blog-read-link"
        >
          Read More
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}

export default BlogCard;

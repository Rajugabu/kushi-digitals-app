import {
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getLatestPosts } from "../../services/blog";
import BlogCard from "./BlogCard";

function LatestBlogSection() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      try {
        const latestPosts =
          await getLatestPosts(3);

        if (isMounted) {
          setPosts(latestPosts);
        }
      } catch (error) {
        console.error(
          "Unable to load latest blog posts:",
          error,
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isLoading && posts.length === 0) {
    return null;
  }

  return (
    <section className="section-shell home-blog-section">
      <div className="container">
        <div className="section-heading">
          <div className="eyebrow">
            <BookOpen size={16} />
            <span>Studio Journal</span>
          </div>

          <h2>
            Latest From
            <span className="gradient-text">
              {" "}
              Our Blog
            </span>
          </h2>

          <p>
            Practical photography guidance,
            restoration insights and ideas for
            preserving your most meaningful
            memories.
          </p>
        </div>

        {isLoading ? (
          <div className="blog-grid blog-grid--home">
            {[0, 1, 2].map((item) => (
              <div
                className="blog-card-skeleton"
                key={item}
              />
            ))}
          </div>
        ) : (
          <div className="blog-grid blog-grid--home">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                compact
              />
            ))}
          </div>
        )}

        <div className="section-action">
          <Link
            to="/blog"
            className="secondary-button"
          >
            View All Articles
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default LatestBlogSection;

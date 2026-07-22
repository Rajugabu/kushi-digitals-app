import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";

function NotFound() {
  return (
    <section className="status-page">
      <div className="status-card">
        <div className="status-icon">
          <Search size={34} />
        </div>

        <span>404 Error</span>
        <h1>Page Not Found</h1>
        <p>
          The page you are looking for does not exist or may have been
          moved.
        </p>

        <Link to="/" className="primary-button">
          <ArrowLeft size={18} />
          Return Home
        </Link>
      </div>
    </section>
  );
}

export default NotFound;
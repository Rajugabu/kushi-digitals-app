import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./layouts/PublicLayout";
import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/public/Home";
import Services from "./pages/public/Services";
import Gallery from "./pages/public/Gallery";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import BookService from "./pages/public/BookService";
import Blog from "./pages/public/Blog";
import BlogPost from "./pages/public/BlogPost";
import ComingSoon from "./pages/public/ComingSoon";
import NotFound from "./pages/public/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Dashboard from "./pages/user/Dashboard";
import Orders from "./pages/user/Orders";
import Photos from "./pages/user/Photos";
import Profile from "./pages/user/Profile";
import Referrals from "./pages/user/Referrals";
import Wallet from "./pages/user/Wallet";
import Support from "./pages/user/Support";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminBlogEditor from "./pages/admin/AdminBlogEditor";
import AdminBlogPreview from "./pages/admin/AdminBlogPreview";
import AdminTemplateFactory from "./pages/admin/AdminTemplateFactory";
import Studio from "./pages/Studio";
import PrivacyPolicy from "./pages/public/PrivacyPolicy";
import Terms from "./pages/public/Terms";
import RefundPolicy from "./pages/public/RefundPolicy";
import ShippingPolicy from "./pages/public/ShippingPolicy";

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="studio" element={<Studio />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="book-service" element={<BookService />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="referral" element={<ComingSoon />} />
        <Route
  path="privacy-policy"
  element={<PrivacyPolicy />}
/>
        <Route path="terms" element={<Terms />} />
        <Route
  path="refund-policy"
  element={<RefundPolicy />}
/>
<Route
  path="shipping-policy"
  element={<ShippingPolicy />}
/>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/orders" element={<Orders />} />
        <Route path="/dashboard/uploads" element={<Photos />} />
        <Route path="/dashboard/profile" element={<Profile />} />
        <Route path="/dashboard/referrals" element={<Referrals />} />
        <Route path="/dashboard/wallet" element={<Wallet />} />
        <Route path="/dashboard/support" element={<Support />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="templates" element={<AdminTemplateFactory />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="blog/new" element={<AdminBlogEditor />} />
        <Route path="blog/:id/edit" element={<AdminBlogEditor />} />
        <Route path="blog/:id/preview" element={<AdminBlogPreview />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

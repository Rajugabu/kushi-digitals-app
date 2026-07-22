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

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="book-service" element={<BookService />} />
        <Route path="referral" element={<ComingSoon />} />
        <Route path="privacy-policy" element={<ComingSoon />} />
        <Route path="terms" element={<ComingSoon />} />
        <Route path="refund-policy" element={<ComingSoon />} />
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
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

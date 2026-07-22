import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
} from "lucide-react";

import { supabase } from "../../services/supabase";

const initialProfile = {
  fullName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  addressLine: "",
  city: "",
  district: "",
  state: "Andhra Pradesh",
  postalCode: "",
};

function Profile() {
  const [profileData, setProfileData] =
    useState(initialProfile);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "Please login to manage your profile.",
          );
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            `
              full_name,
              phone,
              whatsapp_number,
              address_line,
              city,
              district,
              state,
              postal_code
            `,
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!isMounted) {
          return;
        }

        setProfileData({
          fullName:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            "",
          email: user.email || "",
          phone:
            profile?.phone ||
            user.user_metadata?.phone ||
            "",
          whatsappNumber:
            profile?.whatsapp_number || "",
          addressLine:
            profile?.address_line || "",
          city: profile?.city || "",
          district: profile?.district || "",
          state:
            profile?.state ||
            "Andhra Pradesh",
          postalCode:
            profile?.postal_code || "",
        });
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load your profile.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const profileCompletion = useMemo(() => {
    const fields = [
      profileData.fullName,
      profileData.phone,
      profileData.whatsappNumber,
      profileData.addressLine,
      profileData.city,
      profileData.district,
      profileData.state,
      profileData.postalCode,
    ];

    const completedFields = fields.filter(
      (value) => value.trim(),
    ).length;

    return Math.round(
      (completedFields / fields.length) * 100,
    );
  }, [profileData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfileData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!profileData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!profileData.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (
      profileData.postalCode.trim() &&
      !/^\d{6}$/.test(
        profileData.postalCode.trim(),
      )
    ) {
      setError(
        "PIN code must contain exactly 6 digits.",
      );
      return;
    }

    try {
      setIsSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Please login before saving your profile.",
        );
      }

      const profileUpdate = {
        full_name:
          profileData.fullName.trim(),
        phone: profileData.phone.trim(),
        whatsapp_number:
          profileData.whatsappNumber.trim() ||
          null,
        address_line:
          profileData.addressLine.trim() ||
          null,
        city:
          profileData.city.trim() || null,
        district:
          profileData.district.trim() ||
          null,
        state:
          profileData.state.trim() || null,
        postal_code:
          profileData.postalCode.trim() ||
          null,
      };

      const {
        data: updatedProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user.id)
        .select("id")
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!updatedProfile) {
        throw new Error(
          "Customer profile record was not found. Please logout, login again and retry.",
        );
      }

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            full_name:
              profileData.fullName.trim(),
            phone:
              profileData.phone.trim(),
          },
        });

      if (metadataError) {
        console.error(
          "Profile saved, but account display name could not be refreshed:",
          metadataError,
        );
      }

      setSuccessMessage(
        "Your profile was saved successfully. These details will automatically appear while booking a service.",
      );
    } catch (saveError) {
      setError(
        saveError.message ||
          "Unable to save your profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="customer-profile-loading">
        <LoaderCircle
          size={25}
          className="admin-spin"
        />
        <span>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className="customer-profile-page">
      <section className="dashboard-page-header">
        <div>
          <span>My Profile</span>

          <h1>Manage Your Personal Details</h1>

          <p>
            Save your contact and delivery information
            once. It will automatically appear in the
            Book a Service form.
          </p>
        </div>

        <div className="customer-profile-completion">
          <span>Profile Completion</span>
          <strong>{profileCompletion}%</strong>
        </div>
      </section>

      <section className="dashboard-panel customer-profile-panel">
        <div className="customer-profile-heading">
          <div className="customer-profile-heading-icon">
            <UserRound size={25} />
          </div>

          <div>
            <span>Customer Account</span>
            <h2>Profile Information</h2>
            <p>
              Keep these details correct for faster
              order booking and delivery.
            </p>
          </div>
        </div>

        {error && (
          <div className="customer-profile-message error">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="customer-profile-message success">
            <CheckCircle2 size={19} />
            <span>{successMessage}</span>
          </div>
        )}

        <form
          className="customer-profile-form"
          onSubmit={handleSubmit}
        >
          <div className="customer-profile-section">
            <div className="customer-profile-section-title">
              <UserRound size={19} />

              <div>
                <strong>Personal Details</strong>
                <span>
                  Your name and primary contact number
                </span>
              </div>
            </div>

            <div className="customer-profile-grid">
              <div className="form-field">
                <label htmlFor="profileFullName">
                  Full Name
                </label>

                <input
                  id="profileFullName"
                  name="fullName"
                  type="text"
                  value={profileData.fullName}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="profileEmail">
                  Email Address
                </label>

                <div className="customer-profile-readonly-input">
                  <Mail size={17} />

                  <input
                    id="profileEmail"
                    type="email"
                    value={profileData.email}
                    readOnly
                  />
                </div>

                <small>
                  Login email cannot be changed here.
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="profilePhone">
                  Phone Number
                </label>

                <div className="customer-profile-input-icon">
                  <Phone size={17} />

                  <input
                    id="profilePhone"
                    name="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={handleChange}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="profileWhatsApp">
                  WhatsApp Number
                </label>

                <div className="customer-profile-input-icon">
                  <Phone size={17} />

                  <input
                    id="profileWhatsApp"
                    name="whatsappNumber"
                    type="tel"
                    value={
                      profileData.whatsappNumber
                    }
                    onChange={handleChange}
                    inputMode="tel"
                    placeholder="Enter WhatsApp number"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="customer-profile-section">
            <div className="customer-profile-section-title">
              <MapPin size={19} />

              <div>
                <strong>Delivery Address</strong>
                <span>
                  Used to pre-fill home delivery orders
                </span>
              </div>
            </div>

            <div className="customer-profile-grid">
              <div className="form-field customer-profile-full-field">
                <label htmlFor="profileAddress">
                  House Number / Street / Village
                </label>

                <textarea
                  id="profileAddress"
                  name="addressLine"
                  rows="3"
                  value={profileData.addressLine}
                  onChange={handleChange}
                  placeholder="Enter house number, street or village"
                />
              </div>

              <div className="form-field">
                <label htmlFor="profileCity">
                  Village / City
                </label>

                <input
                  id="profileCity"
                  name="city"
                  type="text"
                  value={profileData.city}
                  onChange={handleChange}
                  placeholder="Enter village or city"
                />
              </div>

              <div className="form-field">
                <label htmlFor="profileDistrict">
                  District
                </label>

                <input
                  id="profileDistrict"
                  name="district"
                  type="text"
                  value={profileData.district}
                  onChange={handleChange}
                  placeholder="Enter district"
                />
              </div>

              <div className="form-field">
                <label htmlFor="profileState">
                  State
                </label>

                <input
                  id="profileState"
                  name="state"
                  type="text"
                  value={profileData.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                />
              </div>

              <div className="form-field">
                <label htmlFor="profilePostalCode">
                  PIN Code
                </label>

                <input
                  id="profilePostalCode"
                  name="postalCode"
                  type="text"
                  value={profileData.postalCode}
                  onChange={handleChange}
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter 6-digit PIN code"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="primary-button customer-profile-save-button"
            disabled={isSaving}
          >
            {isSaving ? (
              <LoaderCircle
                size={19}
                className="admin-spin"
              />
            ) : (
              <Save size={19} />
            )}

            {isSaving
              ? "Saving Profile..."
              : "Save Profile"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Profile;

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";

import { supabase } from "../../services/supabase";

const initialProfile = {
  fullName: "",
  email: "",
  avatarPath: "",
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

  const [avatarFile, setAvatarFile] =
    useState(null);

  const [avatarPreview, setAvatarPreview] =
    useState("");

  const [savedAvatarUrl, setSavedAvatarUrl] =
    useState("");

  const [avatarObjectUrl, setAvatarObjectUrl] =
    useState("");

  const [removeAvatarOnSave, setRemoveAvatarOnSave] =
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
              avatar_path,
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

        let signedAvatarUrl = "";

        if (profile?.avatar_path) {
          const {
            data: signedAvatar,
            error: avatarUrlError,
          } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(
              profile.avatar_path,
              60 * 60,
            );

          if (avatarUrlError) {
            console.error(
              "Unable to load profile photo:",
              avatarUrlError,
            );
          } else {
            signedAvatarUrl =
              signedAvatar?.signedUrl || "";
          }
        }

        if (!isMounted) {
          return;
        }

        setAvatarPreview(signedAvatarUrl);
        setSavedAvatarUrl(signedAvatarUrl);

        setProfileData({
          fullName:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            "",
          email: user.email || "",
          avatarPath:
            profile?.avatar_path || "",
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

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(
          avatarObjectUrl,
        );
      }
    };
  }, [avatarObjectUrl]);

  const profileCompletion = useMemo(() => {
    const fields = [
      avatarPreview,
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
  }, [avatarPreview, profileData]);

  const handleAvatarChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Please choose a JPG, PNG or WEBP photo.",
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Profile photo must be 5 MB or smaller.",
      );
      event.target.value = "";
      return;
    }

    const nextPreview =
      URL.createObjectURL(file);

    setAvatarObjectUrl(
      (currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(
            currentUrl,
          );
        }

        return nextPreview;
      },
    );

    setAvatarFile(file);
    setAvatarPreview(nextPreview);
    setRemoveAvatarOnSave(false);
    setError("");
    setSuccessMessage("");
  };

  const handleAvatarRemove = () => {
    if (avatarFile) {
      setAvatarFile(null);
      setAvatarPreview(
        savedAvatarUrl,
      );
      setAvatarObjectUrl(
        (currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(
              currentUrl,
            );
          }

          return "";
        },
      );
      return;
    }

    if (profileData.avatarPath) {
      setAvatarPreview("");
      setRemoveAvatarOnSave(true);
      setError("");
      setSuccessMessage(
        "Profile photo will be removed when you save.",
      );
    }
  };

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

      const previousAvatarPath =
        profileData.avatarPath || null;

      let nextAvatarPath =
        removeAvatarOnSave
          ? null
          : previousAvatarPath;

      let uploadedAvatarPath = null;

      if (avatarFile) {
        const extension =
          avatarFile.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          (avatarFile.type === "image/png"
            ? "png"
            : avatarFile.type ===
                "image/webp"
              ? "webp"
              : "jpg");

        uploadedAvatarPath =
          `${user.id}/avatar-${Date.now()}.${extension}`;

        const {
          error: avatarUploadError,
        } = await supabase.storage
          .from("profile-photos")
          .upload(
            uploadedAvatarPath,
            avatarFile,
            {
              cacheControl: "3600",
              contentType:
                avatarFile.type,
              upsert: false,
            },
          );

        if (avatarUploadError) {
          throw avatarUploadError;
        }

        nextAvatarPath =
          uploadedAvatarPath;
      }

      const profileUpdate = {
        full_name:
          profileData.fullName.trim(),
        avatar_path:
          nextAvatarPath,
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
        if (uploadedAvatarPath) {
          await supabase.storage
            .from("profile-photos")
            .remove([
              uploadedAvatarPath,
            ]);
        }

        throw new Error(
          "Customer profile record was not found. Please logout, login again and retry.",
        );
      }

      if (
        previousAvatarPath &&
        previousAvatarPath !==
          nextAvatarPath
      ) {
        const {
          error: oldAvatarDeleteError,
        } = await supabase.storage
          .from("profile-photos")
          .remove([
            previousAvatarPath,
          ]);

        if (oldAvatarDeleteError) {
          console.error(
            "Profile saved, but old profile photo could not be removed:",
            oldAvatarDeleteError,
          );
        }
      }

      let nextSignedAvatarUrl = "";

      if (nextAvatarPath) {
        const {
          data: signedAvatar,
          error: signedAvatarError,
        } = await supabase.storage
          .from("profile-photos")
          .createSignedUrl(
            nextAvatarPath,
            60 * 60,
          );

        if (signedAvatarError) {
          console.error(
            "Profile saved, but profile photo preview could not be refreshed:",
            signedAvatarError,
          );
        } else {
          nextSignedAvatarUrl =
            signedAvatar?.signedUrl || "";
        }
      }

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            full_name:
              profileData.fullName.trim(),
            phone:
              profileData.phone.trim(),
            avatar_path:
              nextAvatarPath,
          },
        });

      if (metadataError) {
        console.error(
          "Profile saved, but account display name could not be refreshed:",
          metadataError,
        );
      }

      setProfileData(
        (currentData) => ({
          ...currentData,
          avatarPath:
            nextAvatarPath || "",
        }),
      );

      setAvatarFile(null);
      setRemoveAvatarOnSave(false);
      setSavedAvatarUrl(
        nextSignedAvatarUrl,
      );
      setAvatarPreview(
        nextSignedAvatarUrl,
      );
      setAvatarObjectUrl(
        (currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(
              currentUrl,
            );
          }

          return "";
        },
      );

      setSuccessMessage(
        "Your profile was saved successfully. Your profile photo can now be used automatically in KUSHI AI STUDIO templates.",
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
              <Camera size={19} />

              <div>
                <strong>Profile Photo</strong>
                <span>
                  This photo will automatically appear in supported KUSHI AI STUDIO templates.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "22px",
                flexWrap: "wrap",
                padding: "18px",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(34,211,238,0.035))",
              }}
            >
              <div
                style={{
                  width: "112px",
                  height: "112px",
                  flex: "0 0 112px",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  border: "2px solid rgba(167,139,250,0.32)",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.045)",
                  color: "#c4b5fd",
                  boxShadow:
                    "0 16px 38px rgba(0,0,0,0.24)",
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <UserRound size={44} />
                )}
              </div>

              <div
                style={{
                  minWidth: 0,
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#f8fafc",
                      fontSize: "0.92rem",
                    }}
                  >
                    {avatarPreview
                      ? "Profile photo ready"
                      : "Add your profile photo"}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#8f9cb0",
                      fontSize: "0.72rem",
                      lineHeight: 1.55,
                    }}
                  >
                    JPG, PNG or WEBP · Maximum 5 MB
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "9px",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      minHeight: "42px",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "0 14px",
                      border: "1px solid rgba(167,139,250,0.34)",
                      borderRadius: "11px",
                      background:
                        "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(34,211,238,0.08))",
                      color: "#ede9fe",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={17} />
                    {avatarPreview
                      ? "Change Photo"
                      : "Choose Photo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      hidden
                    />
                  </label>

                  {(avatarPreview ||
                    avatarFile ||
                    profileData.avatarPath) && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      style={{
                        display: "inline-flex",
                        minHeight: "42px",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "0 14px",
                        border: "1px solid rgba(248,113,113,0.22)",
                        borderRadius: "11px",
                        background: "rgba(248,113,113,0.06)",
                        color: "#fca5a5",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>

                {avatarFile && (
                  <small
                    style={{
                      color: "#67e8f9",
                      fontSize: "0.66rem",
                    }}
                  >
                    New photo selected. Click Save Profile to upload it.
                  </small>
                )}

                {removeAvatarOnSave && (
                  <small
                    style={{
                      color: "#fbbf24",
                      fontSize: "0.66rem",
                    }}
                  >
                    Photo will be removed when you click Save Profile.
                  </small>
                )}
              </div>
            </div>
          </div>

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

import { useEffect, useRef, useState } from "react";

import { supabase } from "../services/supabase";

const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_MS = 55 * 60 * 1000;

const isMissingSessionError = (error) =>
  error?.name === "AuthSessionMissingError" ||
  error?.message?.toLowerCase().includes("auth session missing");

function useStudioProfilePhoto() {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [profilePhotoLoading, setProfilePhotoLoading] = useState(true);
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileAvatarPath, setProfileAvatarPath] = useState("");
  const [profileUserId, setProfileUserId] = useState("");

  const loadedUserIdRef = useRef(undefined);

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;
    let refreshTimer = null;

    const clearRefreshTimer = () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const clearProfilePhoto = () => {
      clearRefreshTimer();

      if (!isMounted) {
        return;
      }

      loadedUserIdRef.current = null;
      setProfilePhotoUrl("");
      setProfileFullName("");
      setProfileAvatarPath("");
      setProfileUserId("");
      setProfilePhotoError("");
      setProfilePhotoLoading(false);
    };

    const loadForUser = async (
      user,
      { force = false } = {},
    ) => {
      const userId = user?.id || null;

      if (!userId) {
        clearProfilePhoto();
        return;
      }

      if (
        !force &&
        loadedUserIdRef.current === userId
      ) {
        return;
      }

      loadedUserIdRef.current = userId;

      const currentRequestId = ++requestId;

      clearRefreshTimer();

      if (isMounted) {
        setProfilePhotoLoading(true);
        setProfilePhotoError("");
      }

      try {
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("avatar_path, full_name")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        let signedUrl = "";

        if (profile?.avatar_path) {
          const {
            data: signedAvatar,
            error: signedUrlError,
          } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(
              profile.avatar_path,
              SIGNED_URL_LIFETIME_SECONDS,
            );

          if (signedUrlError) {
            throw signedUrlError;
          }

          signedUrl = signedAvatar?.signedUrl || "";
        }

        if (
          !isMounted ||
          currentRequestId !== requestId
        ) {
          return;
        }

        setProfilePhotoUrl(signedUrl);
        setProfileAvatarPath(profile?.avatar_path || "");
        setProfileUserId(userId);
        setProfileFullName(
          profile?.full_name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            "",
        );
        setProfilePhotoError("");
        setProfilePhotoLoading(false);

        if (signedUrl) {
          refreshTimer = window.setTimeout(() => {
            if (isMounted) {
              loadForUser(user, { force: true });
            }
          }, SIGNED_URL_REFRESH_MS);
        }
      } catch (error) {
        if (
          !isMounted ||
          currentRequestId !== requestId
        ) {
          return;
        }

        setProfilePhotoUrl("");
        setProfileAvatarPath("");
        setProfileUserId(userId);
        setProfileFullName(
          user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            "",
        );
        setProfilePhotoLoading(false);

        if (isMissingSessionError(error)) {
          setProfilePhotoError("");
          return;
        }

        setProfilePhotoError(
          error?.message ||
            "Your profile photo could not be loaded.",
        );
      }
    };

    /*
     * Subscribe first so INITIAL_SESSION / SIGNED_IN cannot be missed.
     * Studio must reload the profile when authentication is restored.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        window.setTimeout(() => {
          if (!isMounted) {
            return;
          }

          if (event === "SIGNED_OUT") {
            clearProfilePhoto();
            return;
          }

          const user = session?.user || null;

          if (!user) {
            return;
          }

          loadForUser(user, {
            force:
              event === "INITIAL_SESSION" ||
              event === "SIGNED_IN" ||
              event === "USER_UPDATED",
          });
        }, 0);
      },
    );

    /*
     * Use getUser() for the first Studio load.
     * This mirrors the working Profile page and validates
     * the current authenticated user before reading profiles.
     */
    const loadCurrentUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        if (
          isMounted &&
          !isMissingSessionError(error)
        ) {
          setProfilePhotoLoading(false);
          setProfilePhotoError(
            error.message ||
              "Your profile photo could not be loaded.",
          );
        }

        return;
      }

      if (!user) {
        clearProfilePhoto();
        return;
      }

      await loadForUser(user, { force: true });
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
      requestId += 1;
      clearRefreshTimer();
      subscription.unsubscribe();
    };
  }, []);

  return {
    profilePhotoUrl,
    profilePhotoLoading,
    profilePhotoError,
    profileFullName,
    profileAvatarPath,
    profileUserId,
  };
}

export default useStudioProfilePhoto;

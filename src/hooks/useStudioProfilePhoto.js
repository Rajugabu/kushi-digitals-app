import { useEffect, useRef, useState } from "react";

import { supabase } from "../services/supabase";

const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_MS = 55 * 60 * 1000;

const isMissingSessionError = (error) =>
  error?.name === "AuthSessionMissingError" ||
  error?.message?.toLowerCase().includes("auth session missing");

function useStudioProfilePhoto() {
  const [profilePhotoUrl, setProfilePhotoUrl] =
    useState("");

  const [profilePhotoLoading, setProfilePhotoLoading] =
    useState(true);

  const [profilePhotoError, setProfilePhotoError] =
    useState("");

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

      if (
        !force &&
        loadedUserIdRef.current === userId
      ) {
        return;
      }

      loadedUserIdRef.current = userId;

      const currentRequestId = ++requestId;

      clearRefreshTimer();

      if (!userId) {
        clearProfilePhoto();
        return;
      }

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
            data,
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

          signedUrl =
            data?.signedUrl || "";
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

        /*
         * Signed URL lasts 60 minutes.
         * Refresh it a few minutes before expiry so
         * template cards do not suddenly lose the photo.
         */
        if (signedUrl) {
          refreshTimer =
            window.setTimeout(() => {
              if (isMounted) {
                loadForUser(user, {
                  force: true,
                });
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
        setProfileUserId(userId || "");
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
     * IMPORTANT:
     * Subscribe first so we do not miss Supabase's
     * INITIAL_SESSION event during page refresh / Vite HMR.
     *
     * The old hook ignored INITIAL_SESSION. That could leave
     * profilePhotoUrl empty even though the user was logged in.
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
            loadedUserIdRef.current = null;
            clearProfilePhoto();
            return;
          }

          loadForUser(
            session?.user || null,
            {
              force:
                event === "USER_UPDATED",
            },
          );
        }, 0);
      },
    );

    /*
     * Also load the currently persisted session immediately.
     * This gives fast results when the user is already signed in.
     */
    const loadCurrentSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

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

      await loadForUser(
        session?.user || null,
        { force: false },
      );
    };

    loadCurrentSession();

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

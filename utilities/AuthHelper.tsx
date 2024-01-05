import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "./Supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { Alert } from "react-native";

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;

  if (!access_token) return;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
};

const redirectUrl = makeRedirectUri({ scheme: "myapp" });

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (data.url) {
    const result = await WebBrowser.openAuthSessionAsync(
      data?.url ?? "",
      redirectUrl
    );
    if (result.type === "success") {
      const { url } = result;
      await createSessionFromUrl(url);
    }
  }
};

export const signInWithApple = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (data.url) {
    const result = await WebBrowser.openAuthSessionAsync(
      data?.url ?? "",
      redirectUrl
    );
    if (result.type === "success") {
      const { url } = result;
      await createSessionFromUrl(url);
    }
  }
};

export const signInWithFacebook = async () => {
  Alert.alert("Uh oh!", "This feature is not enabled yet.");
  // const { data, error } = await supabase.auth.signInWithOAuth({
  //   provider: "facebook",
  //   options: {
  //     redirectTo: redirectUrl,
  //     skipBrowserRedirect: true,
  //   },
  // });

  // if (data.url) {
  //   const result = await WebBrowser.openAuthSessionAsync(
  //     data?.url ?? "",
  //     redirectUrl
  //   );
  //   if (result.type === "success") {
  //     const { url } = result;
  //     await createSessionFromUrl(url);
  //   }
  // }
};

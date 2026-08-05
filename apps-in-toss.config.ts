import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "grocery-signal",

  brand: {
    primaryColor: "#2E9E5B"
  },

  permissions: [],
  webBundleDir: "dist",

  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  }
});

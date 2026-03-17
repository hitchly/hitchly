declare module "*.png" {
  import { type ImageRequireSource } from "react-native";

  // Metro bundler resolves imported images into an opaque number (ImageRequireSource)
  const value: ImageRequireSource;
  export default value;
}

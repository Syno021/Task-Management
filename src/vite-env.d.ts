/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module '@fontsource/*' {
  const font: void;
  export default font;
}

declare module '@fontsource/*/*' {
  const font: void;
  export default font;
}

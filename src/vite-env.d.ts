/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

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

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // シンプルで落ち着いたカラーパレット（熊本大学風）
        'karuta-shikon': '#2B2028',   // 紫紺（プライマリ・ヘッダー・テキスト）
        'karuta-ukon': '#E69B3A',     // 鬱金色（セカンダリ・アクセント）
        'karuta-red': '#c62828',      // 深紅（競技かるた的なアクセント）
        'karuta-gold': '#ffa000',     // ゴールド（予備）
        'karuta-black': '#212121',    // ダークグレー
        'neutral-50': '#fafafa',      // ライトグレー（背景）
        'neutral-100': '#f5f5f5',     // より明るいグレー
        'neutral-200': '#eeeeee',     // グレー
        'neutral-700': '#616161',     // ミディアムグレー
        'neutral-800': '#424242',     // ダークグレー
      },
      fontFamily: {
        'sans': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        'serif': ['Georgia', 'Yu Mincho', 'YuMincho', 'serif'],
      },
    },
  },
  plugins: [],
}

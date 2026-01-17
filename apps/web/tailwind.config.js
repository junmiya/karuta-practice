/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // シンプルで知的なカラーパレット（東大風）
        'karuta-tansei': '#0B8BDB',   // 淡青（プライマリ・UTokyo Blue）
        'karuta-accent': '#F4A000',   // アクセント（補色・ゴールド）
        'karuta-red': '#c62828',      // 深紅（競技かるた的なアクセント・伝統色）
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

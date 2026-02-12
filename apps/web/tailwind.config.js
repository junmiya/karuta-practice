/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 動的クラスをsafelistに追加して確実に生成
  safelist: [
    // Toggle/Select Button variants
    'bg-white', 'bg-gray-100', 'bg-gray-200', 'bg-gray-800',
    'bg-karuta-tansei', 'bg-karuta-accent', 'bg-karuta-red',
    'bg-red-50', 'bg-red-100', 'bg-green-50', 'bg-green-100',
    'text-white', 'text-gray-700', 'text-gray-900', 'text-gray-400',
    'text-red-700', 'text-green-700',
    'border-gray-200', 'border-gray-300', 'border-gray-800',
    'border-karuta-tansei', 'border-karuta-accent', 'border-karuta-red',
    'border-red-200', 'border-green-200',
    'hover:bg-gray-100', 'hover:bg-gray-200', 'hover:bg-gray-700',
    'hover:bg-red-100', 'hover:bg-green-100',
    'hover:bg-yellow-400', 'hover:bg-[#155a96]', 'hover:bg-[#b71c1c]',
    'hover:border-gray-300',
  ],
  theme: {
    extend: {
      colors: {
        // シンプルで知的なカラーパレット（アカデミック・スタイル）
        'karuta-tansei': '#196AAB',   // Academic Blue (Primary UI)
        'karuta-accent': '#FFCB05',   // Focus Yellow (Accent)
        'karuta-sky': '#5BDEFF',      // Official Tansei (Light Blue - Decorative)
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

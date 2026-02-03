/**
 * 103: 団体機能 - QRコードモーダルコンポーネント
 */
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export function QRCodeModal({ isOpen, onClose, url, title = '招待QRコード' }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG
            value={url}
            size={200}
            level="M"
            includeMargin
          />
        </div>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          このQRコードをスキャンして団体に参加できます
        </p>

        <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400 break-all">
          {url}
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              404
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Debug Info (optional) */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            URL: <code className="font-mono">{window.location.pathname}</code>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Refresh Page
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
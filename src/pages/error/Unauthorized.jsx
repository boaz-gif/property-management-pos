import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="text-center text-white max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-red-500/20 rounded-full border border-red-500/50">
            <LogIn className="h-12 w-12 text-red-400" />
          </div>
        </div>

        <h1 className="text-6xl font-bold mb-4">401</h1>
        <h2 className="text-3xl font-semibold mb-4">Unauthorized</h2>
        <p className="text-gray-300 mb-8 text-lg">
          You need to be logged in to access this page.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
          >
            <LogIn className="h-5 w-5" />
            <span>Go to Login</span>
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all duration-200"
          >
            Go Back
          </button>
        </div>

        <p className="text-gray-400 text-sm mt-8">
          If you don't have an account, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;

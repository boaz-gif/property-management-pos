import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

const Forbidden = () => {
  const navigate = useNavigate();
  const { getRoleBasedRedirect, user } = useAuth();

  const goToDashboard = () => {
    navigate(getRoleBasedRedirect());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-4">
      <div className="text-center text-white max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-orange-500/20 rounded-full border border-orange-500/50">
            <AlertCircle className="h-12 w-12 text-orange-400" />
          </div>
        </div>

        <h1 className="text-6xl font-bold mb-4">403</h1>
        <h2 className="text-3xl font-semibold mb-4">Access Forbidden</h2>
        <p className="text-gray-300 mb-8 text-lg">
          You don't have permission to access this resource.
        </p>

        {user && (
          <p className="text-gray-400 text-sm mb-8">
            Your role: <span className="font-semibold text-blue-400 capitalize">{user.role}</span>
          </p>
        )}

        <div className="space-y-4">
          <button
            onClick={goToDashboard}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all duration-200"
          >
            Go Back
          </button>
        </div>

        <p className="text-gray-400 text-sm mt-8">
          If you believe you should have access, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default Forbidden;

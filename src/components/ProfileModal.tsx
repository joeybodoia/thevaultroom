import React, { useState, useRef } from 'react';
import { X, Upload, User, Loader, CheckCircle, AlertCircle, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SupabaseUser;
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  currentAvatarUrl,
  onAvatarUpdate 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setUploadStatus('error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadStatus('idle');
    setDebugInfo(null);

    try {
      const userId = user.id;
      const fileExt = file.name.split('.').pop();
      const filename = `avatar.${fileExt}`;

      setDebugInfo(`Starting upload: userId=${userId}, filename=${filename}`);
      // Upload file to storage
      setDebugInfo(`Attempting upload to: ${userId}/${filename}`);
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`${userId}/${filename}`, file, {
          cacheControl: '3600',
          upsert: true
        });

      setDebugInfo(`Upload response - Data: ${JSON.stringify(data)}, Error: ${JSON.stringify(uploadError)}`);
      if (uploadError) {
        setDebugInfo(`Upload failed with error: ${uploadError.message} (Code: ${uploadError.statusCode})`);
        throw uploadError;
      }

      setDebugInfo(`Upload successful. Data: ${JSON.stringify(data)}`);
      // Generate public URL
      const avatarUrl = `https://bzqnxgohxamuqgyrjwls.supabase.co/storage/v1/object/public/avatars/avatars/${userId}/${filename}`;

      // Update user avatar URL in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) {
        setDebugInfo(`Database update error: ${updateError.message}`);
        throw updateError;
      }

      setDebugInfo(`Database updated successfully with URL: ${avatarUrl}`);
      // Update parent component with new avatar URL
      onAvatarUpdate(avatarUrl);

      setUploadStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setDebugInfo(`Error occurred: ${err.message} | Full error: ${JSON.stringify(err)}`);
      setError(err.message || 'Failed to upload avatar');
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setError(null);
    
    try {
      const userId = user.id;
      
      // Remove avatar from database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Update parent component
      onAvatarUpdate(null);
      setUploadStatus('success');
      
    } catch (err: any) {
      setError(err.message || 'Failed to remove avatar');
      setUploadStatus('error');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-black font-pokemon">Profile Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Avatar Display */}
          <div className="text-center relative">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-200 relative group">
              {currentAvatarUrl ? (
                <>
                  <img 
                    src={currentAvatarUrl} 
                    alt="Current avatar" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isRemovingAvatar}
                      className="text-white hover:text-red-400 transition-colors"
                      title="Remove avatar"
                    >
                      {isRemovingAvatar ? (
                        <Loader className="h-6 w-6 animate-spin" />
                      ) : (
                        <Trash2 className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-600 to-yellow-400 flex items-center justify-center">
                  <span className="text-white font-bold font-pokemon text-2xl">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-600 font-pokemon">{user.email}</p>
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-black font-pokemon">Change Avatar</h4>
            
            <div 
              onClick={handleFileSelect}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-600 hover:bg-red-50 transition-all"
            >
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-pokemon">Click to upload new avatar</p>
              <p className="text-gray-400 text-sm font-pokemon">PNG, JPG up to 5MB</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Status Messages */}
          {debugInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800">
                <span className="font-semibold font-pokemon">Debug Info:</span>
              </div>
              <p className="text-blue-600 text-sm mt-1 font-pokemon break-all">
                {debugInfo}
              </p>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Avatar Updated!</span>
              </div>
              <p className="text-green-600 text-sm mt-1 font-pokemon">
                Your new avatar has been saved successfully.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Upload Failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1 font-pokemon">{error}</p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleFileSelect}
            disabled={isUploading}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                <span>Choose New Avatar</span>
              </>
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center justify-center space-x-2"
          >
            {isSigningOut ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
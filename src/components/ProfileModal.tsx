import React, { useEffect, useRef, useState /*, useRef */ } from 'react';
import { X, /* Upload, User, */ Loader, /* CheckCircle, */ AlertCircle, LogOut, Trash2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SupabaseUser;
  currentAvatarUrl?: string | null;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
}

type EditableField = 'username' | 'ship_address';
type UserProfile = {
  email: string | null;
  username: string | null;
  ship_address: string | null;
};

const googlePlacesKey =
  import.meta.env.VITE_GOOGLE_PLACES_KEY ||
  import.meta.env.VITE_GOOGLE_MAPS_KEY ||
  import.meta.env.VITE_GOOGLE_API_KEY ||
  undefined;

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentAvatarUrl,
  onAvatarUpdate,
}) => {
  // Upload-related state (commented out while avatar upload is disabled)
  // const [isUploading, setIsUploading] = useState(false);
  // const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const [pendingValue, setPendingValue] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressAbortRef = useRef<AbortController | null>(null);
  const [placesSessionToken, setPlacesSessionToken] = useState<string | null>(null);
  // const [debugInfo, setDebugInfo] = useState<string | null>(null);
  // const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;
    setLoadingProfile(true);
    setError(null);

    supabase
      .from('users')
      .select('email, username, ship_address')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) throw fetchError;

        setProfile({
          email: data?.email ?? user.email ?? null,
          username: data?.username ?? null,
          ship_address: data?.ship_address ?? null,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.message || 'Failed to load profile');
        setProfile({
          email: user.email ?? null,
          username: null,
          ship_address: null,
        });
      })
      .finally(() => {
        if (!isMounted) return;
        setLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      setEditingField(null);
      setPendingValue('');
      setSavingField(null);
      setError(null);
      setPlacesSessionToken(null);
    }
  }, [isOpen]);

  /* ========= Avatar upload handlers (disabled for now) ========= */

  // const handleFileSelect = () => {
  //   fileInputRef.current?.click();
  // };

  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     setSelectedFile(file);
  //     setError(null);
  //     setUploadStatus('idle');
  //   }
  // };

  // const handleFileUpload = async () => {
  //   const file = selectedFile;
  //   if (!file) return;
  //
  //   if (!file.type.startsWith('image/')) {
  //     setError('Please select an image file');
  //     setUploadStatus('error');
  //     return;
  //   }
  //
  //   if (file.size > 5 * 1024 * 1024) {
  //     setError('File size must be less than 5MB');
  //     setUploadStatus('error');
  //     return;
  //   }
  //
  //   setIsUploading(true);
  //   setError(null);
  //   setUploadStatus('idle');
  //   setDebugInfo(null);
  //
  //   try {
  //     const userId = user.id;
  //
  //     const uploadTimeoutPromise = new Promise((_, reject) => {
  //       setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
  //     });
  //
  //     const uploadPromise = supabase.storage
  //       .from('avatars')
  //       .upload(file.name, file, {
  //         cacheControl: '3600',
  //         upsert: true,
  //       });
  //
  //     const { data, error } = (await Promise.race([
  //       uploadPromise,
  //       uploadTimeoutPromise,
  //     ])) as any;
  //
  //     if (error) throw error;
  //
  //     const avatarUrl = `https://bzqnxgohxamuqgyrjwls.supabase.co/storage/v1/object/public/avatars/${file.name}`;
  //
  //     const { error: updateError } = await supabase
  //       .from('users')
  //       .update({ avatar: avatarUrl })
  //       .eq('id', userId);
  //
  //     if (updateError) throw updateError;
  //
  //     onAvatarUpdate(avatarUrl);
  //     setUploadStatus('success');
  //     setSelectedFile(null);
  //
  //     setTimeout(() => {
  //       onClose();
  //     }, 1500);
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to upload avatar');
  //     setUploadStatus('error');
  //   } finally {
  //     setIsUploading(false);
  //   }
  // };

  /* ========= Sign out ========= */

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError(null);

    try {
      // Clear client-side session
      localStorage.removeItem('sb-bzqnxgohxamuqgyrjwls-auth-token');
      sessionStorage.clear();

      // Attempt server-side sign-out (best-effort)
      supabase.auth.signOut().catch((err) => {
        console.log('Server signout failed (non-fatal):', err.message);
      });

      onClose();
    } catch (err: any) {
      console.error('Sign out error:', err);
      onClose();
    } finally {
      setIsSigningOut(false);
    }
  };

  /* ========= Remove avatar (still allowed) ========= */

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    setError(null);

    try {
      const userId = user.id;

      const { error: updateError } = await supabase
        .from('users')
        // Note: if your column is `avatar` instead of `avatar_url`, update this accordingly
        .update({ avatar: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(null);
    } catch (err: any) {
      setError(err.message || 'Failed to remove avatar');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const startEditingField = (field: EditableField) => {
    if (loadingProfile) return;
    setEditingField(field);
    setPendingValue(profile?.[field] ?? '');
    setError(null);
    if (field === 'ship_address' && !placesSessionToken) {
      const token =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      setPlacesSessionToken(token);
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
    setPendingValue('');
    setAddressSuggestions([]);
    setPlacesSessionToken(null);
  };

  const saveField = async (field: EditableField) => {
    if (!user?.id) return;

    setSavingField(field);
    setError(null);
    const nextValue = pendingValue.trim();

    try {
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ [field]: nextValue || null })
        .eq('id', user.id)
        .select('email, username, ship_address')
        .single();

      if (updateError) throw updateError;

      setProfile({
        email: data?.email ?? profile?.email ?? user.email ?? null,
        username: data?.username ?? null,
        ship_address: data?.ship_address ?? null,
      });
      setEditingField(null);
      setPendingValue('');
      setAddressSuggestions([]);
      setPlacesSessionToken(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSavingField(null);
    }
  };

  // Address autocomplete (Google Places)
  useEffect(() => {
    if (editingField !== 'ship_address' || !googlePlacesKey) {
      setAddressSuggestions([]);
      setSearchingAddress(false);
      addressAbortRef.current?.abort();
      return;
    }

    const query = pendingValue.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setSearchingAddress(false);
      addressAbortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    addressAbortRef.current?.abort();
    addressAbortRef.current = controller;
    setSearchingAddress(true);

    const handle = setTimeout(async () => {
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googlePlacesKey,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
          },
          body: JSON.stringify({
            input: query,
            // Filter to address-like predictions; optional but helps relevance.
            includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
            sessionToken: placesSessionToken,
          }),
        });
        if (!res.ok) throw new Error('Address lookup failed');
        const json = await res.json();
          const suggestions = Array.isArray(json?.suggestions)
            ? json.suggestions
                .map((s: any) => {
                  const pred = s?.placePrediction;
                  if (!pred) return null;
                  const main = pred?.structuredFormat?.mainText?.text;
                  const secondary = pred?.structuredFormat?.secondaryText?.text;
                  const label = [main, secondary].filter(Boolean).join(', ');
                  return label || null;
                })
                .filter(Boolean)
                .slice(0, 5)
            : [];
        setAddressSuggestions(suggestions);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.warn('Address search failed:', err?.message || err);
        setAddressSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSearchingAddress(false);
      }
    }, 250);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [editingField, pendingValue, placesSessionToken]);

  const applySuggestion = (value: string) => {
    setPendingValue(value);
    setAddressSuggestions([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-black font-pokemon">Profile Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Avatar Display */}
          <div className="text-center relative">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-200 relative group">
              {currentAvatarUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentAvatarUrl}
                    alt="Current avatar"
                    className="w-full h-full object-cover"
                  />
                  {/* Remove avatar overlay */}
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

          {/* User information */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-black font-pokemon">User information</h4>
              {loadingProfile && <Loader className="h-4 w-4 animate-spin text-gray-500" />}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-pokemon">Email</p>
                <p className="text-black font-semibold font-pokemon break-all">
                  {profile?.email ?? user.email ?? '—'}
                </p>
              </div>

              <div className="flex items-start justify-between space-x-3">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-pokemon">Username</p>
                  {editingField === 'username' ? (
                    <input
                      type="text"
                      value={pendingValue}
                      onChange={(e) => setPendingValue(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-pokemon focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Enter username"
                      disabled={savingField === 'username'}
                    />
                  ) : (
                    <p className="text-black font-semibold font-pokemon break-all">
                      {profile?.username || 'Not set'}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 pt-5">
                  {editingField === 'username' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => saveField('username')}
                        disabled={savingField === 'username'}
                        className="bg-yellow-400 text-black px-3 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingField === 'username' ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 px-2 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all font-pokemon"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingField('username')}
                      className="flex items-center space-x-1 text-gray-700 hover:text-black font-semibold font-pokemon"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between space-x-3">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-pokemon">Address</p>
                  {editingField === 'ship_address' ? (
                    <div className="space-y-2">
                      <textarea
                        value={pendingValue}
                        onChange={(e) => setPendingValue(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 font-pokemon focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        placeholder="Street, City, State, Zip"
                        disabled={savingField === 'ship_address'}
                      />
                      {googlePlacesKey ? (
                        <div className="flex items-center justify-between text-xs text-gray-500 font-pokemon">
                          <span>Start typing to search addresses</span>
                          {searchingAddress && <Loader className="h-4 w-4 animate-spin" />}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 font-pokemon">
                          Add VITE_GOOGLE_PLACES_KEY to enable address suggestions.
                        </p>
                      )}
                      {addressSuggestions.length > 0 && (
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-40 overflow-y-auto shadow-sm">
                          {addressSuggestions.map((addr) => (
                            <button
                              key={addr}
                              type="button"
                              onClick={() => applySuggestion(addr)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-yellow-50 font-pokemon"
                            >
                              {addr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-black font-semibold font-pokemon whitespace-pre-line break-words">
                      {profile?.ship_address || 'Not set'}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 pt-5">
                  {editingField === 'ship_address' ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => saveField('ship_address')}
                        disabled={savingField === 'ship_address'}
                        className="bg-yellow-400 text-black px-3 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingField === 'ship_address' ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 px-2 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all font-pokemon"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingField('ship_address')}
                      className="flex items-center space-x-1 text-gray-700 hover:text-black font-semibold font-pokemon"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Avatar upload UI disabled for now */}
          {/*
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
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-800 font-pokemon">Selected File:</p>
                    <p className="text-blue-600 text-sm font-pokemon">{selectedFile.name}</p>
                    <p className="text-blue-500 text-xs font-pokemon">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {debugInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-800">
                <span className="font-semibold font-pokemon">Debug Info:</span>
              </div>
              <pre className="text-blue-600 text-xs mt-1 font-mono whitespace-pre-wrap break-all">
                {debugInfo}
              </pre>
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
          */}

          {/* Error messages (used by remove avatar / signout failures) */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Something went wrong</span>
              </div>
              <p className="text-red-600 text-sm mt-1 font-pokemon">{error}</p>
            </div>
          )}

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

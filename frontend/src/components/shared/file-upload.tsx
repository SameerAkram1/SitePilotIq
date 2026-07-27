'use client';

import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  onUpload: (file: File) => void;
  currentUrl?: string;
  loading?: boolean;
}

export function FileUpload({
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 2,
  onUpload,
  currentUrl,
  loading = false,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      // Validate file type
      const allowedTypes = accept.split(',');
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        return;
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        setError(`File too large. Maximum size: ${maxSizeMB}MB`);
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [accept, maxSizeMB],
  );

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        {preview || currentUrl ? (
          <div className="relative inline-block">
            <img
              src={preview || currentUrl}
              alt="Preview"
              className="max-h-32 rounded-md object-contain"
            />
            {preview && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              {accept.replace(/image\//g, '').toUpperCase()} (max {maxSizeMB}MB)
            </p>
          </div>
        )}
        <input
          id="file-upload"
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {selectedFile && (
        <Button onClick={handleUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </Button>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import UploadForm from '../../components/UploadForm';

export default function UnifiedUpload() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">📁 Upload</h1>
      <UploadForm />
    </div>
  );
}

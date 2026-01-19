
'use client';

/**
 * Uploads a file by sending it to our own API route, which then proxies to catbox.moe.
 * @param file The file to upload.
 * @returns The URL of the uploaded file.
 * @throws Will throw an error if the upload fails.
 */
export async function uploadFile(file: File): Promise<string> {
  console.log(`Uploading file via proxy: ${file.name}`);
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const { url: fileUrl } = await response.json();
    
    if (!fileUrl || !fileUrl.startsWith('http')) {
        throw new Error(`Invalid URL from server: ${fileUrl}`);
    }

    console.log(`File uploaded successfully: ${fileUrl}`);
    return fileUrl;

  } catch (error) {
    console.error('File upload error:', error);
    // Re-throw the error so the calling UI component can handle it and show a proper error message.
    if (error instanceof Error) {
        throw new Error(error.message || 'An unknown upload error occurred.');
    }
    throw new Error('An unknown upload error occurred.');
  }
}

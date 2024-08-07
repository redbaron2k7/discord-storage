'use client'

import { useState, useEffect, useCallback } from 'react';
import { uploadFile, listFiles, downloadFile, deleteFile } from '@/lib/discord-storage';
import FileUploader from '@/components/FileUploader';
import FileList from '@/components/FileList';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/Progress';

// Rename the interface to avoid conflicts with the built-in File type
interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: number;
}

export default function Home() {
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();

  const fetchFiles = useCallback(async (token = botToken, channel = channelId) => {
    if (!token || !channel) return;
    
    try {
      setLoading(true);
      const fetchedFiles = await listFiles(channel, token);
      setFiles(fetchedFiles as StoredFile[]);
    } catch (err) {
      console.error('Error fetching files:', err);
      toast({
        title: 'Error',
        description: `Failed to fetch files: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [botToken, channelId, toast]);

  useEffect(() => {
    const savedBotToken = localStorage.getItem('discordBotToken');
    const savedChannelId = localStorage.getItem('discordChannelId');
    
    if (savedBotToken) setBotToken(savedBotToken);
    if (savedChannelId) setChannelId(savedChannelId);
    
    if (savedBotToken && savedChannelId) {
      fetchFiles(savedBotToken, savedChannelId);
    }
  }, [fetchFiles]);

  const handleUpload = async (file: File) => {
    try {
      setLoading(true);
      setUploadProgress(0);
      await uploadFile(file, channelId, botToken, (progress) => {
        setUploadProgress(progress);
      });
      await fetchFiles();
      toast({
        title: 'Success',
        description: 'File uploaded successfully.',
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      toast({
        title: 'Error',
        description: `Failed to upload file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      setLoading(true);
      setDownloadProgress(0);
      const blob = await downloadFile(fileId, channelId, botToken, (progress) => {
        setDownloadProgress(progress);
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'File downloaded successfully.',
      });
    } catch (err) {
      console.error('Error downloading file:', err);
      toast({
        title: 'Error',
        description: `Failed to download file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      setLoading(true);
      await deleteFile(fileId, channelId, botToken);
      await fetchFiles();
      toast({
        title: 'Success',
        description: 'File deleted successfully.',
      });
    } catch (err) {
      console.error('Error deleting file:', err);
      toast({
        title: 'Error',
        description: `Failed to delete file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('discordBotToken', botToken);
    localStorage.setItem('discordChannelId', channelId);
    fetchFiles();
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ACStorage - Free Storage using Discord</h1>
          <ThemeToggle />
        </div>

        <form onSubmit={handleCredentialsSubmit} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="password"
              placeholder="Bot Token"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full"
            />
            <Input
              type="text"
              placeholder="Channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full"
            />
            <Button type="submit" className="w-full">Set Credentials</Button>
          </div>
        </form>

        <div className="mb-6">
          <FileUploader onUpload={handleUpload} disabled={loading || !botToken || !channelId} />
          {uploadProgress > 0 && (
            <div className="mt-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-center mt-1">{uploadProgress.toFixed(2)}% Uploaded</p>
            </div>
          )}
        </div>

        <div>
          <FileList 
            files={files} 
            onDownload={handleDownload} 
            onDelete={handleDelete}
            loading={loading} 
          />
          {downloadProgress > 0 && (
            <div className="mt-2">
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-center mt-1">{downloadProgress.toFixed(2)}% Downloaded</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
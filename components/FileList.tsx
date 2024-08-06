import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useState } from 'react'

interface File {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: number;
}

interface FileListProps {
  files: File[];
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string) => void;
  loading: boolean;
}

export default function FileList({ files, onDownload, onDelete, loading }: FileListProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ fileId: string, fileName: string } | null>(null);
  const [deleteTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleDeleteClick = (fileId: string, fileName: string) => {setDeleteConfirmation({ fileId, fileName });};

  const handleDeleteConfirm = () => {
    if (deleteConfirmation) {
      onDelete(deleteConfirmation.fileId);
      setDeleteConfirmation(null);
      if (deleteTimeout) {
        clearTimeout(deleteTimeout);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(null);
    if (deleteTimeout) {
      clearTimeout(deleteTimeout);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading files...</div>
  }

  if (files.length === 0) {
    return <div className="text-center text-muted-foreground">No files available</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Available Files</h2>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chunks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{file.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatFileSize(file.size)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{file.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{file.chunks}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button onClick={() => onDownload(file.id, file.name)} variant="ghost" size="sm" className="mr-2">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button onClick={() => handleDeleteClick(file.id, file.name)} variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the file "{deleteConfirmation?.fileName}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
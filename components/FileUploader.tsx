import React, { useState, ChangeEvent, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from './ui/use-toast'

interface FileUploaderProps {
    onUpload: (file: File) => Promise<void>
    disabled?: boolean
}

export default function FileUploader({ onUpload, disabled = false }: FileUploaderProps) {
    const [file, setFile] = useState<File | null>(null)
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (file) {
            await onUpload(file)
            setFile(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) {
            e.preventDefault()
            toast({
                title: 'Error',
                description: 'Please input Bot Token and Channel ID before uploading file.',
                variant: 'destructive',
            })
        }
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div 
                className="flex items-center justify-center w-full"
                onClick={handleClick}
            >
                <label 
                    htmlFor="dropzone-file" 
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 ${disabled ? 'opacity-50' : ''}`}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    </div>
                    <input 
                        ref={fileInputRef}
                        id="dropzone-file" 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileChange} 
                        disabled={disabled} 
                    />
                </label>
            </div>
            {file && (
                <div className="mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Selected file: {file.name}</p>
                    <Button onClick={handleUpload} disabled={disabled} className="mt-2">
                        Upload File
                    </Button>
                </div>
            )}
        </div>
    )
}
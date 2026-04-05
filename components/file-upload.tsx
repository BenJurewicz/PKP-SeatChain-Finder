"use client";

import { Upload, File as FileIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileUpload({ onChange, accept, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    onChange(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  return (
    <div
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
        disabled && "cursor-not-allowed opacity-60"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <div className="flex-shrink-0">
        {selectedFile ? (
          <FileIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {selectedFile ? (
          <div className="text-sm">
            <p className="truncate font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs">HAR file (JSON format)</p>
          </div>
        )}
      </div>
      <Input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </div>
  );
}

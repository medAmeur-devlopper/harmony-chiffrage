"use client";

import { useState } from "react";
import { DocumentPreviewModal, PreviewableDocument } from "./document-preview-modal";

export interface RecentDocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  createdAtLabel: string;
  icon: string;
}

export function RecentDocumentsGrid({
  projectId,
  documents,
}: {
  projectId: string;
  documents: RecentDocumentItem[];
}) {
  const [previewDoc, setPreviewDoc] = useState<PreviewableDocument | null>(null);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {documents.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() =>
              setPreviewDoc({
                id: doc.id,
                fileName: doc.fileName,
                mimeType: doc.mimeType,
                isImage: doc.mimeType.startsWith("image/"),
              })
            }
            className="hover-card-magnetic flex items-center gap-3 rounded-xl border border-subtle p-3 text-left"
          >
            <span className="text-2xl">{doc.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-primary">{doc.fileName}</span>
              <span className="block text-[11px] text-muted">{doc.createdAtLabel}</span>
            </span>
          </button>
        ))}
      </div>

      <DocumentPreviewModal doc={previewDoc} projectId={projectId} onClose={() => setPreviewDoc(null)} />
    </>
  );
}

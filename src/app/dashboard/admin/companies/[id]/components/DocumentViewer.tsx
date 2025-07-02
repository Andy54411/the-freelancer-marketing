"use client";

import { Badge } from "@/components/ui/badge";
import { FiCheckCircle, FiXCircle, FiExternalLink } from "react-icons/fi";
import Link from "next/link";

interface DocumentViewerProps {
    label: string;
    fileUrl: string | null;
    stripeFileId: string | null; // Für zukünftige Verwendung beibehalten
}

export function DocumentViewer({ label, fileUrl }: DocumentViewerProps) {
    const hasFile = !!fileUrl;

    return (
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
            <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <div className="flex items-center gap-3">
                {hasFile ? (
                    <>
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700">
                            <FiCheckCircle className="mr-1 h-3 w-3" />
                            Hochgeladen
                        </Badge>
                        <Link href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" aria-label={`Dokument ${label} ansehen`}>
                            <FiExternalLink className="h-4 w-4" />
                        </Link>
                    </>
                ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700">
                        <FiXCircle className="mr-1 h-3 w-3" />
                        Fehlt
                    </Badge>
                )}
            </div>
        </div>
    );
}
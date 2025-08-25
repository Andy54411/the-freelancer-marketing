'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clients';
import { FiSend, FiLoader } from 'react-icons/fi';

interface ReplyToReviewData {
  reviewId: string;
  antwortText: string;
  companyId: string;
  companyName: string;
}

interface ReplyToReviewResult {
  success: boolean;
  message: string;
}

interface ReviewReplyFormProps {
  reviewId: string;
  companyId: string;
  companyName: string;
  onReplySubmitted: () => void;
  onCancel: () => void;
}

export default function ReviewReplyForm({
  reviewId,
  companyId,
  companyName,
  onReplySubmitted,
  onCancel,
}: ReviewReplyFormProps) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (replyText.trim().length < 10) {
      setError('Die Antwort muss mindestens 10 Zeichen lang sein.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const replyToReviewCallable = httpsCallable<ReplyToReviewData, ReplyToReviewResult>(
        functions,
        'replyToReview'
      );

      const result = await replyToReviewCallable({
        reviewId,
        antwortText: replyText.trim(),
        companyId,
        companyName,
      });

      if (result.data.success) {
        onReplySubmitted();
      } else {
        setError(result.data.message || 'Fehler beim Senden der Antwort.');
      }
    } catch (err: any) {

      setError('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg border">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Als {companyName} antworten</h4>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder="Schreiben Sie Ihre Antwort hier..."
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          maxLength={1000}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {replyText.length}/1000 Zeichen (mindestens 10)
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Abbrechen
            </button>

            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting || replyText.trim().length < 10}
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="animate-spin" />
                  Senden...
                </>
              ) : (
                <>
                  <FiSend />
                  Antworten
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

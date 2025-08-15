import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialProps?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialProps, err }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-400 mb-4">{statusCode || 'Fehler'}</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            {statusCode === 404
              ? 'Seite nicht gefunden'
              : statusCode === 500
                ? 'Server-Fehler'
                : 'Ein Fehler ist aufgetreten'}
          </h2>
          <p className="text-gray-600 mb-6">
            {statusCode === 404
              ? 'Die angeforderte Seite konnte nicht gefunden werden.'
              : 'Entschuldigung, es ist ein unerwarteter Fehler aufgetreten.'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#14ad9f] hover:bg-[#129488] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;

import { Suspense } from 'react';
import { FiLoader } from 'react-icons/fi';
import { getAiConfigData } from '@/lib/ai-config-data';
import AiConfigClient from './AiConfigClient';

export const dynamic = "force-dynamic";

/**
 * This is a Server Component that fetches the initial AI configuration data.
 * It then passes this data to a Client Component (`AiConfigClient`) which handles the form interaction.
 * This pattern avoids client-side data fetching on initial load and resolves the build error.
 */
export default async function AiConfigPage() {
    const config = await getAiConfigData();

    return (
        <Suspense fallback={<div className="flex justify-center items-center h-32"><FiLoader className="animate-spin text-2xl" /></div>}>
            <AiConfigClient initialConfig={config} />
        </Suspense>
    );
}
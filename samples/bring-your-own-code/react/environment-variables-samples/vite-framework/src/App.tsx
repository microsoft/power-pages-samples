import { useMemo, useState } from 'react';

type Row = { key: string; value: string; source: string };

function resolveFlag(value: string | undefined) {
    return value === '1' || value?.toLowerCase() === 'true' ? 'ON' : 'OFF';
}

export function App() {
    const [timestamp] = useState<string>(__BUILD_TIME__);

    const rows = useMemo<Row[]>(() => {
        const env = import.meta.env;
        return [
            { key: 'MODE', value: env.MODE, source: 'Vite builtin' },
            { key: 'BASE_URL', value: env.BASE_URL, source: 'Vite builtin' },
            { key: 'DEV', value: String(env.DEV), source: 'Vite builtin' },
            { key: 'PROD', value: String(env.PROD), source: 'Vite builtin' },

            { key: 'VITE_PUBLIC_TITLE', value: env.VITE_PUBLIC_TITLE ?? '(unset)', source: '.env*' },
            { key: 'VITE_API_BASE_URL', value: env.VITE_API_BASE_URL ?? '(unset)', source: '.env*' },
            { key: 'VITE_FEATURE_FLAG_EXPERIMENTAL', value: resolveFlag(env.VITE_FEATURE_FLAG_EXPERIMENTAL), source: '.env*' },
        ];
    }, []);

    return (
        <div className="container">
            <h1>Vite + React: Environment Variables</h1>
            <p className="muted">Build time: <code>{ timestamp }</code></p>

            <section>
                <h2>How it works</h2>
                <ol>
                    <li>Only variables starting with <code>VITE_</code> are exposed to the client.</li>
                    <li>Use <code>import.meta.env</code> to read them at runtime. Vite inlines values during build.</li>
                    <li>Scope values per mode by creating <code>.env.development</code>, <code>.env.production</code>, etc.</li>
                    <li>You can also define compile-time constants in <code>vite.config.ts</code> using <code>define</code>.</li>
                </ol>
            </section>

            <section>
                <h2>Current values</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                            <th>Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        { rows.map(r => (
                            <tr key={ r.key }>
                                <td><code>{ r.key }</code></td>
                                <td><code>{ r.value }</code></td>
                                <td>{ r.source }</td>
                            </tr>
                        )) }
                    </tbody>
                </table>
            </section>

            <section className="spaced">
                <h2>Example usage</h2>
                <p>
                    API Base URL: <code>{ import.meta.env.VITE_API_BASE_URL ?? 'not set' }</code>
                </p>
                <p>
                    Experimental features are { resolveFlag(import.meta.env.VITE_FEATURE_FLAG_EXPERIMENTAL) }.
                </p>
            </section>
        </div>
    );
}

export default App;

/** Shown instead of the app when the Supabase project is not configured. */
export default function ConfigMissing() {
  return (
    <main className="min-h-screen grid place-items-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl w-full" role="alert">
        <h1 className="text-4xl mb-4">Forage is not connected yet</h1>
        <p className="text-[17px] mb-4" style={{ color: 'var(--ink-muted)' }}>
          The app needs the address and public key of a Supabase project, and neither was found.
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-[16px] mb-5">
          <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
          <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> from Supabase, under Project Settings and then API.</li>
          <li>Restart the dev server, or rebuild if this is a deployed site. On Vercel, add both as environment variables.</li>
        </ol>
        <p className="text-[15px]" style={{ color: 'var(--ink-muted)' }}>
          Use the anon key, never the service-role key. The README has the full setup guide.
        </p>
      </div>
    </main>
  )
}

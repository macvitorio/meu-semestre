// Entrega ao navegador apenas a URL e a chave pública (anon) do Supabase.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    aiEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS設定（ブラウザからの通信を許可するおまじない）
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST' } })
  }

  try {
    const { licenseKey, userId } = await req.json()
    
    // ✨ ここが秘密の合言葉！BOOTHのテキストファイルに書く言葉と合わせてね！
    const secretKeyword = "-MOFUMITSU-PRO";

    // 入力されたキーの「最後」が合言葉と一致しているかチェック！
    if (!licenseKey || !licenseKey.endsWith(secretKeyword)) {
      return new Response(JSON.stringify({ error: '無効なライセンスキーです💦' }), { 
        status: 400, 
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } 
      })
    }

    // Supabaseにアクセスする準備
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 👑 合言葉が合っていたら、そのユーザーをPro版に昇格させる！！
    await supabase.auth.admin.updateUserById(userId, { 
      user_metadata: { is_pro: true } 
    })

    // 成功の返事を返す！
    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } 
    })
  }
})

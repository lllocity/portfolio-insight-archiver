-- ============================================================
-- 005_email_allowlist_rpc.sql
-- allowed_emails へのロール権限付与と allowlist チェック RPC
-- ============================================================

-- authenticated ロールに SELECT 権限を付与（004 で漏れていた）
GRANT SELECT ON public.allowed_emails TO authenticated;

-- ------------------------------------------------------------
-- is_email_allowed(): 現在のユーザーが許可リストに含まれるか確認
-- SECURITY DEFINER により RLS をバイパスして直接参照できる。
-- フロントエンドから supabase.rpc('is_email_allowed') で呼び出す。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_email_allowed()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.allowed_emails WHERE email = auth.email()
    );
END;
$$;

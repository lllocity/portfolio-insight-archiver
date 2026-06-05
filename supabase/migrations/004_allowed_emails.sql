-- ============================================================
-- 004_allowed_emails.sql
-- メールアドレス許可リスト（招待制アクセス制御）
--
-- 【運用方針】
--   実データ（許可するメールアドレス）は INSERT 文で管理せず、
--   Supabase ダッシュボード > Table Editor > allowed_emails から
--   直接登録・削除すること。
-- ============================================================

-- ------------------------------------------------------------
-- allowed_emails: サインアップを許可するメールアドレスの許可リスト
-- ------------------------------------------------------------
CREATE TABLE public.allowed_emails (
    email TEXT PRIMARY KEY
);

-- ------------------------------------------------------------
-- RLS: 認証済みユーザーは自分のメールアドレスの行のみ SELECT 可
-- ------------------------------------------------------------
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allowed_emails_self_read" ON public.allowed_emails
    FOR SELECT
    USING (email = auth.email());

-- ------------------------------------------------------------
-- トリガー関数: allowed_emails に存在しないメールはサインアップをブロック
-- SECURITY DEFINER により、RLS をバイパスして allowed_emails を参照できる。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_allowed_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.allowed_emails WHERE email = NEW.email
    ) THEN
        RAISE EXCEPTION 'このメールアドレスはサインアップが許可されていません: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- BEFORE INSERT トリガー: auth.users への挿入前に許可リストを検証
-- ------------------------------------------------------------
CREATE TRIGGER trg_check_allowed_email
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_allowed_email();

-- 用户密码验证函数
CREATE OR REPLACE FUNCTION verify_user_password(input_username TEXT, input_password TEXT)
RETURNS TABLE(user_id UUID, username VARCHAR, role VARCHAR, email VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.user_id, u.username, u.role, u.email
    FROM users u
    WHERE u.username = input_username
    AND u.password_hash = crypt(input_password, u.password_hash);
END;
$$; 
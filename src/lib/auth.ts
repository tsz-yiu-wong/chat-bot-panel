/**
 * @fileoverview
 * 服务端认证服务。
 * 封装了从 Supabase 获取当前登录用户会话和完整档案的逻辑。
 * 仅限在服务端环境（Server Components, API Routes, Server Actions）中使用。
 */
import { createServerActionClient } from './supabase-server';
import { type UserRole } from './permissions';
import { handleError } from './error-handler';

// 定义从 `get_my_profile` RPC 函数返回的用户档案类型
export interface UserProfile {
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

/**
 * 获取当前登录用户的完整信息。
 * 如果用户未登录或获取信息失败，则返回 null。
 * @returns {Promise<UserProfile | null>} 当前用户的档案信息。
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerActionClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    const { data: profileData, error } = await supabase.rpc('get_my_profile');

    if (error || !profileData || profileData.length === 0) {
      // 如果 RPC 调用出错或未返回数据，记录错误并返回 null
      handleError(error || new Error('User profile not found.'), {
        context: 'getCurrentUser',
        userId: session.user.id,
      });
      return null;
    }

    return profileData[0] as UserProfile;
  } catch (error) {
    handleError(error, { context: 'getCurrentUser' });
    return null;
  }
}

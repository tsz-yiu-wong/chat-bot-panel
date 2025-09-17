import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { hasPagePermission, getDefaultPage, type UserRole } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // 如果用户未登录且不是访问登录页面，重定向到登录页
  if (!session && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 如果用户已登录，检查页面访问权限
  if (session) {
    try {
      // 在中间件中统一获取用户完整信息
      const { data: profileData, error } = await supabase.rpc('get_my_profile');

      if (error || !profileData || profileData.length === 0) {
        console.error('在中间件中获取用户信息失败:', error);
        // 如果获取失败，允许访问但后续页面将按未登录用户处理
        return response;
      }

      const userProfile = profileData[0];
      const userRole = userProfile.role as UserRole;

      // 1. 进行权限检查和重定向
      if (pathname === "/login") {
        const defaultPage = getDefaultPage(userRole);
        return NextResponse.redirect(new URL(defaultPage, request.url));
      }
      
      if (!hasPagePermission(userRole, pathname)) {
        const defaultPage = getDefaultPage(userRole);
        return NextResponse.redirect(new URL(defaultPage, request.url));
      }

      // 2. 将用户信息注入到请求头中，供服务器组件使用
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-profile', JSON.stringify(userProfile));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      console.error('中间件权限检查错误:', error);
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*|_next).*)",
  ],
};

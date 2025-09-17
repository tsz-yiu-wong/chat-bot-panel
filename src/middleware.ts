import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { hasPagePermission, getDefaultPage, type UserRole } from "@/lib/permissions";
import { handleError } from "@/lib/error-handler";

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
        handleError(error || new Error("Failed to get user profile in middleware"), { path: request.nextUrl.pathname });
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
      
      // 2. 无需再向请求头注入用户信息，Server Component 会自行获取
      return response;

    } catch (error) {
      handleError(error, { context: 'Middleware permission check' });
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

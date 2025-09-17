import { createServerActionClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const supabase = await createServerActionClient();

  // 1. Securely fetch the user's email using the RPC function
  const { data, error: rpcError } = await supabase.rpc(
    "get_email_by_username",
    {
      p_username: username,
    }
  );

  // The RPC function returns an array, even if it's just one result.
  const email = data?.[0]?.email;

  if (rpcError || !email) {
    // Return a generic error to avoid user enumeration attacks
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  // 2. Sign in the user with the retrieved email and provided password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  return NextResponse.json({ message: "Login successful." });
}

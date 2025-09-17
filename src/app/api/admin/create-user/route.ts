import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-client';

export async function POST(request: Request) {
  const { email, password, username, role } = await request.json();

  if (!email || !password || !username || !role) {
    return NextResponse.json(
      { error: 'Email, password, username, and role are required.' },
      { status: 400 }
    );
  }

  // TODO: Add authentication and authorization check here.
  // Only allow admins or super_admins to create users.

  const supabaseAdmin = createAdminClient();

  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Automatically confirm the user's email
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'User could not be created.' }, { status: 500 });
  }

  const newUserId = authData.user.id;

  // 2. The trigger `on_auth_user_created` has already created a profile.
  //    Now, update it with the provided username and role.
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .update({ username, role })
    .eq('id', newUserId);

  if (profileError) {
    // If updating the profile fails, it's a good practice to delete the created auth user
    // to avoid orphaned users.
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User created successfully.', userId: newUserId });
}

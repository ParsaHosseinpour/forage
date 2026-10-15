-- Step 21: let a signed-in user delete their own account.
--
-- The browser client cannot delete rows in auth.users, so the app calls this
-- SECURITY DEFINER function via supabase.rpc('delete_my_account').
-- Every user-owned table (profiles, fridge_items, saved_recipes, meal_plan,
-- cook_history, shopping_checks) references auth.users ON DELETE CASCADE, so
-- removing the auth user removes all of their data too.
--
-- Run this once in the Supabase SQL editor.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

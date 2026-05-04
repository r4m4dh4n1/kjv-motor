-- Enable RLS on pembukuan table
alter table "public"."pembukuan" enable row level security;

-- Drop existing policies if any to avoid duplicate errors
drop policy if exists "Enable insert for authenticated users only" on "public"."pembukuan";
drop policy if exists "Enable read for authenticated users only" on "public"."pembukuan";
drop policy if exists "Enable update for authenticated users only" on "public"."pembukuan";
drop policy if exists "Enable delete for authenticated users only" on "public"."pembukuan";

-- Create permissive policies for authenticated users
create policy "Enable insert for authenticated users only"
on "public"."pembukuan"
for insert
to authenticated
with check (true);

create policy "Enable read for authenticated users only"
on "public"."pembukuan"
for select
to authenticated
using (true);

create policy "Enable update for authenticated users only"
on "public"."pembukuan"
for update
to authenticated
using (true)
with check (true);

create policy "Enable delete for authenticated users only"
on "public"."pembukuan"
for delete
to authenticated
using (true);

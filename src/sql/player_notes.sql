-- Create player_notes table
create table if not exists player_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  target_puuid text not null,
  target_game_name text,
  target_tag_line text,
  note text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, target_puuid)
);

-- Enable RLS
alter table player_notes enable row level security;

-- Policies
create policy "Users can view their own notes"
  on player_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notes"
  on player_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on player_notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on player_notes for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_player_notes_user_target
  on player_notes(user_id, target_puuid);

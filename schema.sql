create table if not exists users (
  id serial primary key, email text unique not null, name text not null,
  pass_hash text not null, points int not null default 0, created_at timestamptz default now());
create table if not exists campaigns (
  id serial primary key, title text not null, description text, emoji text default '💚',
  category text default 'Umum', goal bigint not null, raised bigint not null default 0, ends_at date);
create table if not exists donations (
  id serial primary key, order_id text unique not null,
  user_id int references users(id), campaign_id int references campaigns(id),
  title text not null, amount bigint not null, method text,
  status text not null default 'pending', created_at timestamptz default now());
create table if not exists ambulance_requests (
  id serial primary key, user_id int references users(id), address text not null, note text,
  lat double precision, lng double precision, status text not null default 'received',
  vol_name text, vol_lat double precision, vol_lng double precision, vol_updated timestamptz,
  created_at timestamptz default now());

-- Data awal (aman dijalankan berulang: hanya terisi jika tabel campaigns kosong)
insert into campaigns (title, description, emoji, category, goal, raised, ends_at)
select * from (values
 ('Renovasi Musholla Al-Ikhlas','Kebutuhan tempat ibadah santri kami menguat, marilah berbagi.','🕌','Ibadah',100000000,72400000,current_date+12),
 ('Donasi Al-Qur’an untuk 100 Santri','1 mushaf untuk 1 santri, mudah, amanah, dilaporkan.','📖','Pendidikan',50000000,23100000,current_date+20),
 ('Bantuan Operasi Anak Yatim','Membantu Rivai menjalani operasi demi kembali bermain.','💚','Kesehatan',56000000,15800000,current_date+30)
) v where not exists (select 1 from campaigns);

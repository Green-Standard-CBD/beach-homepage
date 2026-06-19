-- slot_capacity を「1時間単位」から「30分単位」に移行する
-- 既存の各時間（例：19時）の設定は、その時間内の前半・後半（19:00と19:30）の両方に複製される

alter table slot_capacity rename column hour to old_hour;
alter table slot_capacity add column time text;
alter table slot_capacity drop constraint slot_capacity_pkey;

update slot_capacity
  set time = lpad(old_hour::text, 2, '0') || ':00';

insert into slot_capacity (date, time, capacity, old_hour)
  select date, lpad(old_hour::text, 2, '0') || ':30', capacity, old_hour
  from slot_capacity;

alter table slot_capacity drop column old_hour;
alter table slot_capacity alter column time set not null;
alter table slot_capacity add primary key (date, time);

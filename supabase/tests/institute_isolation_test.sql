-- Institute isolation harness. Runs entirely inside a transaction and rolls back.
-- Run with the service role (SQL editor). Every row must read PASS.
-- Last run 2026-08-11: 7/7 PASS.

begin;

create temp table res(test text, expected text, actual text);
grant all on res to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
 ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fac.a@test.invalid','x',now(),now(),now()),
 ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fac.b@test.invalid','x',now(),now(),now());

insert into public.institutes (id,name,slug) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Test Institute A','test-inst-a'),
 ('bbbbbbbb-0000-0000-0000-000000000002','Test Institute B','test-inst-b');

insert into public.user_roles (user_id, role, institute_id) values
 ('11111111-1111-1111-1111-111111111111','faculty','aaaaaaaa-0000-0000-0000-000000000001'),
 ('22222222-2222-2222-2222-222222222222','faculty','bbbbbbbb-0000-0000-0000-000000000002');

insert into public.subjects (id,name,slug) values ('cccccccc-0000-0000-0000-000000000003','TestSubject','test-subject');

insert into public.questions (id,subject_id,question_text,institute_id,status,created_by) values
 ('dddddddd-0000-0000-0000-000000000004','cccccccc-0000-0000-0000-000000000003','SECRET QUESTION OF INSTITUTE B','bbbbbbbb-0000-0000-0000-000000000002','approved','22222222-2222-2222-2222-222222222222');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
declare qid uuid; n int;
begin
  select count(*) into n from public.questions where id = 'dddddddd-0000-0000-0000-000000000004';
  insert into res values ('A reads B approved question', '0', n::text);

  select count(*) into n from public.institutes;
  insert into res values ('A sees only own institute', '1', n::text);

  begin
    insert into public.questions (subject_id,question_text,institute_id,status,created_by)
    values ('cccccccc-0000-0000-0000-000000000003','x','bbbbbbbb-0000-0000-0000-000000000002','draft','11111111-1111-1111-1111-111111111111');
    insert into res values ('A writes into B', 'blocked', 'allowed');
  exception when others then insert into res values ('A writes into B', 'blocked', 'blocked');
  end;

  begin
    insert into public.questions (subject_id,question_text,institute_id,status,created_by)
    values ('cccccccc-0000-0000-0000-000000000003','own q','aaaaaaaa-0000-0000-0000-000000000001','draft','11111111-1111-1111-1111-111111111111')
    returning id into qid;
    insert into res values ('A creates own draft', 'ok', 'ok');
    begin
      insert into public.options (question_id, option_text, is_correct, sort_order) values (qid,'opt',true,1);
      insert into res values ('A adds options to own draft', 'ok', 'ok');
    exception when others then insert into res values ('A adds options to own draft', 'ok', 'failed: ' || sqlerrm);
    end;
  exception when others then insert into res values ('A creates own draft', 'ok', 'failed: ' || sqlerrm);
  end;

  begin
    update public.questions set status = 'approved'
     where created_by = auth.uid() and institute_id = 'aaaaaaaa-0000-0000-0000-000000000001';
    insert into res values ('A self-approves own question', 'blocked', case when found then 'allowed' else 'blocked' end);
  exception when others then insert into res values ('A self-approves own question', 'blocked', 'blocked');
  end;

  begin
    perform is_correct from public.options limit 1;
    insert into res values ('A reads answer key column', 'blocked', 'allowed');
  exception when others then insert into res values ('A reads answer key column', 'blocked', 'blocked');
  end;
end $$;

select test, expected, actual,
       case when actual = expected then 'PASS' else 'FAIL' end as result
from res;

-- Must return zero rows.
select * from public.rls_grant_gaps;

rollback;

begin;
select cron.unschedule('jaliyat-ai-retention');
drop table public.ai_cache;
drop table public.ai_usage;
commit;

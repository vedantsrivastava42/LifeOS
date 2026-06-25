-- ════════════════════════════════════════════════════════════════════════
--  QuestLog — preset: System Design category + 10-week roadmap sheet
-- ════════════════════════════════════════════════════════════════════════
--  GENERATED. Global preset rows (user_id NULL, is_preset true). Idempotent.
--  topic = week theme; items are the week's checklist topics.
-- ════════════════════════════════════════════════════════════════════════

insert into public.categories (id, user_id, name, icon, color, is_preset) values
  ('00000000-0000-0000-0000-000000000005', null, 'System Design', '🏗️', '#5cc8ff', true)
on conflict (id) do nothing;

insert into public.sheets (id, user_id, name, source, category_id, is_preset, description) values
  ('00000000-0000-0000-0000-0000000000a3', null, 'System Design (10-Week)', 'custom', '00000000-0000-0000-0000-000000000005', true,
   'A balanced 10-week system design roadmap — fundamentals to case studies (52 topics).')
on conflict (id) do nothing;

insert into public.sheet_items (id, user_id, sheet_id, title, topic, order_index) values
  ('33333333-3333-4333-8333-000000000001', null, '00000000-0000-0000-0000-0000000000a3', 'What is System Design?', 'Week 1 — Core Fundamentals', 1),
  ('33333333-3333-4333-8333-000000000002', null, '00000000-0000-0000-0000-0000000000a3', 'Horizontal vs Vertical Scaling', 'Week 1 — Core Fundamentals', 2),
  ('33333333-3333-4333-8333-000000000003', null, '00000000-0000-0000-0000-0000000000a3', 'Capacity Estimation', 'Week 1 — Core Fundamentals', 3),
  ('33333333-3333-4333-8333-000000000004', null, '00000000-0000-0000-0000-0000000000a3', 'What is HTTP?', 'Week 1 — Core Fundamentals', 4),
  ('33333333-3333-4333-8333-000000000005', null, '00000000-0000-0000-0000-0000000000a3', 'Internet TCP/IP Stack', 'Week 1 — Core Fundamentals', 5),
  ('33333333-3333-4333-8333-000000000006', null, '00000000-0000-0000-0000-0000000000a3', 'What happens when you enter Google.com?', 'Week 1 — Core Fundamentals', 6),
  ('33333333-3333-4333-8333-000000000007', null, '00000000-0000-0000-0000-0000000000a3', 'Relational Databases', 'Week 2 — Databases (SQL + NoSQL)', 7),
  ('33333333-3333-4333-8333-000000000008', null, '00000000-0000-0000-0000-0000000000a3', 'Database Indexes', 'Week 2 — Databases (SQL + NoSQL)', 8),
  ('33333333-3333-4333-8333-000000000009', null, '00000000-0000-0000-0000-0000000000a3', 'NoSQL Databases', 'Week 2 — Databases (SQL + NoSQL)', 9),
  ('33333333-3333-4333-8333-000000000010', null, '00000000-0000-0000-0000-0000000000a3', 'What is a Cache?', 'Week 2 — Databases (SQL + NoSQL)', 10),
  ('33333333-3333-4333-8333-000000000011', null, '00000000-0000-0000-0000-0000000000a3', 'Thrashing', 'Week 2 — Databases (SQL + NoSQL)', 11),
  ('33333333-3333-4333-8333-000000000012', null, '00000000-0000-0000-0000-0000000000a3', 'What are Threads?', 'Week 2 — Databases (SQL + NoSQL)', 12),
  ('33333333-3333-4333-8333-000000000013', null, '00000000-0000-0000-0000-0000000000a3', 'What is Load Balancing?', 'Week 3 — Load Balancing + Sharding', 13),
  ('33333333-3333-4333-8333-000000000014', null, '00000000-0000-0000-0000-0000000000a3', 'What is Consistent Hashing?', 'Week 3 — Load Balancing + Sharding', 14),
  ('33333333-3333-4333-8333-000000000015', null, '00000000-0000-0000-0000-0000000000a3', 'What is Sharding?', 'Week 3 — Load Balancing + Sharding', 15),
  ('33333333-3333-4333-8333-000000000016', null, '00000000-0000-0000-0000-0000000000a3', 'Bloom Filters', 'Week 4 — Data Stores + Replication', 16),
  ('33333333-3333-4333-8333-000000000017', null, '00000000-0000-0000-0000-0000000000a3', 'Data Replication', 'Week 4 — Data Stores + Replication', 17),
  ('33333333-3333-4333-8333-000000000018', null, '00000000-0000-0000-0000-0000000000a3', 'How NoSQL DBs are Optimized', 'Week 4 — Data Stores + Replication', 18),
  ('33333333-3333-4333-8333-000000000019', null, '00000000-0000-0000-0000-0000000000a3', 'Location-Based Databases', 'Week 4 — Data Stores + Replication', 19),
  ('33333333-3333-4333-8333-000000000020', null, '00000000-0000-0000-0000-0000000000a3', 'Database Migrations', 'Week 4 — Data Stores + Replication', 20),
  ('33333333-3333-4333-8333-000000000021', null, '00000000-0000-0000-0000-0000000000a3', 'What is Data Consistency?', 'Week 5 — Consistency Models', 21),
  ('33333333-3333-4333-8333-000000000022', null, '00000000-0000-0000-0000-0000000000a3', 'Data Consistency Levels', 'Week 5 — Consistency Models', 22),
  ('33333333-3333-4333-8333-000000000023', null, '00000000-0000-0000-0000-0000000000a3', 'Transaction Isolation Levels', 'Week 5 — Consistency Models', 23),
  ('33333333-3333-4333-8333-000000000024', null, '00000000-0000-0000-0000-0000000000a3', 'Message Queue', 'Week 6 — Message Queues + Event Systems', 24),
  ('33333333-3333-4333-8333-000000000025', null, '00000000-0000-0000-0000-0000000000a3', 'Publisher–Subscriber Model', 'Week 6 — Message Queues + Event Systems', 25),
  ('33333333-3333-4333-8333-000000000026', null, '00000000-0000-0000-0000-0000000000a3', 'Event-Driven Systems', 'Week 6 — Message Queues + Event Systems', 26),
  ('33333333-3333-4333-8333-000000000027', null, '00000000-0000-0000-0000-0000000000a3', 'DB as a Message Queue', 'Week 6 — Message Queues + Event Systems', 27),
  ('33333333-3333-4333-8333-000000000028', null, '00000000-0000-0000-0000-0000000000a3', 'Single Point of Failure', 'Week 7 — DevOps + Reliability', 28),
  ('33333333-3333-4333-8333-000000000029', null, '00000000-0000-0000-0000-0000000000a3', 'Containers', 'Week 7 — DevOps + Reliability', 29),
  ('33333333-3333-4333-8333-000000000030', null, '00000000-0000-0000-0000-0000000000a3', 'Service Discovery & Heartbeats', 'Week 7 — DevOps + Reliability', 30),
  ('33333333-3333-4333-8333-000000000031', null, '00000000-0000-0000-0000-0000000000a3', 'Avoiding Cascading Failures', 'Week 7 — DevOps + Reliability', 31),
  ('33333333-3333-4333-8333-000000000032', null, '00000000-0000-0000-0000-0000000000a3', 'Anomaly Detection', 'Week 7 — DevOps + Reliability', 32),
  ('33333333-3333-4333-8333-000000000033', null, '00000000-0000-0000-0000-0000000000a3', 'Distributed Rate Limiting', 'Week 7 — DevOps + Reliability', 33),
  ('33333333-3333-4333-8333-000000000034', null, '00000000-0000-0000-0000-0000000000a3', 'Distributed Caching', 'Week 8 — Caching + CDNs', 34),
  ('33333333-3333-4333-8333-000000000035', null, '00000000-0000-0000-0000-0000000000a3', 'CDNs', 'Week 8 — Caching + CDNs', 35),
  ('33333333-3333-4333-8333-000000000036', null, '00000000-0000-0000-0000-0000000000a3', 'Cache Write Policies', 'Week 8 — Caching + CDNs', 36),
  ('33333333-3333-4333-8333-000000000037', null, '00000000-0000-0000-0000-0000000000a3', 'Cache Replacement Policies', 'Week 8 — Caching + CDNs', 37),
  ('33333333-3333-4333-8333-000000000038', null, '00000000-0000-0000-0000-0000000000a3', 'Microservices vs Monolith', 'Week 9 — Microservices + APIs + Auth', 38),
  ('33333333-3333-4333-8333-000000000039', null, '00000000-0000-0000-0000-0000000000a3', 'Migration Patterns', 'Week 9 — Microservices + APIs + Auth', 39),
  ('33333333-3333-4333-8333-000000000040', null, '00000000-0000-0000-0000-0000000000a3', 'API Designing', 'Week 9 — Microservices + APIs + Auth', 40),
  ('33333333-3333-4333-8333-000000000041', null, '00000000-0000-0000-0000-0000000000a3', 'Asynchronous APIs', 'Week 9 — Microservices + APIs + Auth', 41),
  ('33333333-3333-4333-8333-000000000042', null, '00000000-0000-0000-0000-0000000000a3', 'OAuth', 'Week 9 — Microservices + APIs + Auth', 42),
  ('33333333-3333-4333-8333-000000000043', null, '00000000-0000-0000-0000-0000000000a3', 'Token Based Auth', 'Week 9 — Microservices + APIs + Auth', 43),
  ('33333333-3333-4333-8333-000000000044', null, '00000000-0000-0000-0000-0000000000a3', 'ACLs / Rule Engines', 'Week 9 — Microservices + APIs + Auth', 44),
  ('33333333-3333-4333-8333-000000000045', null, '00000000-0000-0000-0000-0000000000a3', 'Design Instagram', 'Week 10 — Case Studies', 45),
  ('33333333-3333-4333-8333-000000000046', null, '00000000-0000-0000-0000-0000000000a3', 'Design WhatsApp', 'Week 10 — Case Studies', 46),
  ('33333333-3333-4333-8333-000000000047', null, '00000000-0000-0000-0000-0000000000a3', 'Design UPI Payments', 'Week 10 — Case Studies', 47),
  ('33333333-3333-4333-8333-000000000048', null, '00000000-0000-0000-0000-0000000000a3', 'Design Netflix', 'Week 10 — Case Studies', 48),
  ('33333333-3333-4333-8333-000000000049', null, '00000000-0000-0000-0000-0000000000a3', 'Design Uber', 'Week 10 — Case Studies', 49),
  ('33333333-3333-4333-8333-000000000050', null, '00000000-0000-0000-0000-0000000000a3', 'Design Google Docs', 'Week 10 — Case Studies', 50),
  ('33333333-3333-4333-8333-000000000051', null, '00000000-0000-0000-0000-0000000000a3', 'Design Doordash', 'Week 10 — Case Studies', 51),
  ('33333333-3333-4333-8333-000000000052', null, '00000000-0000-0000-0000-0000000000a3', 'Design Tinder', 'Week 10 — Case Studies', 52)
on conflict (id) do nothing;

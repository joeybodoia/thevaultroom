@@ .. @@
 CREATE TABLE IF NOT EXISTS users (
   id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
+  is_admin boolean NOT NULL DEFAULT false,
   username text,
   email text,
   join_date date DEFAULT CURRENT_DATE,
   created_at timestamptz DEFAULT now()
 );
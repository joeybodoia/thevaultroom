@@ .. @@
 ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 
+-- Users policies
+CREATE POLICY "Users can insert own data"
+  ON users
+  FOR INSERT
+  TO authenticated
+  WITH CHECK (auth.uid() = id);
+
 CREATE POLICY "Users can read own data"
   ON users
   FOR SELECT
   TO authenticated
   USING (auth.uid() = id);
 
+CREATE POLICY "Users can update own data"
+  ON users
+  FOR UPDATE
+  TO authenticated
+  USING (auth.uid() = id);
+
 -- Direct bids policies
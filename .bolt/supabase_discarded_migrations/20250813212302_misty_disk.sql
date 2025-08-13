@@ .. @@
 CREATE POLICY "Users can insert own data"
   ON users
   FOR INSERT
   TO authenticated
-  WITH CHECK (auth.uid() = id);
+  WITH CHECK (uid() = id);
 
 CREATE POLICY "Users can read own data"
   ON users
   FOR SELECT
   TO authenticated
-  USING (auth.uid() = id);
+  USING (uid() = id);
 
 CREATE POLICY "Users can update own data"
   ON users
   FOR UPDATE
   TO authenticated
-  USING (auth.uid() = id);
+  USING (uid() = id);
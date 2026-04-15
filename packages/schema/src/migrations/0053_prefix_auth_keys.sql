-- Prefix existing atproto_auth_session rows with the v1 client_id so they
-- remain reachable after SessionStore/StateStore become per-client namespaced
-- (see packages/auth/src/storage.ts).
--
-- Session keys are DIDs ("did:plc:..."/"did:web:...") so we filter on that
-- prefix to stay idempotent. In-flight OAuth state rows are transient and are
-- intentionally NOT migrated — any in-flight flow from before the deploy will
-- fail at callback and the user will restart it under v2.
--
-- Operator must set app.v1_client_id before running migrations:
--   SET app.v1_client_id = 'https://sill.social/client-metadata.json';
-- In local dev the setting is unset and the block is a no-op (dev OAuth
-- sessions are ephemeral and can be wiped by dropping the database).

DO $$
DECLARE
  cid text := current_setting('app.v1_client_id', true);
BEGIN
  IF cid IS NOT NULL AND cid <> '' THEN
    UPDATE atproto_auth_session
       SET key = cid || '::' || key
     WHERE key LIKE 'did:%';
  END IF;
END $$;

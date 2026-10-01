-- Clean up legacy "other" sex value and shrink enum to female/male.
-- "other" was never stored with a CHECK constraint, so a plain UPDATE is safe
-- and does not require a table rebuild. No production data here, but future
-- installs may have it.
UPDATE profiles SET sex = NULL WHERE sex = 'other';

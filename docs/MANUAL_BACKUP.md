# Manual Supabase backup

Supabase Free does not provide the same automatic backup safety net as a paid database plan. Create a private logical backup before inviting a new tester group and before applying database migrations.

## Run

1. Start Docker Desktop.
2. Confirm this repository remains linked to the intended Supabase project.
3. From the repository root, run `npm run backup:supabase`.

The script creates a timestamped directory under `C:\Users\neytn\Documents\Codex\backups\early-shout`. It exports schema, data, and roles, rejects empty files, and writes SHA-256 hashes to `manifest.json`.

## Safety

- Never commit, upload, email, or publicly share a backup.
- A logical database dump does not include Supabase Storage object files.
- Keep at least two recent copies on separate encrypted devices before a wider launch.
- A backup is not proven recoverable until a restore rehearsal succeeds in a separate disposable project.

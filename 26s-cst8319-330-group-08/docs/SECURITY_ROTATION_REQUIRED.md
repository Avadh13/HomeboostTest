# Security rotation required

A backend `.env` file was previously committed to the repository. Removing the file prevents future pulls from receiving it, but deletion does not remove values from Git history.

Complete these actions before the next production demo:

1. Rotate the Railway MySQL password and update the Railway backend variables.
2. Generate a new long random `JWT_SECRET` and update Railway.
3. Revoke or rotate any payment, email, storage, or third-party keys that were ever committed.
4. Redeploy the Railway backend after changing variables.
5. Confirm local `.env` files remain untracked with `git status`.
6. Use `.env.example` files only as templates; never store real credentials in Git.
7. Consider rewriting repository history if the repository will be shared outside the current trusted team.

Recommended verification:

```bash
git ls-files | grep -E '(^|/)\.env$'
git status --ignored
```

The first command should return no tracked `.env` files.

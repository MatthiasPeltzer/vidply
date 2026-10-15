---
applyTo: "**/*"
---

# Keep commit messages author-controlled

Keep commit messages limited to the author's intended subject and body.

Never add a `Co-authored-by: Cursor ...` trailer, including variants with a different Cursor name or email. Do not add co-author, sign-off, or other attribution trailers for Copilot, GitHub Copilot, Cursor, or any other agent or tool.

Do not add trailers when creating, amending, or rebasing commits. Add a trailer only if the author explicitly asks for it.

Apply this rule regardless of which interface or command creates the commit. A push must not be used to rewrite or add commit-message trailers.

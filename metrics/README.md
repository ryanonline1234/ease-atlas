# metrics

Monthly adoption capture, started on the first publish. One file per month,
named `YYYY-MM-DD.json`, plus a screenshot of the creator dashboard for the
same date.

Captured per component, read from the component page's server payload
(`component_metrics`: `view_count`, `code_copy_count`, `prompt_copy_count`,
`cli_download_count`) and from the public profile (bookmarks). Captured for
the repo: stars, forks, and every issue or pull request opened by an account
that is not the owner's. Every inbound contact (message, mention, adoption by
a named site) is logged in `inbound.md` with date and sender.

Reporting rule: installs, copies, and bookmarks may be reported. Views may not.

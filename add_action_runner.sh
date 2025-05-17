#!/bin/zsh
setopt NO_NOMATCH
git add ui/asoos/actions-runner/externals/node20/include/node/* 2>/dev/null || true
git add ui/asoos/actions-runner/externals/node20/share/doc/node/* 2>/dev/null || true
git add ui/asoos/actions-runner/externals/node20/share/man/man1/* 2>/dev/null || true
git add ui/asoos/actions-runner/* 2>/dev/null || true

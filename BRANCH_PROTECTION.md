# Branch Protection Setup Guide

## Overview

This guide explains how to set up branch protection rules for the `main` branch on GitHub.

## Steps

1. Go to your repository on GitHub
2. Click on **Settings** → **Branches**
3. Under **Branch protection rules**, click **Add rule**
4. In **Branch name pattern**, enter: `main`
5. Enable the following settings:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: `1`
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Select the following required status checks:
       - `install`
       - `type-check`
       - `lint`
       - `format-check`
       - `build`
       - `latex-compile`
   - ✅ **Do not allow bypassing the above settings**
   - ✅ **Restrict who can push to matching branches** (optional, for admin-only pushes)

## Result

- Direct pushes to `main` will be blocked
- All PRs must pass CI checks
- All PRs require at least one approval
- No one can bypass these rules (unless configured otherwise)

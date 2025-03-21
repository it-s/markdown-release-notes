# markdown-release-notes

## Introduction
Generate release notes in markdown from commit list between two branches.

## Usage
Usage: `generatemarkdownreleasenotes` [options] `<branchA>` `<branchB>`

Generate release notes MARKDOWN file by diffing the history of two branches

## Arguments
- `branchA`: branch name from which to start the comparison
- `branchB`: branch name to which to end the comparison

## Options
- `-V`, `--version`: output the version number
- `-h`, `--help`: display help for command

## Usage Example
To generate release notes for two branches, use:
```
generatemarkdownreleasenotes master develop
```
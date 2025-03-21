# markdown-release-notes

## Introduction
Generate release notes in markdown from commit list between two branches.

## Install
`npm i generatemarkdownreleasenotes -g`

## Usage
Simply install this script globally with `npm i -g` then `cd` to the repository where you need release notes generated and type `generatemarkdownreleasenotes branchA branchB`, where `branchA` is the previous release branch (*usually develop*) and `branchB` is the current release branch (*something like release-1.0.0*).

The script will output the markdown straight to the standard output. To output the contents into a markdown file instead simply pipe the stdout into a file: `generatemarkdownreleasenotes branchA branchB >> releasenotes.1.0.0.md`

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
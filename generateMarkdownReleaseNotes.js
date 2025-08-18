#! /usr/bin/env node
const { execSync } = require("child_process");
const path = require('path');
const semver = require("semver");
const { program } = require('commander');

const execGitCommand = (command, directory) => {
  try {
    return execSync(command, { cwd: directory }).toString().trim();
  } catch (error) {
    console.error(`Git command failed: ${command}`);
    process.exit(1);
  }
};

const parseCommitData = (commitData) => {
  const [hash, ...message] = commitData.split(" ");
  let version = "NA";
  try {
    const packageJson = execGitCommand(`git show ${hash}:package.json`);
    version = JSON.parse(packageJson)?.version;
  } catch (e) {
    // There is no package.json
  }
  return { version, message: message.join(" ") };
};

const getCommits = (fromBranch, toBranch, directory) => {
  const log = execGitCommand(
    `git log ${fromBranch}..${toBranch} --no-merges --pretty=format:"%H %s"`,
    directory
  );
  return log.split("\n").map(parseCommitData);
};

const groupCommitsByVersion = (commits) => {
  return commits.reduce((acc, { version, message }) => {
    if (!semver.valid(version)) {
      console.warn(`Invalid version ${version} for commit: ${message}`);
      return acc;
    }

    if (!acc[version]) acc[version] = [];
    acc[version].push(message);
    return acc;
  }, {});
};

const formatAsMarkdown = (commitsByVersion) => {
  return Object.entries(commitsByVersion)
    .sort(([v1], [v2]) => semver.compare(v2, v1))
    .map(
      ([version, messages]) =>
        `## Version ${version}\n${messages.map((msg) => `- ${msg}`).join("\n")}`
    )
    .join("\n\n");
};

const generateMarkdownReleaseNotes = (A, B, directory) => {
  console.log("# Release notes for:", A, "<-->", B);
  const commits = getCommits(A, B, directory);
  const commitsByVersion = groupCommitsByVersion(commits);
  return formatAsMarkdown(commitsByVersion);
};

const ERROR_MSG =
  "Missing command line arguments: generateMarkdownReleaseNotes [branch name from] [branch name to]";

program
  .name('generatemarkdownreleasenotes')
  .description('Generate release notes MARKDOWN file by diffing the history of two branches')
  .version('1.0.0')
  .argument("<branchA>", "branch name from")
  .argument("<branchB>", "branch name to")
  .showHelpAfterError(ERROR_MSG);

program.parse();

const directory = process.cwd();
const branchA = program.args[0];
const branchB = program.args[1];
console.assert(Boolean(directory) && Boolean(branchA) && Boolean(branchB), ERROR_MSG);
if (branchA && branchB)
  console.log(generateMarkdownReleaseNotes(branchA, branchB, path.resolve(directory)));

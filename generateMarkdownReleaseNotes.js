const { execSync } = require("child_process");
const path = require('path');
const semver = require("semver");

const execGitCommand = (command, directory) => {
  try {
    return execSync(command, { cwd: directory }).toString().trim();
  } catch (error) {
    console.error(`Git command failed: ${command}`, error);
    process.exit(1);
  }
};

const parseCommitData = (commitData) => {
  const [hash, ...message] = commitData.split(" ");
  const packageJson = execGitCommand(`git show ${hash}:package.json`);
  const { version } = JSON.parse(packageJson);
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
  console.log("Working in", directory);
  console.log("Generating log notes for:", A, "<-->", B);
  const commits = getCommits(A, B, directory);
  const commitsByVersion = groupCommitsByVersion(commits);
  return formatAsMarkdown(commitsByVersion);
};

const directory = process.argv[2];
const branchA = process.argv[3];
const branchB = process.argv[4];
const ERROR_MSG =
  "Missing command line arguments: node generateMarkdownReleaseNotes.js [git project dir] [branch name from] [branch name to]";
console.assert(Boolean(directory) && Boolean(branchA) && Boolean(branchB), ERROR_MSG);
if (directory && branchA && branchB)
  console.log(generateMarkdownReleaseNotes(branchA, branchB, path.resolve(directory)));

#! /usr/bin/env node
const { execSync } = require("child_process");
const path = require('path');
const fs = require('fs');
const semver = require("semver");
const { program } = require('commander');
const yaml = require('js-yaml'); // ← Add js-yaml for parsing pubspec.yaml

/**
 * Reads and parses a JSON file.
 * @param {string} filePath
 * @returns {object|null}
 */
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (_) {
    return null;
  }
}

/**
 * Reads and parses a YAML file.
 * @param {string} filePath
 * @returns {object|null}
 */
function readYAML(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (_) {
    return null;
  }
}

/**
 * Attempts to discover the project metadata (name & version).
 * First checks for package.json, then pubspec.yaml.
 * @returns {{name: string, version: string}|null}
 */
function discoverProjectMetadata() {
  // 1️⃣ Node.js project
  const packageJson = readJSON(path.resolve('package.json'));
  if (packageJson && packageJson.name && packageJson.version) {
    return { name: packageJson.name, version: packageJson.version };
  }

  // 2️⃣ Flutter project
  const pubspec = readYAML(path.resolve('pubspec.yaml'));
  if (pubspec && pubspec.name && pubspec.version) {
    return { name: pubspec.name, version: pubspec.version };
  }

  // No recognizable metadata found
  return null;
}

/**
 * Extracts JIRA ticket numbers from text using regex.
 * Matches patterns like PROJECT-123, ABC-456, etc.
 * @param {string} text - Text to search for JIRA tickets
 * @returns {string[]} Array of unique JIRA ticket numbers found
 */
function extractJiraTickets(text) {
  if (!text) return [];

  // JIRA ticket pattern: uppercase letters followed by hyphen and numbers
  const jiraPattern = /[A-Z]+-\d+/g;
  const matches = text.match(jiraPattern);

  // Return unique tickets only
  return matches ? [...new Set(matches)] : [];
}

const execGitCommand = (command, directory) => {
  try {
    return execSync(command, { cwd: directory }).toString().trim();
  } catch (error) {
    console.error(`Git command failed: ${command}`);
    process.exit(1);
  }
};

/**
 * Gets the branch name for a specific commit.
 * @param {string} commitHash - The commit hash
 * @param {string} directory - The repository directory
 * @returns {string|null} The branch name or null if not found
 */
const getBranchNameForCommit = (commitHash, directory) => {
  try {
    // Get the branch name for the commit
    return execGitCommand(
      `git name-rev --name-only ${commitHash}`,
      directory
    );
  } catch (error) {
    return null;
  }
};

const parseCommitData = (commitData) => {
  const [hash, ...message] = commitData.split(" ");
  let version = "NA";
  try {
    const projectMetadata = discoverProjectMetadata();
    version = projectMetadata ? projectMetadata.version : "NA";
  } catch (e) {
    console.error("There is no package.json or pubspec.yaml");
  }

  // Extract JIRA tickets from commit message
  const jiraTicketsFromMessage = extractJiraTickets(message.join(" "));

  // Extract JIRA tickets from branch name
  const branchName = getBranchNameForCommit(hash, process.cwd());
  const jiraTicketsFromBranch = branchName ? extractJiraTickets(branchName) : [];

  // Combine all JIRA tickets and remove duplicates
  const allJiraTickets = [...new Set([...jiraTicketsFromMessage, ...jiraTicketsFromBranch])];

  return {
    version,
    message: message.join(" "),
    jiraTickets: allJiraTickets,
    hash
  };
};

const getCommits = (fromBranch, toBranch, directory) => {
  const log = execGitCommand(
    `git log ${fromBranch}..${toBranch} --no-merges --pretty=format:"%H %s"`,
    directory
  );
  return log.split("\n").map(parseCommitData);
};

const groupCommitsByVersion = (commits) => {
  return commits.reduce((acc, { version, message, jiraTickets, hash }) => {
    if (!semver.valid(version)) {
      console.warn(`Invalid version ${version} for commit: ${message}`);
      return acc;
    }

    if (!acc[version]) acc[version] = [];
    acc[version].push({ message, jiraTickets, hash });
    return acc;
  }, {});
};

const formatAsMarkdown = (commitsByVersion) => {
  return Object.entries(commitsByVersion)
    .sort(([v1], [v2]) => semver.compare(v2, v1))
    .map(
      ([version, commits]) =>
        `## Version ${version}\n${commits.map(commit => {
          // Format commit with JIRA tickets if available
          const jiraInfo = commit.jiraTickets && commit.jiraTickets.length > 0 
            ? ` [${commit.jiraTickets.join(", ")}]` 
            : '';
          return `- ${commit.message}${jiraInfo}`;
        }).join("\n")}`
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

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
const packageVersion = packageJson.version;

program
  .name('generatemarkdownreleasenotes')
  .description('Generate release notes MARKDOWN file by diffing the history of two branches')
  .version(packageVersion)
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

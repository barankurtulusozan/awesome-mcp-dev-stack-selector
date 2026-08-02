const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema', 'app.schema.json');
const APPS_DIR = path.join(__dirname, '..', 'apps');

const SAFE_COMMAND_PATTERNS = {
  macOS: /^(brew install [a-zA-Z0-9\/\._-]+|brew install --cask [a-zA-Z0-9\._-]+|docker run [a-zA-Z0-9\._\/\ -:]+)$/,
  Windows: /^(winget install [A-Za-z0-9\._-]+|docker run [a-zA-Z0-9\._\/\ -:]+)$/,
  Linux: /^(snap install [a-zA-Z0-9\._\ --]+|apt install -y [a-z0-9-]+|apt-get install [a-z0-9-]+|dnf install -y [a-z0-9-]+|curl -[a-zA-Z]+ https:\/\/[a-zA-Z0-9\.\/_-]+ \| sh( -)?|docker run [a-zA-Z0-9\._\/\ -:]+|npm install -g [a-z0-9-]+)$/
};

const FORBIDDEN_OPERATORS = ['&&', ';', '||', '`', '$('];

function validate() {
  console.log('🔍 Starting app validation audit...');

  const schemaContent = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(schemaContent);

  const files = globSync('**/*.json', { cwd: APPS_DIR, absolute: true });
  console.log(`📂 Found ${files.length} app entries.`);

  const seenIds = new Set();
  const seenRepos = new Set();
  let errorCount = 0;

  for (const filePath of files) {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // 1. Schema Validation
      const valid = validateSchema(data);
      if (!valid) {
        console.error(`❌ [${relativePath}] Schema Validation Error:`);
        validateSchema.errors.forEach(err => console.error(`   - ${err.instancePath} ${err.message}`));
        errorCount++;
        continue;
      }

      // 2. Uniqueness Checks
      if (seenIds.has(data.id)) {
        console.error(`❌ [${relativePath}] Duplicate app ID: "${data.id}"`);
        errorCount++;
      }
      seenIds.add(data.id);

      if (data.repository) {
        if (seenRepos.has(data.repository)) {
          console.error(`❌ [${relativePath}] Duplicate repository URL: "${data.repository}"`);
          errorCount++;
        }
        seenRepos.add(data.repository);
      }

      // 3. Installation Command Safety Audit
      if (data.installation) {
        for (const [platform, cmd] of Object.entries(data.installation)) {
          // Check forbidden shell operators
          for (const op of FORBIDDEN_OPERATORS) {
            if (cmd.includes(op)) {
              console.error(`❌ [${relativePath}] Security Risk: Platform "${platform}" command contains forbidden operator "${op}": "${cmd}"`);
              errorCount++;
            }
          }

          // Check regex pattern
          const pattern = SAFE_COMMAND_PATTERNS[platform];
          if (pattern && !pattern.test(cmd)) {
            console.error(`❌ [${relativePath}] Security Violation: Platform "${platform}" command does not match safe pattern: "${cmd}"`);
            errorCount++;
          }
        }
      }

    } catch (e) {
      console.error(`❌ [${relativePath}] Failed to parse JSON: ${e.message}`);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    console.error(`\n💥 Validation failed with ${errorCount} errors.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${files.length} app entries passed validation successfully!`);
  }
}

validate();

TITLE: Publishing Python Packages to PyPI using OIDC in GitHub Actions
DESCRIPTION: This GitHub Actions workflow demonstrates how to use OpenID Connect (OIDC) for trusted publishing to PyPI. It utilizes the `pypa/gh-action-pypi-publish` action, enabling token-less authentication by setting `id-token: write` permissions and omitting explicit credentials. The workflow builds release distributions, uploads them as an artifact, and then publishes them to PyPI.
SOURCE: https://github.com/github/docs/blob/main/content/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-pypi.md#_snippet_0

LANGUAGE: YAML
CODE:

```
jobs:
  release-build:
    runs-on: ubuntu-latest

    steps:
      - uses: {% data reusables.actions.action-checkout %}

      - uses: {% data reusables.actions.action-setup-python %}
        with:
          python-version: "3.x"

      - name: build release distributions
        run: |
          # NOTE: put your own distribution build steps here.
          python -m pip install build
          python -m build

      - name: upload windows dists
        uses: {% data reusables.actions.action-upload-artifact %}
        with:
          name: release-dists
          path: dist/

  pypi-publish:
    runs-on: ubuntu-latest
    needs:
      - release-build
    permissions:
      id-token: write

    steps:
      - name: Retrieve release distributions
        uses: {% data reusables.actions.action-download-artifact %}
        with:
          name: release-dists
          path: dist/

      - name: Publish release distributions to PyPI
        uses: pypa/gh-action-pypi-publish@3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f
```

---

TITLE: Refactored Python Data Access with Repository Pattern
DESCRIPTION: This refactored Python code demonstrates a more scalable and maintainable data access layer using a repository pattern. It employs a context manager for database connections, parameterized queries to prevent SQL injection, and separates concerns into Database and UserRepository classes for modularity and reusability.
SOURCE: https://github.com/github/docs/blob/main/content/copilot/copilot-chat-cookbook/refactoring-code/refactoring-data-access-layers.md#_snippet_1

LANGUAGE: Python
CODE:

```
# database.py
import sqlite3

class Database:
    def __init__(self, db_path):
        self.db_path = db_path

    def __enter__(self):
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type or exc_val or exc_tb:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.conn.close()

# user_repository.py
class UserRepository:
    def __init__(self, db):
        self.db = db

    def get_user_by_id(self, user_id):
        try:
            self.db.cursor.execute("SELECT display_name FROM users WHERE id = ?", (user_id,))
            user = self.db.cursor.fetchone()
            return user
        except sqlite3.Error as e:
            print(f"An error occurred: {e}")
            return None

# main.py
from database import Database
from user_repository import UserRepository

def get_user_by_id(user_id):
    with Database('database.db') as db:
        user_repo = UserRepository(db)
        return user_repo.get_user_by_id(user_id)
```

---

TITLE: GitHub Actions: github Context Object Reference
DESCRIPTION: Provides a comprehensive reference for the 'github' context object in GitHub Actions, listing all available properties, their data types, and detailed descriptions of their purpose and usage within a workflow run.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
github: object
  description: The top-level context available during any job or step in a workflow. This object contains all the properties listed below.
  properties:
    action: string
      description: The name of the action currently running, or the `id` of a step. GitHub removes special characters, and uses the name `__run` when the current step runs a script without an `id`. If you use the same action more than once in the same job, the name will include a suffix with the sequence number with underscore before it. For example, the first script you run will have the name `__run`, and the second script will be named `__run_2`. Similarly, the second invocation of `actions/checkout` will be `actionscheckout2`.
    action_path: string
      description: The path where an action is located. This property is only supported in composite actions. You can use this path to access files located in the same repository as the action, for example by changing directories to the path: `cd ${{ github.action_path }}`.
    action_ref: string
      description: For a step executing an action, this is the ref of the action being executed. For example, `v2`.
    action_repository: string
      description: For a step executing an action, this is the owner and repository name of the action. For example, `actions/checkout`.
    action_status: string
      description: For a composite action, the current result of the composite action.
    actor: string
      description: The username of the user that triggered the initial workflow run. If the workflow run is a re-run, this value may differ from `github.triggering_actor`. Any workflow re-runs will use the privileges of `github.actor`, even if the actor initiating the re-run (`github.triggering_actor`) has different privileges.
    actor_id: string
      description: The ID of the actor that triggered the workflow run.
    api_url: string
      description: The URL of the GitHub REST API.
    base_ref: string
      description: The `base_ref` or target branch of the pull request in a workflow run. This property is only available when the event that triggers a workflow run is either `pull_request` or `pull_request_target`.
    env: string
      description: Path on the runner to the file that sets environment variables from workflow commands. This file is unique to the current step and is a different file for each step in a job. For more information, see the relevant documentation.
    event: object
      description: The full event webhook payload. You can access individual properties of the event using this context. This object is identical to the webhook payload of the event that triggered the workflow run, and is different for each event. The webhooks for each GitHub Actions event is linked in the relevant documentation. For example, for a workflow run triggered by the `push` event, this object contains the contents of the push webhook payload.
    event_name: string
      description: The name of the event that triggered the workflow run.
    event_path: string
      description: The path to the file on the runner that contains the full event webhook payload.
    graphql_url: string
      description: The URL of the GitHub GraphQL API.
    head_ref: string
      description: The `head_ref` or source branch of the pull request in a workflow run. This property is only available when the event that triggers a workflow run is either `pull_request` or `pull_request_target`.
    job: string
      description: The `job_id` of the current job. Note: This context property is set by the Actions runner, and is only available within the execution `steps` of a job. Otherwise, the value of this property will be `null`.
```

---

TITLE: GitHub Actions Workflow: Authenticate with GitHub App Token
DESCRIPTION: This YAML workflow illustrates how to authenticate with the GitHub API using a GitHub App. It leverages the `actions/create-github-app-token@v1` action to generate a short-lived installation access token using the App ID and private key, then passes this token as an environment variable to a subsequent script for API interaction.
SOURCE: https://github.com/github/docs/blob/main/content/rest/quickstart.md#_snippet_7

LANGUAGE: YAML
CODE:

```
on:
  workflow_dispatch:
jobs:
  use_api_via_script:
    runs-on: ubuntu-latest
    steps:
      - name: Check out repo content
        uses: {% data reusables.actions.action-checkout %}

      - name: Setup Node
        uses: {% data reusables.actions.action-setup-node %}
        with:
          node-version: '16.17.0'
          cache: npm

      - name: Install dependencies
        run: npm install octokit

      - name: Generate token
        id: generate-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: {% raw %}${{ vars.APP_ID }}{% endraw %}
          private-key: {% raw %}${{ secrets.APP_PEM }}{% endraw %}

      - name: Run script
        run: |
          node .github/actions-scripts/use-the-api.mjs
        env:
          TOKEN: {% raw %}${{ steps.generate-token.outputs.token }}{% endraw %}
```

---

TITLE: Set Workflow-Level GITHUB_TOKEN Read Permissions in YAML
DESCRIPTION: This YAML configuration snippet illustrates how to define `read-all` permissions for the `GITHUB_TOKEN` at the workflow level in GitHub Actions. These permissions will be inherited by all jobs in the workflow.
SOURCE: https://github.com/github/docs/blob/main/data/reusables/actions/jobs/setting-permissions-all-jobs-example.md#_snippet_0

LANGUAGE: yaml
CODE:

```
name: "My workflow"

on: [ push ]

permissions: read-all

jobs:
  ...
```

---

TITLE: Web Application Flow for OAuth Apps
DESCRIPTION: Describes the three-step process for authorizing users in standard web-based OAuth applications, covering user redirection for identity request, redirection back to the app, and subsequent API access using the obtained access token.
SOURCE: https://github.com/github/docs/blob/main/content/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps.md#_snippet_0

LANGUAGE: APIDOC
CODE:

```
The web application flow to authorize users for your app is:

1. Users are redirected to request their GitHub identity
2. Users are redirected back to your site by GitHub
3. Your app accesses the API with the user's access token
```

---

TITLE: GitHub Actions Expression Syntax
DESCRIPTION: This snippet shows the basic syntax for embedding expressions within GitHub Actions workflows, typically used for evaluating values or conditions. Expressions are enclosed in `${{ ... }}`.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions.md#_snippet_0

LANGUAGE: YAML
CODE:

```
${{ <expression> }}
```

---

TITLE: Define Project-Specific Guidelines for GitHub Copilot
DESCRIPTION: This snippet illustrates how to set up a `.github/copilot-instructions.md` file to provide contextual guidelines to GitHub Copilot. These instructions ensure that Copilot's generated content adheres to the team's specific preferences, such as using Bazel for Java dependencies, enforcing JavaScript code style (double quotes and tabs), and acknowledging the use of Jira for task tracking.
SOURCE: https://github.com/github/docs/blob/main/data/reusables/copilot/repository-custom-instructions-example.md#_snippet_0

LANGUAGE: Markdown
CODE:

```
We use Bazel for managing our Java dependencies, not Maven, so when talking about Java packages, always give me instructions and code samples that use Bazel.

We always write JavaScript with double quotes and tabs for indentation, so when your responses include JavaScript code, please follow those conventions.

Our team uses Jira for tracking items of work.
```

---

TITLE: Using actions/checkout@v4 in GitHub Actions Workflow
DESCRIPTION: The `actions/checkout` action is a fundamental step in most GitHub Actions workflows, enabling the runner to access the repository's code. Version `v4` is the latest major release, providing enhanced performance and security features. It should typically be the first step in a job that requires repository files.
SOURCE: https://github.com/github/docs/blob/main/data/reusables/actions/action-checkout.md#_snippet_0

LANGUAGE: YAML
CODE:

```
actions/checkout@v4
```

---

TITLE: Call Reusable Workflow and Consume Its Outputs
DESCRIPTION: This YAML snippet demonstrates how a caller workflow can invoke a reusable workflow and access its defined outputs. It shows `job1` using the `uses` keyword to call the reusable workflow, and `job2` depending on `job1` to print the outputs (`firstword`, `secondword`) from the reusable workflow to the workflow log.
SOURCE: https://github.com/github/docs/blob/main/content/actions/sharing-automations/reusing-workflows.md#_snippet_11

LANGUAGE: yaml
CODE:

```
name: Call a reusable workflow and use its outputs

on:
  workflow_dispatch:

jobs:
  job1:
    uses: octo-org/example-repo/.github/workflows/called-workflow.yml@v1

  job2:
    runs-on: ubuntu-latest
    needs: job1
    steps:
      - run: echo ${{ needs.job1.outputs.firstword }} ${{ needs.job1.outputs.secondword }}
```

---

TITLE: GitHub Actions CI Workflow with Path Filtering and Node.js Build
DESCRIPTION: This workflow demonstrates a continuous integration setup for a Node.js project. It uses path filtering to trigger only when changes occur in the 'scripts' directory and requires a successful 'build' job. The workflow builds and tests the application across multiple Node.js versions.
SOURCE: https://github.com/github/docs/blob/main/content/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks.md#_snippet_1

LANGUAGE: yaml
CODE:

```
name: ci
on:
  pull_request:
    paths:
      - 'scripts/**'
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [12.x, 14.x, 16.x]
    steps:
    - uses: {% data reusables.actions.action-checkout %}
    - name: Use Node.js {% raw %}${{ matrix.node-version }}{% endraw %}
      uses: {% data reusables.actions.action-setup-node %}
      with:
        node-version: {% raw %}${{ matrix.node-version }}{% endraw %}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test
```

---

TITLE: Kubernetes PodSpec for GitHub Actions Runner with DIND
DESCRIPTION: This YAML defines a Kubernetes Pod specification (`PodSpec`) for a GitHub Actions self-hosted runner. It includes `initContainers` to prepare the Docker-in-Docker (DIND) environment and configure user/group IDs, along with main `containers` for the runner application and the DIND daemon. Necessary `volumeMounts` and `securityContext` settings are provided to ensure proper operation and isolation.
SOURCE: https://github.com/github/docs/blob/main/content/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/deploying-runner-scale-sets-with-actions-runner-controller.md#_snippet_25

LANGUAGE: yaml
CODE:

```
template:
  spec:
    initContainers:
    - name: init-dind-externals
      image: ghcr.io/actions/actions-runner:latest
      command: ["cp", "-r", "/home/runner/externals/.", "/home/runner/tmpDir/"]
      volumeMounts:
        - name: dind-externals
          mountPath: /home/runner/tmpDir
    - name: init-dind-rootless
      image: docker:dind-rootless
      command:
        - sh
        - -c
        - |
          set -x
          cp -a /etc/. /dind-etc/
          echo 'runner:x:1001:1001:runner:/home/runner:/bin/ash' >> /dind-etc/passwd
          echo 'runner:x:1001:' >> /dind-etc/group
          echo 'runner:100000:65536' >> /dind-etc/subgid
          echo 'runner:100000:65536' >> /dind-etc/subuid
          chmod 755 /dind-etc;
          chmod u=rwx,g=rx+s,o=rx /dind-home
          chown 1001:1001 /dind-home
      securityContext:
        runAsUser: 0
      volumeMounts:
        - mountPath: /dind-etc
          name: dind-etc
        - mountPath: /dind-home
          name: dind-home
    containers:
    - name: runner
      image: ghcr.io/actions/actions-runner:latest
      command: ["/home/runner/run.sh"]
      env:
        - name: DOCKER_HOST
          value: unix:///run/user/1001/docker.sock
      securityContext:
        privileged: true
        runAsUser: 1001
        runAsGroup: 1001
      volumeMounts:
        - name: work
          mountPath: /home/runner/_work
        - name: dind-sock
          mountPath: /run/user/1001
    - name: dind
      image: docker:dind-rootless
      args:
        - dockerd
        - --host=unix:///run/user/1001/docker.sock
      securityContext:
        privileged: true
        runAsUser: 1001
        runAsGroup: 1001
      volumeMounts:
        - name: work
          mountPath: /home/runner/_work
        - name: dind-sock
          mountPath: /run/user/1001
        - name: dind-externals
          mountPath: /home/runner/externals
        - name: dind-etc
          mountPath: /etc
        - name: dind-home
          mountPath: /home/runner
    volumes:
    - name: work
      emptyDir: {}
    - name: dind-externals
      emptyDir: {}
    - name: dind-sock
      emptyDir: {}
    - name: dind-etc
      emptyDir: {}
    - name: dind-home
      emptyDir: {}
```

---

TITLE: Refactoring Large Java Methods by Extraction
DESCRIPTION: This Java method `processOrder` handles multiple responsibilities including validation, price calculation, status update, and summary printing. Its length and multiple tasks make it hard to understand, maintain, and test in isolation. The refactored code breaks down the original method into smaller, more focused private methods, improving modularity and testability.
SOURCE: https://github.com/github/docs/blob/main/content/copilot/copilot-chat-cookbook/refactoring-code/improving-code-readability-and-maintainability.md#_snippet_3

LANGUAGE: java
CODE:

```
public void processOrder(Order order) {
  if (order == null || order.getItems().isEmpty()) {
    throw new IllegalArgumentException("Order is invalid.");
  }

  double totalPrice = 0.0;
  for (Item item : order.getItems()) {
    totalPrice += item.getPrice() * item.getQuantity();
  }
  order.setTotalPrice(totalPrice);

  if (totalPrice > 0) {
    order.setStatus("Processed");
  } else {
    order.setStatus("Pending");
  }

  System.out.println("Order for customer " + order.getCustomerName() + " has been processed. Total price: " + totalPrice);
}
```

LANGUAGE: java
CODE:

```
public void processOrder(Order order) {
    validateOrder(order);
    double totalPrice = calculateTotalPrice(order);
    updateOrderStatus(order, totalPrice);
    printOrderSummary(order, totalPrice);
}

private void validateOrder(Order order) {
    if (order == null || order.getItems().isEmpty()) {
        throw new IllegalArgumentException("Order is invalid.");
    }
}

private double calculateTotalPrice(Order order) {
    double totalPrice = 0.0;
    for (Item item : order.getItems()) {
        totalPrice += item.getPrice() * item.getQuantity();
    }
    order.setTotalPrice(totalPrice);
    return totalPrice;
}

private void updateOrderStatus(Order order, double totalPrice) {
    if (totalPrice > 0) {
        order.setStatus("Processed");
    } else {
        order.setStatus("Pending");
    }
}

private void printOrderSummary(Order order, double totalPrice) {
    System.out.println("Order for customer " + order.getCustomerName() + " has been processed. Total price: " + totalPrice);
}
```

---

TITLE: API Documentation for `secrets` context
DESCRIPTION: The `secrets` context provides access to sensitive information available to a workflow run, including `GITHUB_TOKEN` and user-defined secrets. It is not available for composite actions directly. This section details its properties and types.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs.md#_snippet_27

LANGUAGE: APIDOC
CODE:

```
secrets:
  Type: object
  Description: This context is the same for each job in a workflow run. You can access this context from any step in a job. This object contains all the properties listed below.
secrets.GITHUB_TOKEN:
  Type: string
  Description: Automatically created token for each workflow run. For more information, see [AUTOTITLE](/actions/security-guides/automatic-token-authentication).
secrets.<secret_name>:
  Type: string
  Description: The value of a specific secret.
```

---

TITLE: GitHub Actions Workflow for ESLint Analysis and SARIF Upload
DESCRIPTION: This GitHub Actions workflow automates ESLint static analysis. It's triggered on every push to the repository and weekly on Wednesdays at 15:45 UTC. The workflow checks out the code, installs npm dependencies, runs ESLint to generate a `results.sarif` file, and then uploads this SARIF file to GitHub using the `upload-sarif` action for code scanning. Required permissions include `security-events: write`, `actions: read`, and `contents: read`.
SOURCE: https://github.com/github/docs/blob/main/content/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github.md#_snippet_2

LANGUAGE: YAML
CODE:

```
name: "ESLint analysis"

# Run workflow each time code is pushed to your repository and on a schedule.
# The scheduled workflow runs every Wednesday at 15:45 UTC.
on:
  push:
  schedule:
    - cron: '45 15 * * 3'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      # required for all workflows
      security-events: write
      # only required for workflows in private repositories
      actions: read
      contents: read
    steps:
      - uses: {% data reusables.actions.action-checkout %}
      - name: Run npm install
        run: npm install
      # Runs the ESlint code analysis
      - name: Run ESLint
        # eslint exits 1 if it finds anything to report
        run: node_modules/.bin/eslint build docs lib script spec-main -f node_modules/@microsoft/eslint-formatter-sarif/sarif.js -o results.sarif || true
      # Uploads results.sarif to GitHub repository using the upload-sarif action
      - uses: {% data reusables.actions.action-codeql-action-upload-sarif %}
        with:
          # Path to SARIF file relative to the root of the repository
          sarif_file: results.sarif
```

---

TITLE: Job-Level Properties (`jobs.<job_id>`) Reference
DESCRIPTION: Defines the properties for a specific job within the workflow. Each job must have a unique `job_id` and can configure its name, permissions, dependencies, conditional execution, runner environment, concurrency, and outputs.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/workflow-syntax-for-github-actions.md#_snippet_17

LANGUAGE: APIDOC
CODE:

```
`jobs.<job_id>`: (object) - Configuration for a specific job.
  `name`: (string) - The name of the job, displayed in the GitHub UI.
  `permissions`: (object) - Defines the GITHUB_TOKEN permissions for the job.
  `needs`: (array of strings) - A job's dependencies. Specifies jobs that must complete successfully before this job starts.
  `if`: (string) - A conditional expression that controls job execution.
  `runs-on`: (string | array of strings) - The type of runner the job will run on (e.g., `ubuntu-latest`, `self-hosted`, or a runner group).
  `environment`: (string | object) - The environment that the job references.
  `concurrency`: (string | object) - Controls the concurrency of the job.
  `outputs`: (map) - Defines outputs for the job that can be consumed by dependent jobs.
```

---

TITLE: Pulling Docker Container Image by Name
DESCRIPTION: This example shows the basic command to pull a Docker container image using only its name, retrieving the latest available version by default.
SOURCE: https://github.com/github/docs/blob/main/content/packages/working-with-a-github-packages-registry/working-with-the-container-registry.md#_snippet_2

LANGUAGE: shell
CODE:

```
docker pull {% data reusables.package_registry.container-registry-hostname %}/NAMESPACE/IMAGE_NAME
```

---

TITLE: Add Remote GitHub Repository URL to Local Git
DESCRIPTION: This command adds a new remote named 'origin' to your local Git repository, linking it to the specified GitHub repository URL. This is the first step to connect your local project to a remote GitHub repository.
SOURCE: https://github.com/github/docs/blob/main/content/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github.md#_snippet_6

LANGUAGE: shell
CODE:

```
git remote add origin REMOTE-URL
```

---

TITLE: Resolve Git non-fast-forward error using fetch and merge
DESCRIPTION: Shows how to resolve a non-fast-forward error by first fetching remote changes and then merging them into the local branch before attempting to push again.
SOURCE: https://github.com/github/docs/blob/main/content/get-started/using-git/dealing-with-non-fast-forward-errors.md#_snippet_1

LANGUAGE: shell
CODE:

```
$ git fetch origin
# Fetches updates made to an online repository
$ git merge origin YOUR_BRANCH_NAME
# Merges updates made online with your local work
```

---

TITLE: Push Local Git Repository Changes to GitHub
DESCRIPTION: This command pushes your local branch's commits to the remote 'origin' repository on GitHub. The `-u` flag is used on macOS for the initial push to set the upstream tracking branch, while it's typically omitted for Windows and Linux after the initial push.
SOURCE: https://github.com/github/docs/blob/main/content/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github.md#_snippet_8

LANGUAGE: shell
CODE:

```
git push -u origin main
```

LANGUAGE: shell
CODE:

```
git push origin main
```

---

TITLE: Authenticating with GitHub App in GitHub Actions (YAML)
DESCRIPTION: This workflow demonstrates how to authenticate with a GitHub App within a GitHub Actions workflow. It uses the `actions/create-github-app-token` action to generate an installation access token using the app ID and private key stored as variables and secrets. The generated token is then used to make an authenticated API request via the GitHub CLI (`gh api octocat`). Requires the app ID as a configuration variable (`vars.APP_ID`) and the private key as a secret (`secrets.APP_PRIVATE_KEY`).
SOURCE: https://github.com/github/docs/blob/main/content/apps/creating-github-apps/authenticating-with-a-github-app/making-authenticated-api-requests-with-a-github-app-in-a-github-actions-workflow.md#_snippet_0

LANGUAGE: yaml
CODE:

```
on:
  workflow_dispatch:
jobs:
  demo_app_authentication:
    runs-on: ubuntu-latest
    steps:
      - name: Generate a token
        id: generate-token
        uses: actions/create-github-app-token@v2
        with:
          app-id: {% raw %}${{ vars.APP_ID }}{% endraw %}
          private-key: {% raw %}${{ secrets.APP_PRIVATE_KEY }}{% endraw %}

      - name: Use the token
        env:
          GH_TOKEN: {% raw %}${{ steps.generate-token.outputs.token }}{% endraw %}
        run: |
          gh api octocat
```

---

TITLE: Filter GitHub Actions Workflow by Environment for OIDC Subject
DESCRIPTION: This snippet demonstrates the syntax for configuring an OIDC subject claim to filter GitHub Actions workflow runs based on a specific deployment environment. It ensures the workflow originated from a job referencing the specified environment in a given repository and organization.
SOURCE: https://github.com/github/docs/blob/main/content/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect.md#_snippet_7

LANGUAGE: APIDOC
CODE:

```
Syntax: repo:ORG-NAME/REPO-NAME:environment:ENVIRONMENT-NAME
Example: repo:octo-org/octo-repo:environment:Production
```

---

TITLE: Clone a Git Repository from GitHub
DESCRIPTION: This snippet demonstrates how to clone a remote Git repository to your local machine using the `git clone` command. It requires a repository URL and will create a local copy, showing progress messages during the cloning process.
SOURCE: https://github.com/github/docs/blob/main/data/reusables/command_line/local-clone-created.md#_snippet_0

LANGUAGE: shell
CODE:

```
$ git clone https://{% data variables.product.product_url %}/YOUR-USERNAME/YOUR-REPOSITORY
> Cloning into `Spoon-Knife`...
> remote: Counting objects: 10, done.
> remote: Compressing objects: 100% (8/8), done.
> remove: Total 10 (delta 1), reused 10 (delta 1)
> Unpacking objects: 100% (10/10), done.
```

---

TITLE: Generate a new Ed25519 SSH key for GitHub authentication
DESCRIPTION: This command generates a new SSH key pair using the Ed25519 algorithm, which is recommended for its security and performance. Replace 'your_email@example.com' with your GitHub registered email address. The email serves as a label for the key.
SOURCE: https://github.com/github/docs/blob/main/content/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent.md#_snippet_0

LANGUAGE: shell
CODE:

```
ssh-keygen -t ed25519 -C "your_email@example.com"
```

---

TITLE: Share Data Between GitHub Actions Jobs Using Artifacts
DESCRIPTION: This YAML workflow demonstrates how to pass data between dependent jobs (`job_1`, `job_2`, `job_3`) using `actions/upload-artifact` and `actions/download-artifact`. Job 1 performs a calculation and uploads the result. Job 2 downloads, processes, and re-uploads the updated result. Job 3 downloads and prints the final result, illustrating sequential data flow and artifact management across different runners and operating systems.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow.md#_snippet_5

LANGUAGE: yaml
CODE:

```
name: Share data between jobs

on: [push]

jobs:
  job_1:
    name: Add 3 and 7
    runs-on: ubuntu-latest
    steps:
      - shell: bash
        run: |
          expr 3 + 7 > math-homework.txt
      - name: Upload math result for job 1
        uses: actions/upload-artifact@v3
        with:
          name: homework_pre
          path: math-homework.txt

  job_2:
    name: Multiply by 9
    needs: job_1
    runs-on: windows-latest
    steps:
      - name: Download math result for job 1
        uses: actions/download-artifact@v3
        with:
          name: homework_pre
      - shell: bash
        run: |
          value=`cat math-homework.txt`
          expr $value \* 9 > math-homework.txt
      - name: Upload math result for job 2
        uses: actions/upload-artifact@v3
        with:
          name: homework_final
          path: math-homework.txt

  job_3:
    name: Display results
    needs: job_2
    runs-on: macOS-latest
    steps:
      - name: Download math result for job 2
        uses: actions/download-artifact@v3
        with:
          name: homework_final
      - name: Print the final result
        shell: bash
        run: |
          value=`cat math-homework.txt`
          echo The result is $value
```

---

TITLE: Call GitHub REST API in GitHub Actions Workflow with GitHub CLI
DESCRIPTION: Illustrates how to use `gh api` within a GitHub Actions workflow to interact with the GitHub REST API. The example authenticates using the built-in `GITHUB_TOKEN` environment variable and lists repository issues. Users should replace placeholders for hostname, repository owner, and repository name if applicable.
SOURCE: https://github.com/github/docs/blob/main/content/rest/quickstart.md#_snippet_1

LANGUAGE: yaml
CODE:

```
on:
  workflow_dispatch:
jobs:
  use_api:
    runs-on: ubuntu-latest
    permissions:
      issues: read
    steps:
      - env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh api {% data variables.product.rest_url %}{% data variables.rest.example_request_url %}
```

---

TITLE: Contribute to an Existing Git Repository on GitHub
DESCRIPTION: Demonstrates the workflow for cloning an existing remote repository from GitHub, creating a new local branch, making changes, staging, committing, and pushing those changes back to GitHub.
SOURCE: https://github.com/github/docs/blob/main/content/get-started/using-git/about-git.md#_snippet_1

LANGUAGE: bash
CODE:

```
# download a repository on {% data variables.product.github %} to our machine
# Replace `owner/repo` with the owner and name of the repository to clone
git clone https://github.com/owner/repo.git

# change into the `repo` directory
cd repo

# create a new branch to store any new changes
git branch my-branch

# switch to that branch (line of development)
git checkout my-branch

# make changes, for example, edit `file1.md` and `file2.md` using the text editor

# stage the changed files
git add file1.md file2.md

# take a snapshot of the staging area (anything that's been added)
git commit -m "my snapshot"

# push changes to github
git push --set-upstream origin my-branch
```

---

TITLE: Authenticate GitHub App using JWT in Ruby
DESCRIPTION: Instantiates an Octokit client authenticated as a GitHub App. This involves constructing a JSON Web Token (JWT) with `iat`, `exp`, and `iss` claims, signing it with the app's private key, and then using this JWT as a bearer token for the Octokit client. The JWT is valid for a maximum of 10 minutes.
SOURCE: https://github.com/github/docs/blob/main/content/apps/creating-github-apps/writing-code-for-a-github-app/building-ci-checks-with-a-github-app.md#_snippet_10

LANGUAGE: Ruby
CODE:

```
def authenticate_app
  payload = {
      # The time that this JWT was issued, _i.e._ now.
      iat: Time.now.to_i,

      # JWT expiration time (10 minute maximum)
      exp: Time.now.to_i + (10 * 60),

      # Your GitHub App's identifier number
      iss: APP_IDENTIFIER
  }

  # Cryptographically sign the JWT.
  jwt = JWT.encode(payload, PRIVATE_KEY, 'RS256')

  # Create the Octokit client, using the JWT as the auth token.
  @app_client ||= Octokit::Client.new(bearer_token: jwt)
end
```

---

TITLE: Add SSH Key to GitHub Account using GitHub CLI
DESCRIPTION: This section explains how to add an SSH public key to your GitHub account using the GitHub CLI. It requires prior authentication with `gh auth login` and demonstrates the use of the `gh ssh-key add` subcommand to specify the public key file, key type, and an optional title.
SOURCE: https://github.com/github/docs/blob/main/content/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account.md#_snippet_1

LANGUAGE: Shell
CODE:

```
gh ssh-key add KEY-FILE --type {authentication|signing}

To include a title for the new key, use the `-t` or `--title` flag:
gh ssh-key add KEY-FILE --title "personal laptop"

Example for a signing key generated with default path:
gh ssh-key add ~/.ssh/id_ed25519.pub --type signing
```

---

TITLE: AWS IAM Trust Policy Condition for Specific GitHub Environment
DESCRIPTION: This JSON snippet illustrates an AWS IAM trust policy condition. It employs `StringEquals` to verify the `sub` field of the OIDC token, restricting role assumption to GitHub Actions workflows deployed to the `prod` environment within `octo-org/octo-repo`. This is crucial for securing deployments to sensitive environments.
SOURCE: https://github.com/github/docs/blob/main/content/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services.md#_snippet_1

LANGUAGE: json
CODE:

```
"Condition": {
  "StringEquals": {
    "{% ifversion ghes %}HOSTNAME/_services/token{% else %}token.actions.githubusercontent.com{% endif %}:aud": "sts.amazonaws.com",
    "{% ifversion ghes %}HOSTNAME/_services/token{% else %}token.actions.githubusercontent.com{% endif %}:sub": "repo:octo-org/octo-repo:environment:prod"
  }
}
```

---

TITLE: GitHub Actions Workflow to Summarize New Issues
DESCRIPTION: This GitHub Actions workflow automatically summarizes newly opened issues using a pre-defined GitHub Models prompt. It checks out the repository, installs the `gh-models` CLI extension, extracts the issue body, runs the summarization prompt, and then adds the generated summary as a comment to the issue. It requires `issues: write`, `contents: read`, and `models: read` permissions.
SOURCE: https://github.com/github/docs/blob/main/content/github-models/github-models-at-scale/use-models-at-scale.md#_snippet_1

LANGUAGE: YAML
CODE:

```
name: Summarize New Issue

on:
  issues:
    types: [opened]

permissions:
  issues: write
  contents: read
  models: read

jobs:
  summarize_issue:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: {% data reusables.actions.action-checkout %}

      - name: Install gh-models extension
        run: gh extension install https://github.com/github/gh-models
        env:
          GH_TOKEN: ${% raw %}{{ github.token }}{% endraw %}

      - name: Create issue body file
        run: |
          cat > issue_body.txt << 'EOT'
          ${% raw %}{{ github.event.issue.body }}{% endraw %}
          EOT

      - name: Summarize new issue
        run: |
          cat issue_body.txt | gh models run --file summarize.prompt.yml > summary.txt
        env:
          GH_TOKEN: ${% raw %}{{ github.token }}{% endraw %}

      - name: Update issue with summary
        run: |
          SUMMARY=$(cat summary.txt)
          gh issue comment ${% raw %}{{ github.event.issue.number }}{% endraw %} --body "### Issue Summary
          ${SUMMARY}"
        env:
          GH_TOKEN: ${% raw %}{{ github.token }}{% endraw %}
```

---

TITLE: Placeholder for Octokit.rb Personal Access Token Configuration
DESCRIPTION: This snippet indicates the location where a Personal Access Token (PAT) would be configured for the Octokit.rb client to authenticate with the GitHub API. It includes a crucial warning against hardcoding sensitive credentials directly in application code.
SOURCE: https://github.com/github/docs/blob/main/content/rest/guides/building-a-ci-server.md#_snippet_2

LANGUAGE: Ruby
CODE:

```
# !!! DO NOT EVER USE HARD-CODED VALUES IN A REAL APP !!!
```

---

TITLE: GitHub Actions Step Uses Property for Actions
DESCRIPTION: The `uses` property specifies an action to run as part of a step. Actions are reusable units of code, and can be from the same repository, a public repository, or a published Docker container image. It is strongly recommended to specify a version for stability and security.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/workflow-syntax-for-github-actions.md#_snippet_29

LANGUAGE: APIDOC
CODE:

```
jobs.<job_id>.steps[*].uses:
  type: string (action reference)
  description: Selects an action to run as part of a step in your job. Actions are reusable units of code.
  notes:
    - Strongly recommended to include the version (Git ref, SHA, or Docker tag) for stability and security.
    - Some actions require inputs via the 'with' keyword.
    - Docker container actions require the job to run in a Linux environment.
```

---

TITLE: Implement GitHub Action Logic in JavaScript
DESCRIPTION: This JavaScript code defines the core functionality of the GitHub Action. It uses the `@actions/core` toolkit to retrieve an input variable ('who-to-greet'), logs a greeting message, sets the current time as an output variable, and accesses the GitHub context to log the webhook event payload. Error handling is included using `core.setFailed`.
SOURCE: https://github.com/github/docs/blob/main/content/actions/sharing-automations/creating-actions/creating-a-javascript-action.md#_snippet_5

LANGUAGE: javascript
CODE:

```
const core = require('@actions/core');
const github = require('@actions/github');

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
```

---

TITLE: GITHUB_REPOSITORY Environment Variable
DESCRIPTION: Provides the owner and repository name of the current GitHub repository.
SOURCE: https://github.com/github/docs/blob/main/content/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables.md#_snippet_10

LANGUAGE: APIDOC
CODE:

```
GITHUB_REPOSITORY: string
  description: The owner and repository name.
  example: octocat/Hello-World
```

---

TITLE: Push local changes to remote Git repository
DESCRIPTION: This command pushes the committed changes from the current local branch to the `origin` remote repository, setting the upstream branch to `HEAD` (the current branch).
SOURCE: https://github.com/github/docs/blob/main/content/repositories/creating-and-managing-repositories/quickstart-for-repositories.md#_snippet_4

LANGUAGE: shell
CODE:

```
git push --set-upstream origin HEAD
```

---

TITLE: Generate SBOM Attestation for Binaries in GitHub Actions
DESCRIPTION: Include this step after your binary build step to generate a signed SBOM attestation. The `subject-path` parameter should point to the binary, and `sbom-path` to the generated SBOM file.
SOURCE: https://github.com/github/docs/blob/main/content/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds.md#_snippet_5

LANGUAGE: YAML
CODE:

```
- name: Generate SBOM attestation
  uses: actions/attest-sbom@v1
  with:
    subject-path: 'PATH/TO/ARTIFACT'
    sbom-path: 'PATH/TO/SBOM'
```

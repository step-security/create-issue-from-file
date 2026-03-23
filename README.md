[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# Create Issue From File

A GitHub action to create an issue using content from a file.

This is designed to be used in conjunction with other actions that output to a file.
Especially if that output can be formatted
as [GitHub flavoured Markdown](https://docs.github.com/en/github/writing-on-github/basic-writing-and-formatting-syntax).
This action will create an issue if a file exists at a specified path.
The content of the issue will be taken from the file as-is.
If the file does not exist the action exits silently.

## Usage

```yml
  - name: Create Issue From File
    uses: step-security/create-issue-from-file@v6
    with:
      title: An example issue
      content-filepath: ./example-content/output.md
      labels: |
        report
        automated issue
```

### Action inputs

| Name               | Description                                                                                                                          | Default            |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| `token`            | `GITHUB_TOKEN` or a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) | `GITHUB_TOKEN`     |
| `repository`       | The target GitHub repository                                                                                                         | Current repository |
| `issue-number`     | The issue number of an existing issue to update                                                                                      |                    |
| `title`            | (**required**) The title of the issue                                                                                                |                    |
| `content-filepath` | The file path to the issue content                                                                                                   |                    |
| `labels`           | A comma or newline-separated list of labels                                                                                          |                    |
| `assignees`        | A comma or newline-separated list of assignees (GitHub usernames)                                                                    |                    |

### Outputs

- `issue-number` - The number of the created issue

## License

MIT License - see the [LICENSE](LICENSE) file for details

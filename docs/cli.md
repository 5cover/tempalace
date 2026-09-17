# CLI reference

## Synopsis

```txt
tp [id] [template-inputs] [options]
tp test [id] [options]
```

`tp` with no ID opens the interactive selector. `tp <id>` invokes that registry entry. The optional long executable name is `tempalace`.

An input-less template is selected and run without an input prompt. Directly invoke one with `tp <id>`; providing `+` arguments, `--input`, `--input-json`, or `--input-yaml` for it is an error.

## Global options

| Option                  | Meaning                                                 |
| ----------------------- | ------------------------------------------------------- |
| `-r, --registry <path>` | Use this registry instead of local discovery.           |
| `--debug`               | Show full exception stacks.                             |
| `--non-interactive`     | Never prompt. Useful as an explicit scripting contract. |
| `--help`                | Show command help.                                      |
| `--version`             | Show version.                                           |

## Template input

| Form                            | Meaning                             |
| ------------------------------- | ----------------------------------- |
| `+name Ada`                     | Pass the string `"Ada"` to `name`.  |
| `+config:json '{"a":1}'`        | Parse only `config` as JSON.        |
| `+config:yaml 'a: 1'`           | Parse only `config` as YAML.        |
| `--input 'Ada'`                 | Pass `"Ada"` directly as a string. |
| `--input-json '42'`             | Parse any whole input as JSON.      |
| `--input-yaml 'name: Ada'`      | Parse any whole input as YAML.      |
| `--input-json -`                | Read any JSON value from stdin.     |
| `--input-yaml -`                | Read any YAML value from stdin.     |

`--input` and `+` values are strings and are never coerced. A numeric Zod schema therefore requires explicit JSON or YAML unless the template author accepts and transforms a string. Use only one whole-input option. `+` arguments may combine with an object supplied by JSON or YAML, but cannot combine with a primitive whole input.

## Output options

| Option                | Meaning                                         |
| --------------------- | ----------------------------------------------- |
| `--json`              | Serialize output as pretty JSON.                |
| `--yaml`              | Serialize output as YAML.                       |
| `-c, --clipboard`     | Copy serialized output to the system clipboard. |
| `-o, --output <path>` | Write serialized output to a file.              |

Without `--json` or `--yaml`, strings print unchanged and other values print as indented JSON. Without `-c` or `-o`, output goes to stdout. `-c` and `-o` can be used together.

## Template test command

```sh
tp test
tp test greet
tp -r path/to/templates.ts test greet
```

It runs test cases declared with a template. A failing case has a non-zero exit status and reports its case index.

## Examples

```sh
tp greet +name Ada
tp summarize +text Ada --json
tp deploy +config:json '{"enabled":true}' -o deploy-result.json
printf '{"name":"Ada"}' | tp greet --input-json -
tp uppercase --input Ada
tp square --input-json 42
```

Registry discovery checks only the current directory in this order: `templates.ts`, `templates.mts`, `templates.cts`, `templates.js`, `templates.mjs`, `templates.cjs`.

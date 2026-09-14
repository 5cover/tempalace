# CLI reference

## Synopsis

```txt
tp [id] [template-inputs] [options]
tp test [id] [options]
```

`tp` with no ID opens the interactive selector. `tp <id>` invokes that registry entry. The optional long executable name is `tempalace`.

## Global options

| Option | Meaning |
| --- | --- |
| `-r, --registry <path>` | Use this registry instead of local discovery. |
| `--debug` | Show full exception stacks. |
| `--non-interactive` | Never prompt. Useful as an explicit scripting contract. |
| `--help` | Show command help. |
| `--version` | Show version. |

## Template input

| Form | Meaning |
| --- | --- |
| `+name Ada` | Pass the string `"Ada"` to `name`. |
| `+config:json '{"a":1}'` | Parse only `config` as JSON. |
| `+config:yaml 'a: 1'` | Parse only `config` as YAML. |
| `--input-json '{"name":"Ada"}'` | Parse a whole object input as JSON. |
| `--input-yaml 'name: Ada'` | Parse a whole object input as YAML. |
| `--input-json -` | Read a JSON object from stdin. |
| `--input-yaml -` | Read a YAML object from stdin. |

Scalar values are never coerced. A numeric Zod schema therefore requires explicit JSON or YAML unless the template author accepts and transforms a string.

## Output options

| Option | Meaning |
| --- | --- |
| `--json` | Serialize output as pretty JSON. |
| `--yaml` | Serialize output as YAML. |
| `-c, --clipboard` | Copy serialized output to the system clipboard. |
| `-o, --output <path>` | Write serialized output to a file. |

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
```

Registry discovery checks only the current directory in this order: `templates.ts`, `templates.mts`, `templates.cts`, `templates.js`, `templates.mjs`, `templates.cjs`.

# tempalace

Tempalace is an interactive CLI for discovering and invoking reusable, Zod-described TypeScript and JavaScript functions.

```sh
tp
tp greet +name Ada
tp uppercase --input Ada
tp square --input-json 42
```

Install the CLI with its core package and Zod:

```sh
pnpm add -D tempalace @tempalace/core zod
```

See the [Tempalace README](https://github.com/5cover/tempalace#readme) for the quick start, input rules, command reference, API, and security model.

## License

MIT

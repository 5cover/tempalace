import assert from "node:assert/strict"
import test from "node:test"
import { z } from "zod"
import { InvalidRegistryError, runTemplateTests, template, validateRegistry } from "../src/index.js"

test("validates a keyed template registry", () => {
  const currentTemplate = template({
    name: "Echo",
    input: z.string(),
    output: z.string(),
    run: (value) => value,
  })
  assert.deepEqual(Object.keys(validateRegistry({ echo: currentTemplate })), ["echo"])
})

test("rejects invalid registry entries", () => {
  assert.throws(() => validateRegistry({ bad: {} }), InvalidRegistryError)
})

test("runs declared template test cases", async () => {
  const currentTemplate = template({
    name: "Greet",
    input: z.object({ name: z.string() }),
    output: z.string(),
    run: ({ name }) => `Hello ${name}`,
    tests: [[{ name: "Ada" }, "Hello Ada"], [{ name: "Lin" }, "Hello Lin"]],
  })
  const result = await runTemplateTests(currentTemplate)
  assert.deepEqual(result, { passed: 2, failures: [] })
})

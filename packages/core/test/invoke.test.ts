import assert from "node:assert/strict"
import test from "node:test"
import { z } from "zod"
import {
  InputValidationError,
  OutputValidationError,
  TemplateExecutionError,
  invoke,
  template,
} from "../src/index.js"

test("invokes a typed synchronous template", async () => {
  const greet = template({
    name: "Greet",
    input: z.object({ name: z.string() }),
    output: z.string(),
    run: ({ name }) => `Hello ${name}`,
  })

  assert.equal(await invoke(greet, { name: "Ada" }), "Hello Ada")
})

test("normalizes asynchronous template execution", async () => {
  const delayed = template({
    name: "Delayed",
    input: z.string(),
    output: z.number(),
    run: async (value) => value.length,
  })

  assert.equal(await invoke(delayed, "Ada"), 3)
})

test("invokes an input-less template without prompting for or validating input", async () => {
  const version = template({
    name: "Version",
    output: z.string(),
    run: () => "1.0.0",
    tests: [[undefined, "1.0.0"]],
  })

  assert.equal(await invoke(version), "1.0.0")
})

test("reports input validation failures", async () => {
  const currentTemplate = template({
    name: "String",
    input: z.string(),
    output: z.string(),
    run: (value) => value,
  })

  await assert.rejects(invoke(currentTemplate, 42), InputValidationError)
})

test("wraps template exceptions", async () => {
  const currentTemplate = template({
    name: "Explodes",
    input: z.string(),
    output: z.string(),
    run: () => {
      throw new Error("Nope")
    },
  })

  await assert.rejects(invoke(currentTemplate, "x"), TemplateExecutionError)
})

test("validates output unless explicitly disabled", async () => {
  const currentTemplate = template({
    name: "Bad output",
    input: z.string(),
    output: z.string().min(10),
    run: () => "invalid",
  })

  await assert.rejects(invoke(currentTemplate, "x"), OutputValidationError)
  assert.equal(await invoke(currentTemplate, "x", { validateOutput: false }), "invalid")
})

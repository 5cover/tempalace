import assert from "node:assert/strict"
import test from "node:test"
import { InputValidationError } from "@tempalace/core"
import { parseTemplateArguments } from "../src/input.js"
import { serializeOutput } from "../src/serialization.js"

test("keeps scalar + arguments as strings", () => {
  const parsed = parseTemplateArguments(["greet", "+name", "Ada", "+count", "1"])
  assert.deepEqual(parsed, { argv: ["greet"], fields: { name: "Ada", count: "1" } })
})

test("parses explicitly structured field values", () => {
  const parsed = parseTemplateArguments(["deploy", "+config:json", '{"enabled":true}'])
  assert.deepEqual(parsed.fields, { config: { enabled: true } })
})

test("rejects malformed or repeated + arguments", () => {
  assert.throws(() => parseTemplateArguments(["greet", "+name"]), InputValidationError)
  assert.throws(() => parseTemplateArguments(["greet", "+name", "Ada", "+name", "Lin"]), InputValidationError)
})

test("serializes outputs predictably", () => {
  assert.equal(serializeOutput("hello", "auto"), "hello\n")
  assert.equal(serializeOutput({ ok: true }, "json"), '{\n  "ok": true\n}\n')
  assert.match(serializeOutput({ ok: true }, "yaml"), /ok: true/)
  assert.throws(() => serializeOutput(undefined, "auto"))
})

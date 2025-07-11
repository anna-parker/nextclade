/* eslint-disable unicorn/prefer-module,@typescript-eslint/no-var-requires */
/**
 * Generate Typescript types from JSON schema
 */
const yaml = require('js-yaml')
const { Command } = require('commander')
const { compile } = require('json-schema-to-typescript')
const fs = require('fs-extra')
const path = require('path')
const prettier = require('prettier')

async function main() {
  const args = new Command()
    .description('Generate Typescript types from JSON schema')
    .requiredOption('-i, --input <input.schema.json|yml>', 'Input JSON schema')
    .requiredOption('-o, --output <output.d.ts>', 'Output Typescript typings')
    .parse()
    .opts()

  const schema = yaml.load((await fs.readFile(args.input)).toString('utf8'))

  const thisScriptName = path.basename(__filename)

  // noinspection JSCheckFunctionSignatures
  let code = await compile(schema, 'schema', {
    cwd: path.dirname(args.input),
    bannerComment: `// *** AUTOGENERATED! DO NOT EDIT! All modifications to this file will be overwritten!\n// *** This file is autogenerated by script '${thisScriptName}' from JSON schema specified in '${args.input}'.`,
    format: true,
    additionalProperties: false,
    enableConstEnums: true,
    declareExternallyReferenced: true,
    strictIndexSignatures: false,
  })

  // Remove extra `null` in optional fields:
  // `foo?: null | string` --> `foo?: string`
  code = code.replaceAll(/\?: (\w+) \| null;/g, '?: $1')

  code = prettier.format(code, { parser: 'typescript' })

  await fs.writeFile(args.output, code)
}

main().catch(console.error)

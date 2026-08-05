/**
 * Tests for src/components/pai/InductGraphCanvas.tsx
 *
 * PR change under test: inside `defaultGraphState()`, the `nodes` and `edges`
 * array literals were incorrectly closed with `}` instead of `]`:
 *
 *   const nodes: GraphNode[] = [ ... ]   // was: [ ... }
 *   const edges: GraphEdge[] = [ ... ]   // was: [ ... }
 *
 * A `}` closing a `[` is a hard JavaScript/TypeScript syntax error (mismatched
 * bracket), so before this fix `defaultGraphState()` could not even be
 * parsed. This PR corrects both closing brackets.
 *
 * Why these tests operate on the source text instead of rendering the React
 * component: this file has a second, unrelated, pre-existing syntax error
 * inside `handleMouseDown` (a missing closing `}` for the arrow function
 * body passed to `useCallback`, elsewhere in the same file, untouched by this
 * PR's diff). That means the module as a whole still cannot be parsed/
 * imported, independent of whether the `nodes`/`edges` bracket fix in this
 * PR is correct. Per the PR scope, that unrelated bug is not something this
 * test suite should fix or paper over.
 *
 * To test *only* the change actually made by this PR, these tests extract
 * just the `nodes` and `edges` array literals from the source text (which
 * are self-contained, plain-data array literals with no external
 * references) using a bracket-aware scanner, and verify they are valid,
 * complete array literals with the expected shape. This directly exercises
 * the exact lines changed by the diff without being blocked by the separate,
 * out-of-scope syntax error elsewhere in the file.
 */

import fs from 'fs'
import path from 'path'

const SOURCE_PATH = path.join(__dirname, '../../components/pai/InductGraphCanvas.tsx')

/**
 * Scans forward from the `[` immediately following `declarationText` and
 * returns the full, verbatim array-literal source text up to and including
 * its matching closing `]`. Throws if the brackets are unbalanced/mismatched
 * (e.g. if the literal were closed with `}` instead of `]`, as it was before
 * this PR) or if the declaration cannot be found.
 */
function extractArrayLiteral(source: string, declarationText: string): string {
  const startOfDecl = source.indexOf(declarationText)
  if (startOfDecl === -1) {
    throw new Error(`Could not find declaration: ${declarationText}`)
  }
  const openIdx = startOfDecl + declarationText.length
  if (source[openIdx] !== '[') {
    throw new Error(
      `Expected '[' immediately after "${declarationText}" but found "${source[openIdx]}"`
    )
  }

  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' }
  const stack: string[] = []
  let i = openIdx

  while (i < source.length) {
    const c = source[i]

    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++
      continue
    }
    if (c === '/' && source[i + 1] === '*') {
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === '\'' || c === '"') {
      const quote = c
      i++
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') i++
        i++
      }
      i++
      continue
    }

    if (c === '{' || c === '[' || c === '(') {
      stack.push(c)
      i++
      continue
    }
    if (c === '}' || c === ']' || c === ')') {
      const top = stack.pop()
      if (!top) {
        throw new Error(`Unmatched closing "${c}" at offset ${i}`)
      }
      if (pairs[top] !== c) {
        throw new Error(
          `Mismatched bracket while scanning array literal starting at offset ${openIdx}: ` +
            `found "${c}" but expected "${pairs[top]}" to close "${top}"`
        )
      }
      i++
      if (stack.length === 0) {
        // c is guaranteed to be ']' here for a well-formed array literal,
        // since the outermost opener pushed onto the stack was '['.
        return source.slice(openIdx, i)
      }
      continue
    }
    i++
  }

  throw new Error('Reached end of file without closing the array literal')
}

let source: string

beforeAll(() => {
  source = fs.readFileSync(SOURCE_PATH, 'utf-8')
})

describe('extractArrayLiteral test helper', () => {
  it('extracts a well-formed array literal closed with "]"', () => {
    const text = extractArrayLiteral('const nodes = [1, 2, 3]', 'const nodes = ')
    expect(text).toBe('[1, 2, 3]')
  })

  it('throws when the array literal is incorrectly closed with "}" (the bug this PR fixes)', () => {
    expect(() => extractArrayLiteral('const nodes = [1, 2, 3}', 'const nodes = ')).toThrow(
      /Mismatched bracket/
    )
  })

  it('throws when the declaration cannot be found', () => {
    expect(() => extractArrayLiteral('const other = [1]', 'const nodes = ')).toThrow(
      /Could not find declaration/
    )
  })
})

describe('InductGraphCanvas.tsx source — defaultGraphState() array brackets (PR fix)', () => {
  it('the `nodes` array literal is well-formed and properly closed with "]"', () => {
    expect(() => extractArrayLiteral(source, 'const nodes: GraphNode[] = ')).not.toThrow()
  })

  it('the `edges` array literal is well-formed and properly closed with "]"', () => {
    expect(() => extractArrayLiteral(source, 'const edges: GraphEdge[] = ')).not.toThrow()
  })
})

describe('InductGraphCanvas.tsx source — nodes array contents', () => {
  let nodes: Array<{
    id: string
    label: string
    x: number
    y: number
    type: string
    color: string
    size: number
    metadata?: Record<string, unknown>
  }>

  beforeAll(() => {
    const text = extractArrayLiteral(source, 'const nodes: GraphNode[] = ')
    // The array literal is self-contained plain data (string/number/object
    // literals only, no external identifiers), so it can be evaluated
    // directly without needing a TypeScript/JSX transform.
    nodes = new Function(`return ${text}`)()
  })

  it('contains exactly the 22 nodes declared in the source (array was not truncated by the bracket bug)', () => {
    expect(Array.isArray(nodes)).toBe(true)
    expect(nodes).toHaveLength(22)
  })

  it('every node has the required GraphNode fields with correct types', () => {
    for (const node of nodes) {
      expect(typeof node.id).toBe('string')
      expect(typeof node.label).toBe('string')
      expect(typeof node.x).toBe('number')
      expect(typeof node.y).toBe('number')
      expect(typeof node.type).toBe('string')
      expect(typeof node.color).toBe('string')
      expect(typeof node.size).toBe('number')
    }
  })

  it('has unique node ids', () => {
    const ids = nodes.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the first node in the array (vai) has the expected shape', () => {
    expect(nodes[0]).toMatchObject({
      id: 'vai',
      label: 'VAI',
      x: 150,
      y: 200,
      type: 'endpoint',
    })
  })

  it('a node in the middle of the array (induct) has the expected shape', () => {
    const induct = nodes.find(n => n.id === 'induct')
    expect(induct).toMatchObject({
      label: 'INDUCT',
      x: 550,
      y: 600,
      type: 'endpoint',
      metadata: { layer: 'alpha', trust: 97 },
    })
  })

  it('the last node in the array (skill-tlsn) is present with the expected shape — proving the array was not cut short by the closing-bracket bug', () => {
    const last = nodes[nodes.length - 1]
    expect(last).toMatchObject({
      id: 'skill-tlsn',
      label: 'TLSN',
      x: 750,
      y: 200,
      type: 'skill',
      metadata: { verifiable: true },
    })
  })
})

describe('InductGraphCanvas.tsx source — edges array contents', () => {
  let edges: Array<{
    id: string
    source: string
    target: string
    type: string
    weight: number
  }>
  let nodeIds: Set<string>

  beforeAll(() => {
    const nodesText = extractArrayLiteral(source, 'const nodes: GraphNode[] = ')
    const nodes = new Function(`return ${nodesText}`)() as Array<{ id: string }>
    nodeIds = new Set(nodes.map(n => n.id))

    const edgesText = extractArrayLiteral(source, 'const edges: GraphEdge[] = ')
    edges = new Function(`return ${edgesText}`)()
  })

  it('contains exactly the 31 edges declared in the source (array was not truncated by the bracket bug)', () => {
    expect(Array.isArray(edges)).toBe(true)
    expect(edges).toHaveLength(31)
  })

  it('every edge has the required GraphEdge fields with correct types', () => {
    for (const edge of edges) {
      expect(typeof edge.id).toBe('string')
      expect(typeof edge.source).toBe('string')
      expect(typeof edge.target).toBe('string')
      expect(typeof edge.type).toBe('string')
      expect(typeof edge.weight).toBe('number')
    }
  })

  it('every edge references a source and target that exist among the declared nodes', () => {
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }
  })

  it('the first edge in the array (ppp -> vai) has the expected shape', () => {
    expect(edges[0]).toMatchObject({
      id: 'e1',
      source: 'ppp',
      target: 'vai',
      type: 'control',
      weight: 1,
    })
  })

  it('the last edge in the array (opencode -> skill-tlsnotary) is present with the expected shape — proving the array was not cut short by the closing-bracket bug', () => {
    const last = edges[edges.length - 1]
    expect(last).toMatchObject({
      id: 'e21',
      source: 'opencode',
      target: 'skill-tlsnotary',
      type: 'trust',
      weight: 1,
    })
  })
})
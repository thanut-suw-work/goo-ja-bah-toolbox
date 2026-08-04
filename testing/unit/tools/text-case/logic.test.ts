import { describe, it, expect } from 'vitest'
import { transformCase } from '@/tools/text-case/logic'

describe('transformCase', () => {
  it('lower', () => {
    expect(transformCase('AbC', 'lower')).toBe('abc')
  })
  it('upper', () => {
    expect(transformCase('AbC', 'upper')).toBe('ABC')
  })
  it('title', () => {
    expect(transformCase('hello world', 'title')).toBe('Hello World')
  })
  it('camel', () => {
    expect(transformCase('hello world', 'camel')).toBe('helloWorld')
  })
  it('snake', () => {
    expect(transformCase('Hello World', 'snake')).toBe('hello_world')
  })
})

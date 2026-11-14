describe('ambiente', () => {
  it('tem localStorage no jsdom', () => {
    localStorage.setItem('x', '1')
    expect(localStorage.getItem('x')).toBe('1')
  })
})

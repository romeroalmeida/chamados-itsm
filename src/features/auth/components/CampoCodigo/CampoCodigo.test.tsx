import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampoCodigo } from './CampoCodigo'

function Campo({ aoCompletar }: { aoCompletar: (c: string) => void }) {
  const [v, setV] = useState('')
  return (
    <>
      <label htmlFor="c">Código de acesso</label>
      <CampoCodigo id="c" valor={v} aoMudar={setV} aoCompletar={aoCompletar} erro={false} desativado={false} />
    </>
  )
}

describe('CampoCodigo', () => {
  it('colar "482 913" vira 482913 e completa uma vez só', async () => {
    const aoCompletar = vi.fn()
    render(<Campo aoCompletar={aoCompletar} />)
    const campo = screen.getByLabelText('Código de acesso')
    await userEvent.click(campo)
    await userEvent.paste('482 913')
    expect(campo).toHaveValue('482913')
    expect(aoCompletar).toHaveBeenCalledTimes(1)
    expect(aoCompletar).toHaveBeenCalledWith('482913')
  })
})

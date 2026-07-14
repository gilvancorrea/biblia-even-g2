import { paginate } from './paginate'
import { loadBibleText } from './sample'

const BODY_W = 576
const BODY_H = 240
const BODY_PAD = 4
const BODY_BORDER = 0
const INNER_W = BODY_W - 2 * (BODY_PAD + BODY_BORDER)
const INNER_H = BODY_H - 2 * (BODY_PAD + BODY_BORDER)

let pages: string[] = ['Carregando Bíblia Livre...']
let currentPage = 0

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main style="margin:auto;padding:24px;max-width:680px;box-sizing:border-box;">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h1 style="font-size:18px;font-weight:600;margin:0;">Bíblia Even</h1>
      <span id="pageCount" style="font-size:12px;color:#919191;"></span>
    </header>

    <pre id="mirror" style="background:#2E2E2E;border:1px solid #3E3E3E;border-radius:12px;padding:20px;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:#E5E5E5;margin:0;"></pre>

    <footer style="font-size:12px;color:#7B7B7B;text-align:center;margin-top:16px;">
      Clique na tela para avançar
    </footer>
  </main>
`

function render() {
  const mirror = document.getElementById('mirror')
  const count = document.getElementById('pageCount')

  if (mirror) mirror.textContent = pages[currentPage] ?? ''
  if (count) count.textContent = `${currentPage + 1} / ${pages.length}`
}

render()

async function start() {
  try {
    const text = await loadBibleText()
    pages = paginate(text, { width: INNER_W, height: INNER_H })
    currentPage = 0
    render()
  } catch (error) {
    pages = [
      `Bíblia Even

Erro ao carregar a Bíblia.

Verifique se o arquivo está em:
public/bible/blivre.json

Detalhe:
${String(error)}`,
    ]
    currentPage = 0
    render()
  }
}

document.body.addEventListener('click', () => {
  if (currentPage < pages.length - 1) {
    currentPage++
    render()
  }
})

start()
